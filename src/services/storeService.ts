import { isDemoMode } from '../cloudbase/app';
import { clearSession, makeSession, readSession, saveSession } from '../cloudbase/auth';
import type { AppSession, Role } from '../types';
import { pinMatches } from '../utils/hash';
import { findStore } from './dataSource';

export function getSavedSession(): AppSession | null {
  return readSession();
}

export async function loginStore(storeId: string, pin: string, role: Role): Promise<AppSession> {
  const normalizedStoreId = storeId.trim();
  if (!normalizedStoreId) throw new Error('请填写店铺 ID');
  if (!pin.trim()) throw new Error('请填写店铺 PIN');

  const store = await findStore(normalizedStoreId);
  if (!store || !store.active) {
    throw new Error(isDemoMode ? '未找到店铺。本地演示默认店铺 ID 是 fenge' : '未找到店铺，请先在 CloudBase 创建店铺账号');
  }

  const ok = await pinMatches(pin, store.pinHash);
  if (!ok) throw new Error(isDemoMode ? 'PIN 不正确。本地演示默认 PIN 是 123456' : 'PIN 不正确，请重新输入');

  const session = makeSession(store.storeId, store.name, role);
  saveSession(session);
  return session;
}

export function logoutStore() {
  clearSession();
}
