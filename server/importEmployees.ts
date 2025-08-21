// server/importEmployees.ts
import * as XLSX from "xlsx";
import crypto from "node:crypto";
import { db, pool } from "./db";
import { employees as employeesTable } from "@shared/schema";
import { eq } from "drizzle-orm";

/* -------- Helpers -------- */

function parseBRDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;

  const s = String(v).trim();
  if (!s) return null;

  // Serial do Excel (número)
  if (!isNaN(Number(s)) && Number(s) > 25569) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return new Date(d.y, d.m - 1, d.d);
  }

  // ISO
  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso;

  // dd/mm/aaaa
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function getCell(o: any, keys: string[], def = ""): string {
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null) return String(o[k]).trim();
  }
  return def;
}

/* -------- Importação a partir de BUFFER -------- */

export async function importEmployeesFromBuffer(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" }); // <— sem readFile!
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { imported: 0, updated: 0, errors: ["Planilha vazia"] };

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const empresa = getCell(r, ["Empresa", "empresa"]);
      const nome = getCell(r, ["Nome", "nome"]);
      const matricula = getCell(r, ["Matrícula", "Matricula", "matricula", "registration"]);
      const rg = getCell(r, ["RG", "rg"]);
      const cargo = getCell(r, ["Cargo", "cargo"]);
      const departamento = getCell(r, ["Departamento", "departamento"]);
      const centroCusto = getCell(
        r,
        ["Centro de Custo", "Centro de custo", "centro de custo", "centroCusto"]
      );
      const admRaw = getCell(
        r,
        ["Data Admissão", "Data de Admissão", "Admissão", "admissao", "dataAdmissao"]
      );

      if (!nome || !matricula) {
        errors.push(`Linha ${i + 2}: nome e matrícula são obrigatórios.`);
        continue;
      }

      const admissionDate = parseBRDate(admRaw);

      // Já existe?
      const exists = await db
        .select({ id: employeesTable.id })
        .from(employeesTable)
        .where(eq(employeesTable.registration, matricula))
        .limit(1);

      if (exists.length) {
        await db
          .update(employeesTable)
          .set({
            companyId: empresa ? Number(empresa) || 1 : 1,
            name: nome,
            registration: matricula,
            rg: rg || null,
            role: cargo || null,
            department: departamento || null,
            costCenter: centroCusto || null,
            admissionDate: admissionDate as any,
          })
          .where(eq(employeesTable.id, exists[0].id));
        updated++;
      } else {
        await db.insert(employeesTable).values({
          id: crypto.randomUUID(),
          companyId: empresa ? Number(empresa) || 1 : 1,
          name: nome,
          registration: matricula,
          rg: rg || null,
          role: cargo || null,
          department: departamento || null,
          costCenter: centroCusto || null,
          admissionDate: admissionDate as any,
        });
        imported++;
      }
    } catch (e: any) {
      errors.push(`Linha ${i + 2}: ${e?.message || String(e)}`);
    }
  }

  return { imported, updated, errors };
}

/* -------- Vincular casos a funcionários (opcional) -------- */

export async function linkCasesToEmployees() {
  const sql = `
    WITH cand AS (
      SELECT c.id AS case_id, e.id AS emp_id
      FROM public.cases c
      JOIN public.employees e
        ON (
             LOWER(c.client_name) = LOWER(e.name)
             OR (c.description IS NOT NULL AND c.description ILIKE '%' || e.registration || '%')
           )
      WHERE c.employee_id IS NULL
    )
    UPDATE public.cases c
       SET employee_id = cand.emp_id
    FROM cand
    WHERE c.id = cand.case_id
    RETURNING c.id, c.employee_id;
  `;
  const { rows } = await pool.query(sql);
  return { linked: rows.length };
}
