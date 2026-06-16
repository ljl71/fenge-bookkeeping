import type {
  AppData,
  CollectionName,
  Customer,
  ExpenseCategory,
  PaymentMethod,
  ServiceCategory,
  ServiceItem,
  Store,
  Transaction
} from '../types';
import {
  defaultExpenseCategories,
  defaultPaymentMethods,
  defaultServiceCategories,
  defaultServiceItems,
  defaultStore,
  DEMO_STORE_ID
} from '../constants/defaults';
import { nowIso } from '../utils/date';

interface DemoDb extends AppData {
  stores: Store[];
}

const KEY = 'fenge-bookkeeping-demo-db';

const emptyData = (): DemoDb => ({
  stores: [],
  customers: [],
  serviceCategories: [],
  serviceItems: [],
  expenseCategories: [],
  paymentMethods: [],
  transactions: []
});

function seed(): DemoDb {
  const now = nowIso();
  const store = defaultStore(now);
  const serviceCategories = defaultServiceCategories(DEMO_STORE_ID, now);
  return {
    stores: [store],
    customers: [
      {
        _id: 'customer-demo-1',
        storeId: DEMO_STORE_ID,
        name: '王姐',
        phone: '13800008888',
        note: '常做睫毛',
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      }
    ],
    serviceCategories,
    serviceItems: defaultServiceItems(DEMO_STORE_ID, serviceCategories, now),
    expenseCategories: defaultExpenseCategories(DEMO_STORE_ID, now),
    paymentMethods: defaultPaymentMethods(DEMO_STORE_ID, now),
    transactions: []
  };
}

function read(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const next = seed();
      write(next);
      return next;
    }
    return { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    const next = seed();
    write(next);
    return next;
  }
}

function write(data: DemoDb) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function makeId(collection: CollectionName) {
  return `${collection}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortActive<T extends { sortOrder?: number; deletedAt?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export const localDatabase = {
  list<T>(collection: CollectionName, storeId: string): T[] {
    const db = read();
    if (collection === 'stores') return db.stores as T[];
    const rows = (db[collection] as unknown as Array<T & { storeId: string; sortOrder?: number; deletedAt?: string | null }>).filter(
      (row) => row.storeId === storeId
    );
    return sortActive(rows) as T[];
  },
  getStore(storeId: string): Store | undefined {
    return read().stores.find((store) => store.storeId === storeId);
  },
  add<T extends { _id?: string; storeId?: string }>(collection: CollectionName, record: Omit<T, '_id'>): T {
    const db = read();
    const next = { ...(record as T), _id: makeId(collection) };
    (db[collection] as unknown as T[]).push(next);
    write(db);
    return next;
  },
  update<T extends { _id?: string }>(collection: CollectionName, id: string, patch: Partial<T>) {
    const db = read();
    const rows = db[collection] as unknown as T[];
    const index = rows.findIndex((row) => row._id === id);
    if (index < 0) throw new Error('没有找到要更新的数据');
    rows[index] = { ...rows[index], ...patch };
    write(db);
  },
  exportAll(storeId: string): DemoDb {
    const db = read();
    return {
      stores: db.stores.filter((store) => store.storeId === storeId),
      customers: db.customers.filter((row: Customer) => row.storeId === storeId),
      serviceCategories: db.serviceCategories.filter((row: ServiceCategory) => row.storeId === storeId),
      serviceItems: db.serviceItems.filter((row: ServiceItem) => row.storeId === storeId),
      expenseCategories: db.expenseCategories.filter((row: ExpenseCategory) => row.storeId === storeId),
      paymentMethods: db.paymentMethods.filter((row: PaymentMethod) => row.storeId === storeId),
      transactions: db.transactions.filter((row: Transaction) => row.storeId === storeId)
    };
  },
  resetDemo() {
    write(seed());
  }
};
