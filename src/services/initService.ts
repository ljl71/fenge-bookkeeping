import type { AppData, AppSession, Customer, ExpenseCategory, PaymentMethod, ServiceCategory, ServiceItem, StoreUser, Transaction } from '../types';
import {
  defaultExpenseCategories,
  defaultPaymentMethods,
  defaultServiceCategories,
  defaultServiceItems
} from '../constants/defaults';
import { nowIso } from '../utils/date';
import { normalizePhone } from '../utils/phone';
import { addRecord, listCollection, listCollectionWhere } from './dataSource';
import { filterVisibleTransactions } from './transactionService';

export async function loadAllData(storeId: string, session?: AppSession): Promise<AppData> {
  const storeUsersPromise =
    session?.role === 'owner'
      ? listCollection<StoreUser>('storeUsers', storeId).catch(() => [] as StoreUser[])
      : Promise.resolve([] as StoreUser[]);
  const customersPromise = session?.role === 'employee' ? Promise.resolve([] as Customer[]) : listCollection<Customer>('customers', storeId);
  const [storeUsers, customers, serviceCategories, serviceItems, expenseCategories, paymentMethods, transactions] =
    await Promise.all([
      storeUsersPromise,
      customersPromise,
      listCollection<ServiceCategory>('serviceCategories', storeId),
      listCollection<ServiceItem>('serviceItems', storeId),
      listCollection<ExpenseCategory>('expenseCategories', storeId),
      listCollection<PaymentMethod>('paymentMethods', storeId),
      listCollection<Transaction>('transactions', storeId)
    ]);

  const visibleTransactions = session ? filterVisibleTransactions(transactions, session) : transactions.filter((row) => !row.deletedAt);
  const liveCustomers = customers.filter((row) => !row.deletedAt);
  const visibleCustomers =
    session?.role === 'employee'
      ? await listVisibleCustomersForTransactions(storeId, visibleTransactions)
      : liveCustomers;

  return {
    storeUsers: storeUsers.filter((row) => !row.deletedAt),
    customers: visibleCustomers,
    serviceCategories,
    serviceItems,
    expenseCategories,
    paymentMethods,
    transactions: visibleTransactions
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

async function listVisibleCustomersForTransactions(storeId: string, transactions: Transaction[]): Promise<Customer[]> {
  const liveIncomeRows = transactions.filter((row) => !row.deletedAt && row.type === 'income');
  const phones = [...new Set(liveIncomeRows.map((row) => normalizePhone(row.customerPhone)).filter(Boolean))];
  const fetchedCustomers = (
    await Promise.all(
      phones.map((phone) => listCollectionWhere<Customer>('customers', storeId, { phone }).catch(() => [] as Customer[]))
    )
  )
    .flat()
    .filter((customer) => !customer.deletedAt);
  const customersByPhone = new Map(fetchedCustomers.map((customer) => [normalizePhone(customer.phone), customer]));
  const result: Customer[] = [];
  const seen = new Set<string>();

  liveIncomeRows.forEach((row) => {
    const phone = normalizePhone(row.customerPhone);
    const customer = phone ? customersByPhone.get(phone) : undefined;
    const visibleCustomer = customer ?? makeVirtualCustomer(storeId, row);
    const key = visibleCustomer._id ?? `phone:${normalizePhone(visibleCustomer.phone)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(visibleCustomer);
  });

  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function makeVirtualCustomer(storeId: string, transaction: Transaction): Customer {
  const phone = normalizePhone(transaction.customerPhone);
  const name = transaction.customerName?.trim() || '未命名顾客';
  const key = phone || encodeURIComponent(name);
  return {
    _id: `visible-customer-${key}`,
    storeId,
    name,
    phone,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    deletedAt: null
  };
}
