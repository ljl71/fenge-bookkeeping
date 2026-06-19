export type Role = 'mom' | 'dad' | 'unknown';
export type AccountRole = 'owner' | 'employee';
export type TransactionType = 'income' | 'expense';
export type CollectionName =
  | 'stores'
  | 'storeUsers'
  | 'customers'
  | 'serviceCategories'
  | 'serviceItems'
  | 'expenseCategories'
  | 'paymentMethods'
  | 'transactions';

export interface Store {
  _id?: string;
  storeId: string;
  name: string;
  pinHash?: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface StoreUser {
  _id?: string;
  storeId: string;
  username: string;
  displayName: string;
  role: AccountRole;
  legacyRole?: Role;
  pinHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Customer {
  _id?: string;
  storeId: string;
  name: string;
  phone?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ServiceCategory {
  _id?: string;
  storeId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ServiceItem {
  _id?: string;
  storeId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  defaultPrice?: number;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ExpenseCategory {
  _id?: string;
  storeId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PaymentMethod {
  _id?: string;
  storeId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface TransactionItem {
  categoryId: string;
  categoryName: string;
  itemId?: string;
  itemName?: string;
  amount: number;
  note?: string;
}

export interface Transaction {
  _id?: string;
  storeId: string;
  type: TransactionType;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items?: TransactionItem[];
  expenseCategoryId?: string;
  expenseCategoryName?: string;
  totalAmount: number;
  paymentMethodId?: string;
  paymentMethodName: string;
  date: string;
  note?: string;
  createdBy?: Role;
  createdByUserId?: string;
  createdByName?: string;
  createdByRole?: AccountRole;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface AppSession {
  storeId: string;
  storeName: string;
  userId: string;
  username: string;
  displayName: string;
  role: AccountRole;
  legacyRole?: Role;
  loginToken: string;
  loginAt: string;
  expiresAt: string;
  fallbackLogin?: boolean;
}

export interface AppData {
  storeUsers: StoreUser[];
  customers: Customer[];
  serviceCategories: ServiceCategory[];
  serviceItems: ServiceItem[];
  expenseCategories: ExpenseCategory[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
}

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface QueryFilters {
  type: 'all' | TransactionType;
  preset: DatePreset;
  startDate: string;
  endDate: string;
  keyword: string;
  categoryId: string;
  paymentMethodId: string;
  createdBy: 'all' | Role;
  createdByUserId: 'all' | string;
}

export interface StatsSummary {
  total: number;
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  customerCount: number;
  averageTicket: number;
}

export interface ListOption {
  _id?: string;
  name: string;
  active: boolean;
  sortOrder: number;
  deletedAt?: string | null;
}
