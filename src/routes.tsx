export type AppRoute =
  | 'dashboard'
  | 'bookkeeping'
  | 'customers'
  | 'customerDetail'
  | 'query'
  | 'stats'
  | 'settings'
  | 'projects'
  | 'backup'
  | 'editTransaction';

export interface RouteState {
  route: AppRoute;
  params?: Record<string, string>;
}

export const mainRoutes: Array<{ route: AppRoute; label: string }> = [
  { route: 'dashboard', label: '首页' },
  { route: 'bookkeeping', label: '记账' },
  { route: 'customers', label: '顾客' },
  { route: 'query', label: '查询' },
  { route: 'settings', label: '设置' }
];

export function encodeRoute(route: AppRoute, params?: Record<string, string>) {
  const query = new URLSearchParams(params ?? {}).toString();
  return `#${route}${query ? `?${query}` : ''}`;
}

export function parseRoute(): RouteState {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return { route: 'dashboard' };
  const [route, query] = raw.split('?');
  const validRoutes = [
    'dashboard',
    'bookkeeping',
    'customers',
    'customerDetail',
    'query',
    'stats',
    'settings',
    'projects',
    'backup',
    'editTransaction'
  ];
  return {
    route: validRoutes.includes(route) ? (route as AppRoute) : 'dashboard',
    params: Object.fromEntries(new URLSearchParams(query ?? ''))
  };
}
