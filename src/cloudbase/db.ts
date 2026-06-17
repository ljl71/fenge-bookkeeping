import type { CollectionName } from '../types';
import { ensureCloudbaseAuth, getCloudbaseApp, isDemoMode } from './app';

const DEFAULT_PAGE_SIZE = 100;
const MAX_SAFE_PAGES = 10000;

export async function getCloudbaseDb() {
  if (isDemoMode) return null;
  await ensureCloudbaseAuth();
  return getCloudbaseApp().database();
}

export async function cloudListPage<T>(
  collection: CollectionName,
  where: Record<string, unknown>,
  page: number,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const db = await getCloudbaseDb();
  if (!db) return [];
  const result = await db.collection(collection).where(where).skip(page * pageSize).limit(pageSize).get();
  return (result.data ?? []) as T[];
}

export async function cloudCount(collection: CollectionName, where: Record<string, unknown>): Promise<number> {
  const db = await getCloudbaseDb();
  if (!db) return 0;
  const result = await db.collection(collection).where(where).count();
  return Number(result.total ?? 0);
}

export async function cloudListAll<T>(
  collection: CollectionName,
  where: Record<string, unknown>,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  let page = 0;

  while (page < MAX_SAFE_PAGES) {
    const data = await cloudListPage<T>(collection, where, page, pageSize);
    rows.push(...data);
    if (data.length < pageSize) break;
    page += 1;
  }

  if (page >= MAX_SAFE_PAGES) {
    throw new Error(`读取 ${collection} 数据超过安全分页上限，请缩小查询范围后重试`);
  }

  return rows;
}

export const cloudList = cloudListAll;

export async function cloudAdd<T extends { _id?: string }>(
  collection: CollectionName,
  record: Omit<T, '_id'>
): Promise<T> {
  const db = await getCloudbaseDb();
  if (!db) throw new Error('CloudBase 未配置，无法写入云端数据');
  const { _id, ...payload } = record as T;
  const result = await db.collection(collection).add(payload);
  return { ...(payload as T), _id: result.id || result._id };
}

export async function cloudUpdate<T extends { _id?: string; storeId?: string }>(
  collection: CollectionName,
  id: string,
  patch: Partial<T>,
  storeId?: string
): Promise<void> {
  const db = await getCloudbaseDb();
  if (!db) throw new Error('CloudBase 未配置，无法更新云端数据');
  const { _id, ...withoutId } = patch;
  const { storeId: _storeId, ...withoutStoreId } = withoutId;
  const payload = collection === 'stores' ? withoutId : withoutStoreId;
  const target = storeId ? db.collection(collection).where({ _id: id, storeId }) : db.collection(collection).doc(id);
  const result = await target.update(payload);
  const updated = Number(result?.updated ?? result?.stats?.updated ?? result?.modified ?? Number.NaN);
  if (Number.isFinite(updated) && updated <= 0) {
    throw new Error('没有找到可修改的数据，可能已被删除或不属于当前店铺');
  }
}
