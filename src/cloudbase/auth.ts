import type { AppSession, Role } from '../types';

const SESSION_KEY = 'fenge-bookkeeping-session';

export function saveSession(session: AppSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AppSession;
    if (!session.storeId || !session.storeName || !session.loginToken || !session.expiresAt) {
      clearSession();
      return null;
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function makeSession(storeId: string, storeName: string, role: Role, loginToken: string, expiresAt: string): AppSession {
  return {
    storeId,
    storeName,
    role,
    loginToken,
    loginAt: new Date().toISOString(),
    expiresAt
  };
}
