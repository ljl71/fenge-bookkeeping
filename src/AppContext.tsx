import { createContext, useContext } from 'react';
import type { AppData, AppSession } from './types';
import type { AppRoute, RouteState } from './routes';

export interface ToastState {
  kind: 'success' | 'error' | 'info';
  message: string;
}

export interface AppContextValue {
  session: AppSession;
  data: AppData;
  loading: boolean;
  stale: boolean;
  routeState: RouteState;
  navigate: (route: AppRoute, params?: Record<string, string>) => void;
  refreshData: () => Promise<void>;
  setToast: (toast: ToastState | null) => void;
  logout: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppContext');
  return value;
}
