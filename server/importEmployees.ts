// server/importEmployees.ts
import * as XLSX from "xlsx";
import crypto from "node:crypto";
import { db } from "./db";
import { employees as employeesTable } from "@shared/schema";
import { eq } from "drizzle-orm";

/** Normaliza nomes de colunas (minúsculas, sem acentos e sem espaços extras) */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tira acentos
    .replace(/\s+/g, " ")
    .trim();
}

/** Converte texto/Date em Date (aceita dd/mm/aaaa, ISO, e Date) */
function toDate(v: any): Date | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;

  const s = String(v).trim();
  if (!s) return null;

  // dd/mm/aaaa
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    let yyyy = Number(m[3]);
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  // tenta ISO
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Converte "R$ 1.234,56" ou "1234,56" para number */
function toNumberBR(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d\.\-]/g, "");
  const n = Number(s);
  return isNaN(n) ? null : n;
}

/**
 * Mapeia cabeçalhos variados (com/sem acento) para nomes canônicos.
 * Aceita seus cabeçalhos do EXF1.xlsx e vários outros comuns.
 */
const HEADER_MAP: Record<string, string> = {
  // empresa
  "empresa": "companyId",
  "id empresa": "companyId",
  "companyid": "companyId",

  // nome
  "nome": "name",
  "nome do funcionario": "name",
  "funcionario": "name",
  "nome do colaborador": "name",

  // matrícula / código
  "matricula": "registration",
  "matrícula": "registration",
  "codigo do funcionario": "registration",
  "codigo funcionario": "registration",
  "código do funcionário": "registration",
  "codigo": "registration",
  "registration": "registration",

  // rg
  "rg": "rg",
  "numero do rg": "rg",
  "número do rg": "rg",

  // pis
  "pis": "pis",
  "numero do pis": "pis",
  "número do pis": "pis",

  // datas
  "data admissao": "admissionDate",
  "data de admissao": "admissionDate",
  "admissao": "admissionDate",
  "admissão": "admissionDate",

  "data demissao": "terminationDate",
  "data de demissao": "terminationDate",
  "demissao": "terminationDate",
  "demissão": "terminationDate",

  // salário
  "salario": "salary",
  "salário": "salary",

  // cargo / departamento
  "cargo": "role",
  "descricao do cargo": "role",
  "descrição do cargo": "role",

  "departamento": "department",
  "depto": "department",
  "descricao do custo": "department",
  "descrição do custo": "department",

  // centro de custo
  "centro de custo": "costCenter",
  "centro custo": "costCenter",
};

/** Faz o mapeamento de colunas do Excel para o payload canônico */
function mapHeaders(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((h, idx) => {
    const key = HEADER_MAP[norm(String(h))];
    if (key) map[idx] = key;
  });
  return map;
}

type Result = {
  imported: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
};

/**
 * Importa planilha Excel de funcionários
 * - Insere se a matrícula não existir; atualiza se já existir
 * - Campos canônicos: companyId, name, registration, rg, pis, admissionDate, terminationDate, salary, role, department, costCenter
 */
export async function importEmployeesFromExcel(filePath: string): Promise<Result> {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  if (!rows.length) {
    return { imported: 0, updated: 0, errors: [{ row: 0, error: "Planilha vazia" }] };
  }

  const headerRow = rows[0].map((x) => String(x ?? "").trim());
  const headerMap = mapHeaders(headerRow);

  const result: Result = { imported: 0, updated: 0, errors: [] };

  // Processa linha a linha (começando da 2ª linha)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Ignora linhas totalmente vazias
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }

    try {
      const obj: any = {};
      Object.entries(headerMap).forEach(([colIdxStr, key]) => {
        const colIdx = Number(colIdxStr);
        obj[key] = row[colIdx];
      });

      // Normalizações/conversões
      const companyId = obj.companyId ? Number(String(obj.companyId).replace(/\D/g, "")) || 1 : 1;
      const name = (obj.name ?? "").toString().trim();
      const registration = (obj.registration ?? "").toString().trim();

      const rg = obj.rg ? String(obj.rg).trim() : null;
      const pis = obj.pis ? String(obj.pis).trim() : null;

      const admissionDate = toDate(obj.admissionDate);
      const terminationDate = toDate(obj.terminationDate);
      const salary = toNumberBR(obj.salary);

      const role = obj.role ? String(obj.role).trim() : null;

      // Alguns arquivos usam "Descrição do Custo" como "departamento" (ex.: "T.I")
      const department = obj.department ? String(obj.department).trim() : null;

      const costCenter = obj.costCenter ? String(obj.costCenter).trim() : null;

      // Regras mínimas
      if (!name) throw new Error("Nome é obrigatório");
      if (!registration) throw new Error("Matrícula/Código do Funcionário é obrigatório");

      // Upsert por matrícula
      const existing = await db
        .select()
        .from(employeesTable)
        .where(eq(employeesTable.registration, registration))
        .limit(1);

      if (existing.length > 0) {
        const current = existing[0];

        const patch: any = {
          companyId,
          name,
          rg,
          pis,
          admissionDate: admissionDate as any,
          terminationDate: terminationDate as any,
          salary: salary as any,
          role,
          department,
          costCenter,
        };

        // Remove campos undefined para não sobrescrever com null sem necessidade
        Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

        await db.update(employeesTable).set(patch).where(eq(employeesTable.id, current.id));
        result.updated += 1;
      } else {
        await db.insert(employeesTable).values({
          id: crypto.randomUUID(),
          companyId,
          name,
          registration,
          rg,
          pis,
          admissionDate: admissionDate as any,
          terminationDate: terminationDate as any,
          salary: salary as any,
          role,
          department,
          costCenter,
        });
        result.imported += 1;
      }
    } catch (e: any) {
      result.errors.push({
        row: i + 1, // 1-based para bater com o Excel
        error: e?.message || String(e),
      });
    }
  }

  return result;
}

/**
 * Vincula processos existentes aos funcionários pela matrícula (se quiser reaproveitar)
 */
export async function linkCasesToEmployees(): Promise<{ linked: number }> {
  // Aqui você pode manter sua implementação atual
  // (não mexi porque não era o foco desta correção)
  return { linked: 0 };
}
