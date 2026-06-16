import { BookOpenText, Home, Search, Settings, UsersRound } from 'lucide-react';
import { mainRoutes } from '../routes';
import { useApp } from '../AppContext';

const iconMap = {
  dashboard: Home,
  bookkeeping: BookOpenText,
  customers: UsersRound,
  query: Search,
  settings: Settings
} as const;

export function BottomNav() {
  const { routeState, navigate } = useApp();
  return (
    <nav className="bottom-nav" aria-label="底部导航">
      {mainRoutes.map((item) => {
        const Icon = iconMap[item.route as keyof typeof iconMap];
        const active =
          routeState.route === item.route ||
          (item.route === 'settings' && ['stats', 'projects', 'backup'].includes(routeState.route));
        return (
          <button
            key={item.route}
            type="button"
            className={active ? 'bottom-nav__item is-active' : 'bottom-nav__item'}
            onClick={() => navigate(item.route)}
            aria-label={item.label}
            title={item.label}
          >
            <Icon size={24} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
