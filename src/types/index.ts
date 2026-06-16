export type Role = 'mom' | 'dad' | 'unknown';
export type TransactionType = 'income' | 'expense';
export type CollectionName =
  | 'stores'
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
  pinHash: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
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
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface AppSession {
  storeId: string;
  storeName: string;
  role: Role;
  loginAt: string;
}

export interface AppData {
  customers: Customer[];
  serviceCategories: ServiceCategory[];
  serviceItems: ServiceItem[];
  expenseCategories: ExpenseCategory[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
}

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface QueryFilters {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  keyword: string;
  type: 'all' | TransactionType;
  categoryId: string;
  itemId: string;
  expenseCategoryId: string;
  paymentMethodId: string;
  noteKeyword: string;
  createdBy: 'all' | Role;
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
