import type { StoreUser } from '../types';
import { nowIso } from '../utils/date';
import { addRecord, listCollection, updateRecord } from './dataSource';

export interface CreateEmployeeInput {
  storeId: string;
  username: string;
  displayName: string;
  pin: string;
  active: boolean;
}

export async function hashStoreUserPin(storeId: string, username: string, pin: string): Promise<string> {
  const source = `fenge-bookkeeping-user:${storeId.trim()}:${normalizeUsername(username)}:${pin}`;
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function listStoreUsers(storeId: string): Promise<StoreUser[]> {
  const rows = await listCollection<StoreUser>('storeUsers', storeId);
  return rows
    .filter((row) => !row.deletedAt)
    .sort((a, b) => Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName, 'zh-CN'));
}

export async function listActiveEmployees(storeId: string): Promise<StoreUser[]> {
  const rows = await listStoreUsers(storeId);
  return rows.filter((row) => row.role === 'employee' && row.active);
}

export async function createEmployee(input: CreateEmployeeInput): Promise<StoreUser> {
  const storeId = input.storeId.trim();
  const username = normalizeUsername(input.username);
  const displayName = input.displayName.trim();
  const pin = input.pin.trim();
  if (!storeId) throw new Error('缺少店铺 ID');
  if (!username) throw new Error('请填写登录账号');
  if (!displayName) throw new Error('请填写员工姓名');
  if (!pin) throw new Error('请填写初始 PIN');

  const users = await listStoreUsers(storeId);
  if (users.some((user) => normalizeUsername(user.username) === username)) {
    throw new Error('登录账号已存在，请换一个');
  }

  const now = nowIso();
  return addRecord<StoreUser>('storeUsers', {
    storeId,
    username,
    displayName,
    role: 'employee',
    pinHash: await hashStoreUserPin(storeId, username, pin),
    active: input.active,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });
}

export async function updateEmployee(user: StoreUser, patch: Pick<StoreUser, 'displayName' | 'active'>): Promise<void> {
  assertEmployee(user);
  if (!patch.displayName.trim()) throw new Error('请填写员工姓名');
  await updateRecord<StoreUser>(
    'storeUsers',
    requireUserId(user),
    {
      displayName: patch.displayName.trim(),
      active: patch.active,
      updatedAt: nowIso()
    },
    user.storeId
  );
}

export async function resetEmployeePin(user: StoreUser, newPin: string): Promise<void> {
  assertEmployee(user);
  const pin = newPin.trim();
  if (!pin) throw new Error('请填写新 PIN');
  await updateRecord<StoreUser>(
    'storeUsers',
    requireUserId(user),
    {
      pinHash: await hashStoreUserPin(user.storeId, user.username, pin),
      updatedAt: nowIso()
    },
    user.storeId
  );
}

export async function disableEmployee(user: StoreUser): Promise<void> {
  await setEmployeeActive(user, false);
}

export async function enableEmployee(user: StoreUser): Promise<void> {
  await setEmployeeActive(user, true);
}

export async function softDeleteEmployee(user: StoreUser): Promise<void> {
  assertEmployee(user);
  await updateRecord<StoreUser>(
    'storeUsers',
    requireUserId(user),
    {
      active: false,
      deletedAt: nowIso(),
      updatedAt: nowIso()
    },
    user.storeId
  );
}

async function setEmployeeActive(user: StoreUser, active: boolean): Promise<void> {
  assertEmployee(user);
  await updateRecord<StoreUser>(
    'storeUsers',
    requireUserId(user),
    {
      active,
      updatedAt: nowIso()
    },
    user.storeId
  );
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function assertEmployee(user: StoreUser) {
  if (user.role !== 'employee') throw new Error('这里只能管理员工账号');
}

function requireUserId(user: StoreUser) {
  if (!user._id) throw new Error('员工账号缺少 ID，无法操作');
  return user._id;
}

