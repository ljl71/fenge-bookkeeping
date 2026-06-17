import type { AppData, Customer, ExpenseCategory, PaymentMethod, ServiceCategory, ServiceItem, Transaction } from '../types';
import {
  defaultExpenseCategories,
  defaultPaymentMethods,
  defaultServiceCategories,
  defaultServiceItems
} from '../constants/defaults';
import { nowIso } from '../utils/date';
import { addRecord, listCollection } from './dataSource';

export async function loadAllData(storeId: string): Promise<AppData> {
  const [customers, serviceCategories, serviceItems, expenseCategories, paymentMethods, transactions] =
    await Promise.all([
      listCollection<Customer>('customers', storeId),
      listCollection<ServiceCategory>('serviceCategories', storeId),
      listCollection<ServiceItem>('serviceItems', storeId),
      listCollection<ExpenseCategory>('expenseCategories', storeId),
      listCollection<PaymentMethod>('paymentMethods', storeId),
      listCollection<Transaction>('transactions', storeId)
    ]);

  return {
    customers,
    serviceCategories,
    serviceItems,
    expenseCategories,
    paymentMethods,
    transactions
  };
}

export async function ensureDefaultConfig(storeId: string) {
  const data = await loadAllData(storeId);
  const now = nowIso();
  let serviceCategories = data.serviceCategories;

  for (const category of defaultServiceCategories(storeId, now)) {
    if (!hasLiveName(serviceCategories, category.name)) {
      const inserted = await addRecord<ServiceCategory>('serviceCategories', category);
      serviceCategories = [...serviceCategories, inserted];
    }
  }

  for (const item of defaultServiceItems(storeId, serviceCategories.filter((category) => !category.deletedAt), now)) {
    if (!data.serviceItems.some((row) => !row.deletedAt && row.categoryName === item.categoryName && row.name === item.name)) {
      await addRecord<ServiceItem>('serviceItems', item);
    }
  }

  for (const category of defaultExpenseCategories(storeId, now)) {
    if (!hasLiveName(data.expenseCategories, category.name)) {
      await addRecord<ExpenseCategory>('expenseCategories', category);
    }
  }

  for (const method of defaultPaymentMethods(storeId, now)) {
    if (!hasLiveName(data.paymentMethods, method.name)) {
      await addRecord<PaymentMethod>('paymentMethods', method);
    }
  }
}

function hasLiveName(rows: Array<{ name: string; deletedAt?: string | null }>, name: string) {
  return rows.some((row) => !row.deletedAt && row.name === name);
}
