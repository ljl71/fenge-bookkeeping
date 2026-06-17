import type { Customer, QueryFilters, Transaction } from '../types';
import { nowIso } from '../utils/date';
import { normalizePhone, phoneMatches } from '../utils/phone';
import { addRecord, listCollection, updateRecord } from './dataSource';

export async function listTransactions(storeId: string): Promise<Transaction[]> {
  const rows = await listCollection<Transaction>('transactions', storeId);
  return rows
    .filter((row) => !row.deletedAt)
    .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
}

export async function createTransaction(input: Omit<Transaction, '_id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
  const now = nowIso();
  return addRecord<Transaction>('transactions', {
    ...input,
    totalAmount: Number(input.totalAmount),
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  if (!transaction._id) throw new Error('流水缺少 ID，无法保存');
  await updateRecord<Transaction>('transactions', transaction._id, {
    ...transaction,
    totalAmount: Number(transaction.totalAmount),
    updatedAt: nowIso()
  });
}

export async function softDeleteTransaction(transaction: Transaction): Promise<void> {
  if (!transaction._id) throw new Error('流水缺少 ID，无法删除');
  await updateRecord<Transaction>('transactions', transaction._id, {
    deletedAt: nowIso(),
    updatedAt: nowIso()
  });
}

export function filterTransactions(transactions: Transaction[], filters: QueryFilters, customers: Customer[] = []): Transaction[] {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchedCustomers = keyword
    ? customers.filter((customer) => {
        if (customer.deletedAt) return false;
        return customer.name.toLowerCase().includes(keyword) || phoneMatches(customer.phone, keyword);
      })
    : [];
  return transactions.filter((row) => {
    if (row.deletedAt) return false;
    if (row.type !== 'income') return false;
    if (row.date < filters.startDate || row.date > filters.endDate) return false;
    if (filters.createdBy !== 'all' && row.createdBy !== filters.createdBy) return false;
    if (filters.paymentMethodId && row.paymentMethodId !== filters.paymentMethodId) return false;
    if (filters.categoryId && !(row.items ?? []).some((item) => item.categoryId === filters.categoryId)) return false;
    if (keyword) {
      const nameMatch = (row.customerName ?? '').toLowerCase().includes(keyword);
      const phoneMatch = phoneMatches(row.customerPhone, keyword);
      const customerMatch = matchedCustomers.some((customer) => {
        if (customer._id && row.customerId === customer._id) return true;
        if (customer.phone && row.customerPhone && normalizePhone(customer.phone) === normalizePhone(row.customerPhone)) return true;
        return Boolean(customer.name && row.customerName && customer.name === row.customerName);
      });
      if (!nameMatch && !phoneMatch && !customerMatch) return false;
    }
    return true;
  });
}

export function makeIncomeSearchText(transaction: Transaction): string {
  if (transaction.type === 'expense') return transaction.expenseCategoryName || '支出';
  return (transaction.items ?? [])
    .map((item) => `${item.categoryName}${item.itemName ? `/${item.itemName}` : ''}`)
    .join('、');
}

export function validateTransaction(transaction: Pick<Transaction, 'type' | 'totalAmount' | 'date' | 'paymentMethodName'>) {
  if (!transaction.date) throw new Error('请选择日期');
  if (!transaction.paymentMethodName) throw new Error('请选择支付方式');
  if (!transaction.totalAmount || transaction.totalAmount <= 0) throw new Error('金额必须大于 0');
}

export function cleanPhone(phone?: string) {
  return normalizePhone(phone);
}
