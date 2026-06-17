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
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error('请填写手机号');
  if (phone.length !== 11) throw new Error('请填写 11 位手机号');
  const now = nowIso();
  const payload = {
    storeId,
    name,
    phone,
    note: input.note?.slice(0, 200) ?? '',
    updatedAt: now,
    deletedAt: null
  };

  if (input._id) {
    await updateRecord<Customer>('customers', input._id, payload, storeId);
    return { ...(input as Customer), ...payload };
  }

  return addRecord<Customer>('customers', {
    ...payload,
    createdAt: now
  });
}

export async function softDeleteCustomer(customer: Customer) {
  if (!customer._id) throw new Error('顾客缺少 ID，无法删除');
  await updateRecord<Customer>('customers', customer._id, { deletedAt: nowIso(), updatedAt: nowIso() }, customer.storeId);
}

export async function findOrCreateCustomer(storeId: string, input: { name: string; phone?: string; note?: string }) {
  const customers = await listCustomers(storeId);
  const name = input.name.trim();
  const normalizedPhone = normalizePhone(input.phone);
  if (!name) throw new Error('请填写顾客姓名');
  if (!normalizedPhone) throw new Error('请填写手机号');
  if (normalizedPhone.length !== 11) throw new Error('请填写 11 位手机号');
  const lowerName = name.toLowerCase();
  const found = customers.find((customer) => {
    const customerName = customer.name.trim().toLowerCase();
    const customerPhone = normalizePhone(customer.phone);
    if (customerPhone && phoneMatches(customerPhone, normalizedPhone)) return true;
    if (customerName && customerPhone && customerName.includes(lowerName) && customerPhone === normalizedPhone) return true;
    return false;
  });

  if (found) {
    const patch: Partial<Customer> = {};
    const nextNote = input.note?.slice(0, 200);
    if (name && found.name !== name) patch.name = name;
    if (!normalizePhone(found.phone)) patch.phone = normalizedPhone;
    if (nextNote && !found.note) patch.note = nextNote;
    if (Object.keys(patch).length && found._id) {
      patch.updatedAt = nowIso();
      await updateRecord<Customer>('customers', found._id, patch, storeId);
      return { ...found, ...patch };
    }
    return found;
  }

  return saveCustomer(storeId, { name, phone: normalizedPhone, note: input.note });
}

export function customerConsumptionRows(customer: Customer, transactions: Transaction[]) {
  const customerPhone = normalizePhone(customer.phone);
  return transactions.filter(
    (row) =>
      !row.deletedAt &&
      row.type === 'income' &&
      (row.customerId === customer._id ||
        (customerPhone && normalizePhone(row.customerPhone) === customerPhone) ||
        row.customerName === customer.name)
  );
}
