import type { AppSession, Role } from '../types';

const SESSION_KEY = 'fenge-bookkeeping-session';

export function saveSession(session: AppSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AppSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function makeSession(storeId: string, storeName: string, role: Role): AppSession {
  return {
    storeId,
    storeName,
    role,
    loginAt: new Date().toISOString()
  };
}
