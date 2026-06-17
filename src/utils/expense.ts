import type { Transaction, TransactionItem } from '../types';

export const PURCHASE_EXPENSE_CATEGORY_ID = 'expense-category-purchase';
export const PURCHASE_EXPENSE_CATEGORY_NAME = '进货';

export function isPurchaseExpense(transaction: Pick<Transaction, 'type' | 'expenseCategoryId' | 'expenseCategoryName' | 'items'>): boolean {
  if (transaction.type !== 'expense') return false;
  if (transaction.expenseCategoryName === PURCHASE_EXPENSE_CATEGORY_NAME) return true;
  if (transaction.expenseCategoryId === PURCHASE_EXPENSE_CATEGORY_ID) return true;
  return Boolean(transaction.items?.some((item) => item.categoryName === PURCHASE_EXPENSE_CATEGORY_NAME));
}

export function purchaseItemName(item: Pick<TransactionItem, 'itemName' | 'note'>): string {
  return item.itemName?.trim() || item.note?.trim() || '未填写货品';
}

export function purchaseItemsText(transaction: Pick<Transaction, 'items' | 'totalAmount'>): string {
  const items = transaction.items ?? [];
  if (!items.length) return `${PURCHASE_EXPENSE_CATEGORY_NAME}:${transaction.totalAmount}`;
  return items.map((item) => `${purchaseItemName(item)}:${item.amount}`).join('; ');
}
