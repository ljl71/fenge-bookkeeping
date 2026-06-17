export function normalizePhone(phone?: string): string {
  return String(phone ?? '').replace(/\D/g, '');
}

export function maskPhone(phone?: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return '未填写';
  if (normalized.length < 8) return normalized;
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export function displayPhone(phone?: string): string {
  return normalizePhone(phone) || '未填写';
}

export function phoneMatches(phone: string | undefined, keyword: string): boolean {
  const source = normalizePhone(phone);
  const target = normalizePhone(keyword);
  if (!target) return false;
  return source.includes(target) || source.slice(-4) === target;
}
