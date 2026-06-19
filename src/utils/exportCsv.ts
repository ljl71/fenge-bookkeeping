import type { Customer, Transaction } from '../types';
import { purchaseItemsText } from './expense';

function escapeCsv(value: unknown): string {
  const raw = String(value ?? '');
  const text = /^[=+\-@\t\r]/.test(raw.trimStart()) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function itemsText(transaction: Transaction): string {
  if (transaction.type === 'expense') return purchaseItemsText(transaction);
  return (transaction.items ?? [])
    .map((item) => `${item.categoryName}${item.itemName ? `/${item.itemName}` : ''}:${item.amount}`)
    .join('; ');
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = [
    'id',
    'date',
    'type',
    'customerName',
    'customerPhone',
    'itemsText',
    'expenseCategoryName',
    'totalAmount',
    'paymentMethodName',
    'note',
    'createdBy',
    'createdByUserId',
    'createdByName',
    'createdByRole',
    'createdAt',
    'updatedAt'
  ];
  const rows = transactions.map((row) => [
    row._id,
    row.date,
    row.type,
    row.customerName,
    row.customerPhone,
    itemsText(row),
    row.expenseCategoryName,
    row.totalAmount,
    row.paymentMethodName,
    row.note,
    row.createdBy,
    row.createdByUserId,
    row.createdByName,
    row.createdByRole,
    row.createdAt,
    row.updatedAt
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function customersToCsv(customers: Customer[]): string {
  const header = ['id', 'name', 'phone', 'note', 'createdAt', 'updatedAt'];
  const rows = customers.map((row) => [row._id, row.name, row.phone, row.note, row.createdAt, row.updatedAt]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
