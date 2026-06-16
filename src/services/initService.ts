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

  if (data.serviceCategories.length === 0) {
    const categories = defaultServiceCategories(storeId, now);
    for (const category of categories) {
      await addRecord('serviceCategories', category);
    }
    const insertedCategories = await listCollection<ServiceCategory>('serviceCategories', storeId);
    for (const item of defaultServiceItems(storeId, insertedCategories, now)) {
      await addRecord('serviceItems', item);
    }
  }

  if (data.expenseCategories.length === 0) {
    for (const category of defaultExpenseCategories(storeId, now)) {
      await addRecord('expenseCategories', category);
    }
  }

  if (data.paymentMethods.length === 0) {
    for (const method of defaultPaymentMethods(storeId, now)) {
      await addRecord('paymentMethods', method);
    }
  }
}
