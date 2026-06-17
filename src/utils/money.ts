export function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const next = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(next) ? next : 0;
}

export function roundMoney(value: string | number | undefined): number {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

export function sumMoney(values: Array<string | number | undefined>): number {
  const cents = values.reduce<number>((sum, value) => sum + Math.round((toNumber(value) + Number.EPSILON) * 100), 0);
  return cents / 100;
}

export function formatMoney(value: number | undefined): string {
  return `¥${roundMoney(value).toFixed(2).replace(/\.00$/, '')}`;
}

export function signedMoney(type: 'income' | 'expense', value: number): string {
  return `${type === 'income' ? '+' : '-'}${formatMoney(value)}`;
}
