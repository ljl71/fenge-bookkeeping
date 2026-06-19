import { isDemoMode } from '../cloudbase/app';
import { clearSession, makeSession, readSession, saveSession } from '../cloudbase/auth';
import { callLoginStoreFunction } from '../cloudbase/functions';
import { DEMO_PIN } from '../constants/defaults';
import type { AppSession, Role, StoreUser } from '../types';
import { localDatabase } from './localDatabase';
import { hashStoreUserPin } from './storeUserService';

export function getSavedSession(): AppSession | null {
  return readSession();
}

export async function loginStore(storeId: string, username: string, pin: string): Promise<AppSession> {
  const normalizedStoreId = storeId.trim();
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedStoreId) throw new Error('请填写店铺 ID');
  if (!pin.trim()) throw new Error('请填写 PIN');

  if (isDemoMode) {
    const store = localDatabase.getStore(normalizedStoreId);
    if (!store || !store.active) {
      throw new Error('未找到店铺。本地演示默认店铺 ID 是 fenge');
    }

    const users = localDatabase.list<StoreUser>('storeUsers', normalizedStoreId).filter((user) => !user.deletedAt);
    const user = normalizedUsername
      ? users.find((row) => row.username.toLowerCase() === normalizedUsername && row.active)
      : undefined;

    if (user) {
      const ok = (await hashStoreUserPin(normalizedStoreId, user.username, pin)) === user.pinHash;
      if (!ok) throw new Error(`PIN 不正确。本地演示默认 PIN 是 ${DEMO_PIN}`);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const session = makeSession({
        storeId: store.storeId,
        storeName: store.name,
        userId: user._id ?? `${store.storeId}-${user.username}`,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        legacyRole: user.legacyRole,
        loginToken: `demo-${store.storeId}-${user.username}-${Date.now()}`,
        expiresAt
      });
      saveSession(session);
      return session;
    }

    if (users.length) {
      throw new Error('账号不存在或已停用');
    }
    if (normalizedUsername && !['boss', 'owner', 'mom', 'dad'].includes(normalizedUsername)) {
      throw new Error('账号不存在或已停用');
    }
    const ok = pin === DEMO_PIN;
    if (!ok) throw new Error(`PIN 不正确。本地演示默认 PIN 是 ${DEMO_PIN}`);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const legacyRole = legacyRoleFromUsername(normalizedUsername);
    const session = makeSession({
      storeId: store.storeId,
      storeName: store.name,
      userId: `legacy-${store.storeId}-${legacyRole}`,
      username: normalizedUsername || 'owner',
      displayName: legacyRole === 'unknown' ? '店主' : undefined,
      role: 'owner',
      legacyRole,
      loginToken: `demo-${store.storeId}-${Date.now()}`,
      expiresAt,
      fallbackLogin: true
    });
    saveSession(session);
    return session;
  }

  const result = await callLoginStoreFunction(normalizedStoreId, normalizedUsername, pin);
  if (!result.success) {
    throw new Error(result.message || '登录失败，请检查店铺 ID、账号和 PIN');
  }

  const token = result.loginToken || result.sessionToken;
  if (!result.storeId || !result.storeName || !token || !result.expiresAt) {
    throw new Error('登录云函数返回数据不完整，请检查 loginStore 云函数部署');
  }

  const role = result.role ?? 'owner';
  const session = makeSession({
    storeId: result.storeId,
    storeName: result.storeName,
    userId: result.userId,
    username: result.username || normalizedUsername || 'owner',
    displayName: result.displayName,
    role,
    legacyRole: result.legacyRole,
    loginToken: token,
    expiresAt: result.expiresAt,
    fallbackLogin: result.fallbackLogin
  });
  saveSession(session);
  return session;
}

export function logoutStore() {
  clearSession();
}

function legacyRoleFromUsername(username: string): Role {
  if (username === 'mom') return 'mom';
  if (username === 'dad') return 'dad';
  return 'unknown';
}
