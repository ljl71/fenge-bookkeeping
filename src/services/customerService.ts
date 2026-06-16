import type { Customer, Transaction } from '../types';
import { nowIso } from '../utils/date';
import { normalizePhone, phoneMatches } from '../utils/phone';
import { addRecord, listCollection, updateRecord } from './dataSource';

export async function listCustomers(storeId: string): Promise<Customer[]> {
  const rows = await listCollection<Customer>('customers', storeId);
  return rows.filter((row) => !row.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function filterCustomers(customers: Customer[], keyword: string): Customer[] {
  const next = keyword.trim().toLowerCase();
  if (!next) return customers;
  return customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(next) ||
      phoneMatches(customer.phone, next) ||
      (customer.note ?? '').toLowerCase().includes(next)
    );
  });
}

export async function saveCustomer(storeId: string, input: Partial<Customer> & { name: string }): Promise<Customer> {
  const name = input.name.trim();
  if (!name) throw new Error('请填写顾客姓名');
  const now = nowIso();
  const payload = {
    storeId,
    name,
    phone: normalizePhone(input.phone),
    note: input.note?.slice(0, 200) ?? '',
    updatedAt: now,
    deletedAt: null
  };

  if (input._id) {
    await updateRecord<Customer>('customers', input._id, payload);
    return { ...(input as Customer), ...payload };
  }

  return addRecord<Customer>('customers', {
    ...payload,
    createdAt: now
  });
}

export async function softDeleteCustomer(customer: Customer) {
  if (!customer._id) throw new Error('顾客缺少 ID，无法删除');
  await updateRecord<Customer>('customers', customer._id, { deletedAt: nowIso(), updatedAt: nowIso() });
}

export async function findOrCreateCustomer(storeId: string, input: { name: string; phone?: string; note?: string }) {
  const customers = await listCustomers(storeId);
  const normalizedPhone = normalizePhone(input.phone);
  const found = customers.find((customer) => {
    if (normalizedPhone && normalizePhone(customer.phone) === normalizedPhone) return true;
    return customer.name.trim() === input.name.trim() && !normalizedPhone;
  });

  if (found) {
    const patch: Partial<Customer> = {};
    if (normalizedPhone && !found.phone) patch.phone = normalizedPhone;
    if (Object.keys(patch).length && found._id) {
      patch.updatedAt = nowIso();
      await updateRecord<Customer>('customers', found._id, patch);
      return { ...found, ...patch };
    }
    return found;
  }

  return saveCustomer(storeId, { name: input.name, phone: normalizedPhone, note: input.note });
}

export function customerConsumptionRows(customer: Customer, transactions: Transaction[]) {
  return transactions.filter(
    (row) => !row.deletedAt && row.type === 'income' && (row.customerId === customer._id || row.customerName === customer.name)
  );
}
