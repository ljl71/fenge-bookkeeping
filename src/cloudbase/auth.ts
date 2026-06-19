import { roleText } from '../constants/defaults';
import type { AccountRole, AppSession, Role } from '../types';

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
    return normalizeSession(session);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function makeSession(input: {
  storeId: string;
  storeName: string;
  userId?: string;
  username?: string;
  displayName?: string;
  role?: AccountRole;
  legacyRole?: Role;
  loginToken: string;
  expiresAt: string;
  loginAt?: string;
  fallbackLogin?: boolean;
}): AppSession {
  return {
    storeId: input.storeId,
    storeName: input.storeName,
    userId: input.userId || `legacy-${input.storeId}-${input.legacyRole ?? 'owner'}`,
    username: input.username || input.legacyRole || 'owner',
    displayName: input.displayName || (input.legacyRole ? roleText[input.legacyRole] : '店主'),
    role: input.role ?? 'owner',
    legacyRole: input.legacyRole,
    loginToken: input.loginToken,
    loginAt: input.loginAt ?? new Date().toISOString(),
    expiresAt: input.expiresAt,
    fallbackLogin: input.fallbackLogin
  };
}

function normalizeSession(raw: AppSession | (Partial<AppSession> & { role?: AccountRole | Role })): AppSession {
  if (raw.role === 'owner' || raw.role === 'employee') {
    return makeSession({
      storeId: raw.storeId ?? '',
      storeName: raw.storeName ?? '',
      userId: raw.userId,
      username: raw.username,
      displayName: raw.displayName,
      role: raw.role,
      legacyRole: raw.legacyRole,
      loginToken: raw.loginToken ?? '',
      loginAt: raw.loginAt,
      expiresAt: raw.expiresAt ?? '',
      fallbackLogin: raw.fallbackLogin
    });
  }

  const legacyRole = isLegacyRole(raw.role) ? raw.role : 'unknown';
  return makeSession({
    storeId: raw.storeId ?? '',
    storeName: raw.storeName ?? '',
    userId: `legacy-${raw.storeId ?? 'store'}-${legacyRole}`,
    username: legacyRole,
    displayName: roleText[legacyRole],
    role: 'owner',
    legacyRole,
    loginToken: raw.loginToken ?? '',
    loginAt: raw.loginAt,
    expiresAt: raw.expiresAt ?? '',
    fallbackLogin: true
  });
}

function isLegacyRole(value: unknown): value is Role {
  return value === 'mom' || value === 'dad' || value === 'unknown';
}
