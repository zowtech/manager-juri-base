// server/utils/normalize.ts
export function parseBRDate(input?: string | null) {
  if (!input) return null;
  // aceita "dd/mm/aaaa" ou ISO
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split("/");
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function parseBRMoney(input?: string | number | null) {
  if (input == null || input === "") return null;
  if (typeof input === "number") return input;
  // troca ponto por nada e vírgula por ponto (ex.: 5.000,50 -> 5000.50)
  const normalized = input.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return isNaN(n) ? null : n;
}
