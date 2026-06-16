import type { CollectionName } from '../types';
import { ensureCloudbaseAuth, getCloudbaseApp, isDemoMode } from './app';

export async function getCloudbaseDb() {
  if (isDemoMode) return null;
  await ensureCloudbaseAuth();
  return getCloudbaseApp().database();
}

export async function cloudList<T>(collection: CollectionName, where: Record<string, unknown>): Promise<T[]> {
  const db = await getCloudbaseDb();
  if (!db) return [];
  const rows: T[] = [];
  const pageSize = 100;
  let page = 0;
  while (page < 20) {
    const result = await db.collection(collection).where(where).skip(page * pageSize).limit(pageSize).get();
    const data = (result.data ?? []) as T[];
    rows.push(...data);
    if (data.length < pageSize) break;
    page += 1;
  }
  return rows;
}

export async function cloudAdd<T extends { _id?: string }>(
  collection: CollectionName,
  record: Omit<T, '_id'>
): Promise<T> {
  const db = await getCloudbaseDb();
  if (!db) throw new Error('CloudBase 未配置，无法写入云端数据');
  const result = await db.collection(collection).add(record);
  return { ...(record as T), _id: result.id || result._id };
}

export async function cloudUpdate<T extends { _id?: string }>(
  collection: CollectionName,
  id: string,
  patch: Partial<T>
): Promise<void> {
  const db = await getCloudbaseDb();
  if (!db) throw new Error('CloudBase 未配置，无法更新云端数据');
  const { _id, ...payload } = patch;
  await db.collection(collection).doc(id).update(payload);
}
