import type { ExpenseCategory, PaymentMethod, ServiceCategory, ServiceItem, Store, StoreUser } from '../types';
import { PURCHASE_EXPENSE_CATEGORY_ID, PURCHASE_EXPENSE_CATEGORY_NAME } from '../utils/expense';

export const DEMO_PIN = '123456';
export const DEMO_STORE_ID = 'fenge';
export const DEMO_STORE_NAME = '芬格美业';

export const roleText = {
  mom: '妈妈',
  dad: '爸爸',
  unknown: '未知'
} as const;

export const accountRoleText = {
  owner: '店主',
  employee: '员工'
} as const;

export const collectionNames = [
  'stores',
  'storeUsers',
  'customers',
  'serviceCategories',
  'serviceItems',
  'expenseCategories',
  'paymentMethods',
  'transactions'
] as const;

export function defaultStore(now: string): Store {
  return {
    _id: 'store-fenge',
    storeId: DEMO_STORE_ID,
    name: DEMO_STORE_NAME,
    active: true,
    createdAt: now,
    updatedAt: now
  };
}

export function defaultStoreUsers(storeId: string, now: string, pinHashes: Record<string, string>): StoreUser[] {
  return [
    {
      _id: 'store-user-mom',
      storeId,
      username: 'mom',
      displayName: '妈妈',
      role: 'owner',
      legacyRole: 'mom',
      pinHash: pinHashes.mom,
      active: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    },
    {
      _id: 'store-user-dad',
      storeId,
      username: 'dad',
      displayName: '爸爸',
      role: 'owner',
      legacyRole: 'dad',
      pinHash: pinHashes.dad,
      active: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    },
    {
      _id: 'store-user-xiaowang',
      storeId,
      username: 'xiaowang',
      displayName: '小王',
      role: 'employee',
      pinHash: pinHashes.xiaowang,
      active: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }
  ];
}

export const defaultServiceCategoryNames = ['睫毛', '美甲', '洗脸', '护肤', '产品', '办卡/充值', '其他'];
export const defaultExpenseCategoryNames = [PURCHASE_EXPENSE_CATEGORY_NAME];
export const defaultPaymentMethodNames = ['微信', '支付宝', '现金', '其他'];

export function defaultServiceCategories(storeId: string, now: string): ServiceCategory[] {
  return defaultServiceCategoryNames.map((name, index) => ({
    _id: `service-category-${index + 1}`,
    storeId,
    name,
    sortOrder: index + 1,
    active: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }));
}

export function defaultServiceItems(storeId: string, categories: ServiceCategory[], now: string): ServiceItem[] {
  const lash = categories.find((category) => category.name === '睫毛');
  const face = categories.find((category) => category.name === '洗脸');
  const nail = categories.find((category) => category.name === '美甲');
  const rows = [
    [lash, '9号', 118],
    [lash, '10号', 128],
    [lash, '11号', 138],
    [nail, '单色', 98],
    [nail, '跳色', 128],
    [face, '基础洗脸', 58],
    [face, '深层清洁', 98]
  ] as const;

  return rows
    .filter(([category]) => category?._id)
    .map(([category, name, price], index) => ({
      _id: `service-item-${index + 1}`,
      storeId,
      categoryId: category!._id!,
      categoryName: category!.name,
      name,
      defaultPrice: price,
      sortOrder: index + 1,
      active: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }));
}

export function defaultExpenseCategories(storeId: string, now: string): ExpenseCategory[] {
  return defaultExpenseCategoryNames.map((name, index) => ({
    _id: name === PURCHASE_EXPENSE_CATEGORY_NAME ? PURCHASE_EXPENSE_CATEGORY_ID : `expense-category-${index + 1}`,
    storeId,
    name,
    sortOrder: index + 1,
    active: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }));
}

export function defaultPaymentMethods(storeId: string, now: string): PaymentMethod[] {
  return defaultPaymentMethodNames.map((name, index) => ({
    _id: `payment-method-${index + 1}`,
    storeId,
    name,
    sortOrder: index + 1,
    active: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }));
}
