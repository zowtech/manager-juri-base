// client/src/lib/bucket.ts
export type Bucket = 'novo' | 'pendente' | 'atrasado' | 'concluido';

export function computeBucket(input: {
  status?: string | null;
  dueDate?: string | Date | null;
}): Bucket {
  const status = (input.status || '').toLowerCase();
  if (status === 'concluido') return 'concluido';

  const due = input.dueDate ? new Date(input.dueDate) : null;
  const now = new Date();
  if (due && due < now) return 'atrasado';

  if (status === 'novo') return 'novo';
  return 'pendente';
}

export function normalizeCases<T extends { status?: string; dueDate?: any; bucket?: Bucket }>(
  list: T[],
): (T & { bucket: Bucket })[] {
  return (list || []).map((c) => ({
    ...c,
    bucket: c.bucket ?? computeBucket(c),
  }));
}

export function countByBucket(list: { bucket: Bucket }[]) {
  return list.reduce(
    (acc, c) => {
      acc.total += 1;
      acc[c.bucket] += 1;
      return acc;
    },
    { total: 0, novo: 0, pendente: 0, atrasado: 0, concluido: 0 },
  );
}
