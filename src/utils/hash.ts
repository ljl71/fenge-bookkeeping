export function hashPinSyncFallback(pin: string): string {
  let hash = 0;
  const source = `fenge-bookkeeping:${pin}`;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

export async function hashPin(pin: string): Promise<string> {
  if (!window.crypto?.subtle) return hashPinSyncFallback(pin);
  const bytes = new TextEncoder().encode(`fenge-bookkeeping:${pin}`);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function pinMatches(pin: string, pinHash: string): Promise<boolean> {
  const next = await hashPin(pin);
  return next === pinHash || hashPinSyncFallback(pin) === pinHash;
}
