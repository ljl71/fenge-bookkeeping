import type { CollectionName, ExpenseCategory, ListOption, PaymentMethod, ServiceCategory, ServiceItem } from '../types';
import { nowIso } from '../utils/date';
import { addRecord, updateRecord } from './dataSource';

type ConfigCollection = 'serviceCategories' | 'serviceItems' | 'expenseCategories' | 'paymentMethods';
type ConfigRecord = ServiceCategory | ServiceItem | ExpenseCategory | PaymentMethod;

export function activeOptions<T extends ListOption>(rows: T[]): T[] {
  return rows.filter((row) => !row.deletedAt && row.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function uniqueActiveOptions<T extends ListOption>(rows: T[]): T[] {
  return uniqueBy(activeOptions(rows), (row) => normalizeConfigName(row.name));
}

export function uniqueActiveServiceItems(rows: ServiceItem[], categoryId?: string): ServiceItem[] {
  return uniqueBy(
    activeOptions(rows).filter((row) => !categoryId || row.categoryId === categoryId),
    (row) => `${row.categoryId || row.categoryName}:${normalizeConfigName(row.name)}`
  );
}

export function uniqueConfigRows<T extends ListOption>(rows: T[], getKey: (row: T) => string = (row) => normalizeConfigName(row.name)): T[] {
  return uniqueBy(
    rows
      .filter((row) => !row.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    getKey
  );
}

export async function saveServiceCategory(
  storeId: string,
  input: Partial<ServiceCategory> & { name: string }
): Promise<ServiceCategory> {
  return saveConfig<ServiceCategory>('serviceCategories', storeId, input);
}

export async function saveExpenseCategory(
  storeId: string,
  input: Partial<ExpenseCategory> & { name: string }
): Promise<ExpenseCategory> {
  return saveConfig<ExpenseCategory>('expenseCategories', storeId, input);
}

export async function savePaymentMethod(
  storeId: string,
  input: Partial<PaymentMethod> & { name: string }
): Promise<PaymentMethod> {
  return saveConfig<PaymentMethod>('paymentMethods', storeId, input);
}

export async function saveServiceItem(
  storeId: string,
  input: Partial<ServiceItem> & { name: string; categoryId: string; categoryName: string }
): Promise<ServiceItem> {
  const now = nowIso();
  const payload = {
    storeId,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    name: input.name.trim(),
    defaultPrice: Number(input.defaultPrice ?? 0),
    sortOrder: Number(input.sortOrder ?? 99),
    active: input.active ?? true,
    updatedAt: now,
    deletedAt: null
  };
  if (!payload.name) throw new Error('请填写子项目名称');
  if (!payload.categoryId) throw new Error('请选择一级项目');
  if (input._id) {
    await updateRecord<ServiceItem>('serviceItems', input._id, payload, storeId);
    return { ...(input as ServiceItem), ...payload };
  }
  return addRecord<ServiceItem>('serviceItems', { ...payload, createdAt: now });
}

async function saveConfig<T extends ConfigRecord>(
  collection: ConfigCollection,
  storeId: string,
  input: Partial<T> & { name: string }
): Promise<T> {
  const now = nowIso();
  const payload = {
    storeId,
    name: input.name.trim(),
    sortOrder: Number(input.sortOrder ?? 99),
    active: input.active ?? true,
    updatedAt: now,
    deletedAt: null
  } as Partial<T>;
  if (!payload.name) throw new Error('请填写名称');
  if (input._id) {
    await updateRecord<T>(collection as CollectionName, input._id, payload, storeId);
    return { ...(input as T), ...payload };
  }
  return addRecord<T>(collection as CollectionName, { ...payload, createdAt: now } as Omit<T, '_id'>);
}

export async function toggleConfig<T extends ConfigRecord>(collection: ConfigCollection, row: T) {
  if (!row._id) throw new Error('缺少 ID，无法修改');
  await updateRecord<T>(collection, row._id, { active: !row.active, updatedAt: nowIso() } as Partial<T>, row.storeId);
}

export async function softDeleteConfig<T extends ConfigRecord>(collection: ConfigCollection, row: T) {
  if (!row._id) throw new Error('缺少 ID，无法删除');
  await updateRecord<T>(collection, row._id, { deletedAt: nowIso(), updatedAt: nowIso(), active: false } as Partial<T>, row.storeId);
}

function uniqueBy<T>(rows: T[], getKey: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = getKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeConfigName(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}
