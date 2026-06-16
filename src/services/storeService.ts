import { isDemoMode } from '../cloudbase/app';
import { clearSession, makeSession, readSession, saveSession } from '../cloudbase/auth';
import { callLoginStoreFunction } from '../cloudbase/functions';
import { DEMO_PIN } from '../constants/defaults';
import type { AppSession, Role } from '../types';
import { localDatabase } from './localDatabase';

export function getSavedSession(): AppSession | null {
  return readSession();
}

export async function loginStore(storeId: string, pin: string, role: Role): Promise<AppSession> {
  const normalizedStoreId = storeId.trim();
  if (!normalizedStoreId) throw new Error('请填写店铺 ID');
  if (!pin.trim()) throw new Error('请填写店铺 PIN');

  if (isDemoMode) {
    const store = localDatabase.getStore(normalizedStoreId);
    if (!store || !store.active) {
      throw new Error('未找到店铺。本地演示默认店铺 ID 是 fenge');
    }

    const ok = pin === DEMO_PIN;
    if (!ok) throw new Error(`PIN 不正确。本地演示默认 PIN 是 ${DEMO_PIN}`);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const session = makeSession(store.storeId, store.name, role, `demo-${store.storeId}-${Date.now()}`, expiresAt);
    saveSession(session);
    return session;
  }

  const result = await callLoginStoreFunction(normalizedStoreId, pin);
  if (!result.success) {
    throw new Error(result.message || '登录失败，请检查店铺 ID 和 PIN');
  }

  const token = result.loginToken || result.sessionToken;
  if (!result.storeId || !result.storeName || !token || !result.expiresAt) {
    throw new Error('登录云函数返回数据不完整，请检查 loginStore 云函数部署');
  }

  const session = makeSession(result.storeId, result.storeName, role, token, result.expiresAt);
  saveSession(session);
  return session;
}

export function logoutStore() {
  clearSession();
}
