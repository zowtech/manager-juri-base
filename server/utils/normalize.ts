// server/utils/normalize.ts
export function parseBRDate(s?: string | null): string | null {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s).trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`; // YYYY-MM-DD
}

export function parseBRMoney(s?: string | number | null): number | null {
  if (s === null || s === undefined || s === "") return null;
  const str = String(s).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}
