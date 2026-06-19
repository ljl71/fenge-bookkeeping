import type { AppSession, Transaction } from '../types';
import type { AppRoute } from '../routes';

export function isOwner(session: AppSession | null | undefined): boolean {
  return session?.role === 'owner';
}

export function isEmployee(session: AppSession | null | undefined): boolean {
  return session?.role === 'employee';
}

export function canViewAllTransactions(session: AppSession | null | undefined): boolean {
  return isOwner(session);
}

export function canCreateIncome(session: AppSession | null | undefined): boolean {
  return Boolean(session);
}

export function canCreateExpense(session: AppSession | null | undefined): boolean {
  return isOwner(session);
}

export function canAccessCustomers(session: AppSession | null | undefined): boolean {
  return Boolean(session);
}

export function canAccessSettings(session: AppSession | null | undefined): boolean {
  return Boolean(session);
}

export function canAccessProjects(session: AppSession | null | undefined): boolean {
  return isOwner(session);
}

export function canAccessBackup(session: AppSession | null | undefined): boolean {
  return isOwner(session);
}

export function canAccessStats(session: AppSession | null | undefined): boolean {
  return isOwner(session);
}

export function canManageEmployees(session: AppSession | null | undefined): boolean {
  return isOwner(session);
}

export function canViewTransaction(session: AppSession | null | undefined, transaction: Transaction): boolean {
  if (!session || transaction.deletedAt || transaction.storeId !== session.storeId) return false;
  if (isOwner(session)) return true;
  return transaction.type === 'income' && transaction.createdByUserId === session.userId;
}

export function canEditTransaction(session: AppSession | null | undefined, transaction: Transaction): boolean {
  if (!canViewTransaction(session, transaction)) return false;
  if (isOwner(session)) return true;
  return transaction.type === 'income' && transaction.createdByUserId === session?.userId;
}

export function canDeleteTransaction(session: AppSession | null | undefined, transaction: Transaction): boolean {
  return canEditTransaction(session, transaction);
}

export function canAccessRoute(session: AppSession | null | undefined, route: AppRoute): boolean {
  if (!session) return false;
  if (isOwner(session)) return true;
  return (
    route === 'dashboard' ||
    route === 'bookkeeping' ||
    route === 'customers' ||
    route === 'customerDetail' ||
    route === 'query' ||
    route === 'settings' ||
    route === 'editTransaction'
  );
}

export function attachCreatorFields<T extends Partial<Transaction>>(input: T, session: AppSession): T {
  return {
    ...input,
    storeId: session.storeId,
    createdByUserId: session.userId,
    createdByName: session.displayName,
    createdByRole: session.role,
    createdBy: session.legacyRole ?? 'unknown'
  };
}
