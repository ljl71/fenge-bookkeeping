import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppData, AppSession } from './types';
import { AppContext, type ToastState } from './AppContext';
import { BottomNav } from './components/BottomNav';
import { Loading } from './components/Loading';
import { parseRoute, encodeRoute, type RouteState, type AppRoute } from './routes';
import { getSavedSession, logoutStore } from './services/storeService';
import { loadAllData } from './services/initService';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Bookkeeping } from './pages/Bookkeeping';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { Query } from './pages/Query';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { ProjectManagement } from './pages/ProjectManagement';
import { Backup } from './pages/Backup';
import { EditTransaction } from './pages/EditTransaction';
import { EmployeeManagement } from './pages/EmployeeManagement';
import { canAccessRoute } from './utils/permissions';

const emptyData = (): AppData => ({
  storeUsers: [],
  customers: [],
  serviceCategories: [],
  serviceItems: [],
  expenseCategories: [],
  paymentMethods: [],
  transactions: []
});

function cacheKey(storeId: string) {
  return `fenge-bookkeeping-cache-${storeId}`;
}

function readCachedData(storeId: string): AppData | null {
  try {
    const raw = localStorage.getItem(cacheKey(storeId));
    return raw ? ({ ...emptyData(), ...JSON.parse(raw) } as AppData) : null;
  } catch {
    return null;
  }
}

function saveCachedData(storeId: string, data: AppData) {
  localStorage.setItem(cacheKey(storeId), JSON.stringify(data));
}

export function App() {
  const [session, setSession] = useState<AppSession | null>(() => getSavedSession());
  const [data, setData] = useState<AppData>(() => (session ? readCachedData(session.storeId) ?? emptyData() : emptyData()));
  const [routeState, setRouteState] = useState<RouteState>(() => parseRoute());
  const [loading, setLoading] = useState(Boolean(session));
  const [stale, setStale] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const navigate = useCallback((route: AppRoute, params?: Record<string, string>) => {
    window.location.hash = encodeRoute(route, params);
    setRouteState({ route, params });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const refreshData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const next = await loadAllData(session.storeId, session);
      setData(next);
      saveCachedData(session.storeId, next);
      setStale(false);
    } catch (error) {
      const cached = readCachedData(session.storeId);
      if (cached) setData(cached);
      setStale(true);
      setToast({ kind: 'error', message: error instanceof Error ? error.message : '网络不可用，请检查网络后重试' });
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const listener = () => setRouteState(parseRoute());
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session, refreshData]);

  useEffect(() => {
    if (!session) return;
    const delay = new Date(session.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      logoutStore();
      setSession(null);
      setData(emptyData());
      return;
    }
    const timer = window.setTimeout(() => {
      logoutStore();
      setSession(null);
      setData(emptyData());
      setToast({ kind: 'info', message: '登录已过期，请重新登录' });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!session || canAccessRoute(session, routeState.route)) return;
    setToast({ kind: 'info', message: '当前账号无权限访问' });
    navigate('dashboard');
  }, [session, routeState.route, navigate]);

  const contextValue = useMemo(
    () =>
      session
        ? {
            session,
            data,
            loading,
            stale,
            routeState,
            navigate,
            refreshData,
            setToast,
            logout: () => {
              logoutStore();
              setSession(null);
              setData(emptyData());
              window.location.hash = '';
            }
          }
        : null,
    [session, data, loading, stale, routeState, navigate, refreshData]
  );

  if (!session || !contextValue) {
    return <Login onLogin={setSession} />;
  }

  const currentRoute = canAccessRoute(session, routeState.route) ? routeState.route : 'dashboard';

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-shell">
        {loading && !data.serviceCategories.length ? <Loading text="正在读取云端账本..." /> : <CurrentPage route={currentRoute} />}
        <BottomNav />
        {toast ? <div className={`toast toast--${toast.kind}`}>{toast.message}</div> : null}
      </div>
    </AppContext.Provider>
  );
}

function CurrentPage({ route }: { route: AppRoute }) {
  if (route === 'bookkeeping') return <Bookkeeping />;
  if (route === 'customers') return <Customers />;
  if (route === 'customerDetail') return <CustomerDetail />;
  if (route === 'query') return <Query />;
  if (route === 'stats') return <Stats />;
  if (route === 'settings') return <Settings />;
  if (route === 'projects') return <ProjectManagement />;
  if (route === 'backup') return <Backup />;
  if (route === 'employeeManagement') return <EmployeeManagement />;
  if (route === 'editTransaction') return <EditTransaction />;
  return <Dashboard />;
}
