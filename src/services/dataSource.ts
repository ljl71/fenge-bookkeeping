import type { CollectionName } from '../types';
import { isDemoMode } from '../cloudbase/app';
import { cloudAdd, cloudList, cloudUpdate } from '../cloudbase/db';
import { localDatabase } from './localDatabase';

const storeScopedCollections = new Set<CollectionName>([
  'storeUsers',
  'customers',
  'serviceCategories',
  'serviceItems',
  'expenseCategories',
  'paymentMethods',
  'transactions'
]);

function isStoreScoped(collection: CollectionName) {
  return storeScopedCollections.has(collection);
}

function readStoreId(record: unknown): string | undefined {
  return typeof record === 'object' && record !== null && 'storeId' in record
    ? String((record as { storeId?: unknown }).storeId ?? '')
    : undefined;
}

export async function listCollection<T>(collection: CollectionName, storeId: string): Promise<T[]> {
  if (isStoreScoped(collection) && !storeId) throw new Error('缺少店铺 ID，无法读取数据');
  if (isDemoMode) return localDatabase.list<T>(collection, storeId);
  return cloudList<T>(collection, { storeId });
}

export async function listCollectionWhere<T>(
  collection: CollectionName,
  storeId: string,
  where: Record<string, unknown>
): Promise<T[]> {
  if (isStoreScoped(collection) && !storeId) throw new Error('缺少店铺 ID，无法读取数据');
  if (isDemoMode) return localDatabase.list<T>(collection, storeId).filter((row) => matchesWhere(row, where));
  return cloudList<T>(collection, { ...where, storeId });
}

export async function addRecord<T extends { _id?: string }>(
  collection: CollectionName,
  record: Omit<T, '_id'>
): Promise<T> {
  if (isStoreScoped(collection) && !readStoreId(record)) throw new Error('缺少店铺 ID，无法新增数据');
  if (isDemoMode) return localDatabase.add<T>(collection, record);
  return cloudAdd<T>(collection, record);
}

export async function updateRecord<T extends { _id?: string; storeId?: string }>(
  collection: CollectionName,
  id: string,
  patch: Partial<T>,
  storeId?: string
): Promise<void> {
  if (isStoreScoped(collection)) {
    if (!storeId) throw new Error('缺少店铺 ID，无法修改数据');
    const patchStoreId = readStoreId(patch);
    if (patchStoreId && patchStoreId !== storeId) throw new Error('数据店铺不一致，已拒绝修改');
  }

  if (isDemoMode) {
    localDatabase.update<T>(collection, id, patch, storeId);
    return;
  }
  await cloudUpdate<T>(collection, id, patch, storeId);
}

function matchesWhere(row: unknown, where: Record<string, unknown>) {
  if (typeof row !== 'object' || row === null) return false;
  return Object.entries(where).every(([key, value]) => (row as Record<string, unknown>)[key] === value);
}
