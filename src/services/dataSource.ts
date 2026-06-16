import type { CollectionName } from '../types';
import { isDemoMode } from '../cloudbase/app';
import { cloudAdd, cloudList, cloudUpdate } from '../cloudbase/db';
import { localDatabase } from './localDatabase';

export async function listCollection<T>(collection: CollectionName, storeId: string): Promise<T[]> {
  if (isDemoMode) return localDatabase.list<T>(collection, storeId);
  return cloudList<T>(collection, { storeId });
}

export async function addRecord<T extends { _id?: string }>(
  collection: CollectionName,
  record: Omit<T, '_id'>
): Promise<T> {
  if (isDemoMode) return localDatabase.add<T>(collection, record);
  return cloudAdd<T>(collection, record);
}

export async function updateRecord<T extends { _id?: string }>(
  collection: CollectionName,
  id: string,
  patch: Partial<T>
): Promise<void> {
  if (isDemoMode) {
    localDatabase.update<T>(collection, id, patch);
    return;
  }
  await cloudUpdate<T>(collection, id, patch);
}
