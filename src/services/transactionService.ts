import type { Customer, QueryFilters, Transaction } from '../types';
import { nowIso } from '../utils/date';
import { isPurchaseExpense, PURCHASE_EXPENSE_CATEGORY_ID, PURCHASE_EXPENSE_CATEGORY_NAME } from '../utils/expense';
import { roundMoney, sumMoney } from '../utils/money';
import { normalizePhone, phoneMatches } from '../utils/phone';
import { addRecord, listCollection, updateRecord } from './dataSource';

type TransactionDraft = Omit<Transaction, 'createdAt' | 'updatedAt'> & Partial<Pick<Transaction, 'createdAt' | 'updatedAt'>>;

export async function listTransactions(storeId: string): Promise<Transaction[]> {
  const rows = await listCollection<Transaction>('transactions', storeId);
  return rows
    .filter((row) => !row.deletedAt)
    .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
}

export async function createTransaction(input: Omit<Transaction, '_id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
  const now = nowIso();
  const payload = normalizeTransaction(input);
  return addRecord<Transaction>('transactions', {
    ...payload,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  if (!transaction._id) throw new Error('流水缺少 ID，无法保存');
  const payload = normalizeTransaction(transaction);
  await updateRecord<Transaction>('transactions', transaction._id, {
    ...payload,
    updatedAt: nowIso()
  }, transaction.storeId);
}

export async function softDeleteTransaction(transaction: Transaction): Promise<void> {
  if (!transaction._id) throw new Error('流水缺少 ID，无法删除');
  await updateRecord<Transaction>('transactions', transaction._id, {
    deletedAt: nowIso(),
    updatedAt: nowIso()
  }, transaction.storeId);
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
    if (row.type === 'expense' && !isPurchaseExpense(row)) return false;
    if (filters.type !== 'all' && row.type !== filters.type) return false;
    if (row.date < filters.startDate || row.date > filters.endDate) return false;
    if (filters.createdBy !== 'all' && row.createdBy !== filters.createdBy) return false;
    if (filters.paymentMethodId && row.paymentMethodId !== filters.paymentMethodId) return false;
    if (filters.categoryId && (row.type !== 'income' || !(row.items ?? []).some((item) => item.categoryId === filters.categoryId))) return false;
    if (keyword) {
      if (row.type === 'income') {
        const nameMatch = (row.customerName ?? '').toLowerCase().includes(keyword);
        const phoneMatch = phoneMatches(row.customerPhone, keyword);
        const customerMatch = matchedCustomers.some((customer) => {
          if (customer._id && row.customerId === customer._id) return true;
          if (customer.phone && row.customerPhone && normalizePhone(customer.phone) === normalizePhone(row.customerPhone)) return true;
          return Boolean(customer.name && row.customerName && customer.name === row.customerName);
        });
        if (!nameMatch && !phoneMatch && !customerMatch) return false;
      } else {
        const goodsText = (row.items ?? []).map((item) => `${item.itemName ?? ''} ${item.note ?? ''}`).join(' ');
        const text = `${row.expenseCategoryName ?? ''} ${goodsText} ${row.paymentMethodName} ${row.note ?? ''}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }
    }
    return true;
  });
}

export function makeIncomeSearchText(transaction: Transaction): string {
  if (transaction.type === 'expense') {
    return (transaction.items ?? []).map((item) => item.itemName || item.note || PURCHASE_EXPENSE_CATEGORY_NAME).join('、');
  }
  return (transaction.items ?? [])
    .map((item) => `${item.categoryName}${item.itemName ? `/${item.itemName}` : ''}`)
    .join('、');
}

export function validateTransaction(transaction: Pick<Transaction, 'type' | 'totalAmount' | 'date' | 'paymentMethodName'>) {
  normalizeTransactionDate(transaction.date);
  if (!transaction.paymentMethodName.trim()) throw new Error('请选择支付方式');
  if (roundMoney(transaction.totalAmount) <= 0) throw new Error('金额必须大于 0');
}

export function cleanPhone(phone?: string) {
  return normalizePhone(phone);
}

function normalizeTransaction<T extends TransactionDraft>(transaction: T): T {
  if (!transaction.storeId) throw new Error('缺少店铺 ID，无法保存流水');
  const date = normalizeTransactionDate(transaction.date);
  const paymentMethodName = transaction.paymentMethodName.trim();
  if (!paymentMethodName) throw new Error('请选择支付方式');

  if (transaction.type === 'income') {
    const items = normalizeIncomeItems(transaction.items);
    const customerName = transaction.customerName?.trim() ?? '';
    const customerPhone = normalizePhone(transaction.customerPhone);
    if (!customerName) throw new Error('请填写顾客姓名');
    if (customerPhone.length !== 11) throw new Error('请填写 11 位顾客手机号');

    return {
      ...transaction,
      date,
      customerName,
      customerPhone,
      paymentMethodName,
      items,
      totalAmount: sumMoney(items.map((item) => item.amount)),
      note: transaction.note?.slice(0, 200) ?? ''
    } as T;
  }

  const items = normalizePurchaseItems(transaction.items);

  return {
    ...transaction,
    date,
    paymentMethodName,
    expenseCategoryId: transaction.expenseCategoryId || PURCHASE_EXPENSE_CATEGORY_ID,
    expenseCategoryName: PURCHASE_EXPENSE_CATEGORY_NAME,
    totalAmount: sumMoney(items.map((item) => item.amount)),
    items,
    note: transaction.note?.slice(0, 200) ?? ''
  } as T;
}

function normalizeIncomeItems(items: Transaction['items']) {
  const candidates = (items ?? []).filter((item) => {
    return item.categoryId || item.categoryName || item.itemId || item.itemName || item.note?.trim() || roundMoney(item.amount) > 0;
  });
  if (!candidates.length) throw new Error('请至少添加一个消费项目');

  return candidates.map((item, index) => {
    const categoryId = item.categoryId.trim();
    const categoryName = item.categoryName.trim();
    const amount = roundMoney(item.amount);
    if (!categoryId || !categoryName) throw new Error(`第 ${index + 1} 个消费项目请选择一级项目`);
    if (amount <= 0) throw new Error(`第 ${index + 1} 个消费项目金额必须大于 0`);
    return {
      categoryId,
      categoryName,
      itemId: item.itemId?.trim() || undefined,
      itemName: item.itemName?.trim() || undefined,
      amount,
      note: item.note?.slice(0, 80) ?? ''
    };
  });
}

function normalizePurchaseItems(items: Transaction['items']) {
  const candidates = (items ?? []).filter((item) => {
    return item.itemName?.trim() || item.note?.trim() || roundMoney(item.amount) > 0;
  });
  if (!candidates.length) throw new Error('请至少添加一个进货货品');

  return candidates.map((item, index) => {
    const itemName = item.itemName?.trim() ?? '';
    const amount = roundMoney(item.amount);
    if (!itemName) throw new Error(`第 ${index + 1} 个进货货品请填写名称`);
    if (amount <= 0) throw new Error(`第 ${index + 1} 个进货货品金额必须大于 0`);
    return {
      categoryId: PURCHASE_EXPENSE_CATEGORY_ID,
      categoryName: PURCHASE_EXPENSE_CATEGORY_NAME,
      itemId: item.itemId?.trim() || undefined,
      itemName,
      amount,
      note: item.note?.slice(0, 80) ?? ''
    };
  });
}

function normalizeTransactionDate(value: string): string {
  const date = value.trim();
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('请选择有效日期');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('请选择有效日期');
  }
  return date;
}
