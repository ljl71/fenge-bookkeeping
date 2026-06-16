import type { Customer, StatsSummary, Transaction } from '../types';
import { isBetweenDate, sortByDateDesc } from './date';

export function activeTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((row) => !row.deletedAt);
}

export function summarize(transactions: Transaction[]): StatsSummary {
  const rows = activeTransactions(transactions);
  const incomeRows = rows.filter((row) => row.type === 'income');
  const expenseRows = rows.filter((row) => row.type === 'expense');
  const income = incomeRows.reduce((sum, row) => sum + row.totalAmount, 0);
  const expense = expenseRows.reduce((sum, row) => sum + row.totalAmount, 0);
  const customerIds = new Set(incomeRows.map((row) => row.customerId || row.customerName).filter(Boolean));
  return {
    total: rows.length,
    income,
    expense,
    net: income - expense,
    incomeCount: incomeRows.length,
    expenseCount: expenseRows.length,
    customerCount: customerIds.size,
    averageTicket: incomeRows.length ? income / incomeRows.length : 0
  };
}

export function inDateRange(transactions: Transaction[], startDate: string, endDate: string): Transaction[] {
  return activeTransactions(transactions).filter((row) => isBetweenDate(row.date, startDate, endDate));
}

export function customerStats(customer: Customer, transactions: Transaction[]) {
  const rows = sortByDateDesc(
    activeTransactions(transactions).filter(
      (row) => row.type === 'income' && (row.customerId === customer._id || row.customerName === customer.name)
    )
  );
  const total = rows.reduce((sum, row) => sum + row.totalAmount, 0);
  const itemCounts = new Map<string, number>();
  rows.forEach((row) => {
    (row.items ?? []).forEach((item) => {
      const key = `${item.categoryName}${item.itemName ? `/${item.itemName}` : ''}`;
      itemCounts.set(key, (itemCounts.get(key) ?? 0) + 1);
    });
  });
  return {
    total,
    count: rows.length,
    lastDate: rows[0]?.date,
    favoriteItems: [...itemCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    rows
  };
}

export function groupAmount<T extends Transaction>(rows: T[], getKey: (row: T) => string | undefined) {
  const result = new Map<string, { name: string; income: number; expense: number; count: number; customers: Set<string> }>();
  rows.forEach((row) => {
    const key = getKey(row) || '未分类';
    const current = result.get(key) ?? { name: key, income: 0, expense: 0, count: 0, customers: new Set<string>() };
    if (row.type === 'income') current.income += row.totalAmount;
    if (row.type === 'expense') current.expense += row.totalAmount;
    current.count += 1;
    if (row.customerName) current.customers.add(row.customerName);
    result.set(key, current);
  });
  return [...result.values()].sort((a, b) => b.income + b.expense - (a.income + a.expense));
}
