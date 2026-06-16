export function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const next = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(next) ? next : 0;
}

export function formatMoney(value: number | undefined): string {
  return `¥${(value ?? 0).toFixed(2).replace(/\.00$/, '')}`;
}

export function signedMoney(type: 'income' | 'expense', value: number): string {
  return `${type === 'income' ? '+' : '-'}${formatMoney(value)}`;
}
