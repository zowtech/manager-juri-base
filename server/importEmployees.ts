// server/importEmployees.ts
import * as XLSX from "xlsx";
import crypto from "node:crypto";
import { db } from "./db";
import { employees as employeesTable } from "@shared/schema";
import { eq } from "drizzle-orm";

/** normaliza texto pra bater cabeçalhos diferentes */
function norm(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toDate(v: any): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = +m[1], mm = +m[2]; let yyyy = +m[3]; if (yyyy < 100) yyyy += 2000;
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toNumberBR(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d\.\-]/g, "");
  const n = Number(s);
  return isNaN(n) ? null : n;
}

const HEADER_MAP: Record<string, string> = {
  // empresa
  "empresa": "companyId", "id empresa": "companyId", "companyid": "companyId",

  // nome
  "nome": "name", "nome do funcionario": "name", "funcionario": "name", "nome do colaborador": "name",

  // matrícula / código
  "matricula": "registration", "matrícula": "registration",
  "codigo do funcionario": "registration", "codigo funcionario": "registration",
  "código do funcionário": "registration", "codigo": "registration", "registration": "registration",

  // rg / pis
  "rg": "rg", "numero do rg": "rg", "número do rg": "rg",
  "pis": "pis", "numero do pis": "pis", "número do pis": "pis",

  // datas
  "data admissao": "admissionDate", "data de admissao": "admissionDate",
  "admissao": "admissionDate", "admissão": "admissionDate",

  "data demissao": "terminationDate", "data de demissao": "terminationDate",
  "demissao": "terminationDate", "demissão": "terminationDate",

  // salário
  "salario": "salary", "salário": "salary",

  // cargo / departamento / centro de custo
  "cargo": "role", "descricao do cargo": "role", "descrição do cargo": "role",
  "departamento": "department", "depto": "department",
  "descricao do custo": "department", "descrição do custo": "department",
  "centro de custo": "costCenter", "centro custo": "costCenter",
};

function mapHeaders(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((h, idx) => {
    const key = HEADER_MAP[norm(h || "")];
    if (key) map[idx] = key;
  });
  return map;
}

type Result = {
  imported: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
};

async function upsertRow(obj: any, result: Result, rowIndex: number) {
  const companyId = obj.companyId ? Number(String(obj.companyId).replace(/\D/g, "")) || 1 : 1;
  const name = (obj.name ?? "").toString().trim();
  const registration = (obj.registration ?? "").toString().trim();

  const rg = obj.rg ? String(obj.rg).trim() : null;
  const pis = obj.pis ? String(obj.pis).trim() : null;

  const admissionDate = toDate(obj.admissionDate);
  const terminationDate = toDate(obj.terminationDate);
  const salary = toNumberBR(obj.salary);

  const role = obj.role ? String(obj.role).trim() : null;
  const department = obj.department ? String(obj.department).trim() : null;
  const costCenter = obj.costCenter ? String(obj.costCenter).trim() : null;

  if (!name) throw new Error("Nome é obrigatório");
  if (!registration) throw new Error("Matrícula/Código do Funcionário é obrigatório");

  const existing = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.registration, registration))
    .limit(1);

  if (existing.length > 0) {
    const current = existing[0];
    const patch: any = {
      companyId, name, rg, pis,
      admissionDate: admissionDate as any,
      terminationDate: terminationDate as any,
      salary: salary as any,
      role, department, costCenter,
    };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    await db.update(employeesTable).set(patch).where(eq(employeesTable.id, current.id));
    result.updated += 1;
  } else {
    await db.insert(employeesTable).values({
      id: crypto.randomUUID(),
      companyId, name, registration, rg, pis,
      admissionDate: admissionDate as any,
      terminationDate: terminationDate as any,
      salary: salary as any,
      role, department, costCenter,
    });
    result.imported += 1;
  }
}

/** Importa a partir de um Buffer (recomendado para produção) */
export async function importEmployeesFromBuffer(buffer: Buffer): Promise<Result> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  const result: Result = { imported: 0, updated: 0, errors: [] };

  if (!rows.length) {
    result.errors.push({ row: 0, error: "Planilha vazia" });
    return result;
  }

  const headerRow = rows[0].map((x) => String(x ?? "").trim());
  const headerMap = mapHeaders(headerRow);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }
    try {
      const obj: any = {};
      Object.entries(headerMap).forEach(([colIdxStr, key]) => {
        obj[key] = row[Number(colIdxStr)];
      });
      await upsertRow(obj, result, i + 1);
    } catch (e: any) {
      result.errors.push({ row: i + 1, error: e?.message || String(e) });
    }
  }

  return result;
}

/** Wrapper opcional caso você queira importar por caminho de arquivo */
export async function importEmployeesFromExcel(filePath: string): Promise<Result> {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  const result: Result = { imported: 0, updated: 0, errors: [] };

  if (!rows.length) {
    result.errors.push({ row: 0, error: "Planilha vazia" });
    return result;
  }

  const headerRow = rows[0].map((x) => String(x ?? "").trim());
  const headerMap = mapHeaders(headerRow);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) {
      continue;
    }
    try {
      const obj: any = {};
      Object.entries(headerMap).forEach(([colIdxStr, key]) => {
        obj[key] = row[Number(colIdxStr)];
      });
      await upsertRow(obj, result, i + 1);
    } catch (e: any) {
      result.errors.push({ row: i + 1, error: e?.message || String(e) });
    }
  }

  return result;
}
