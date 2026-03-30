import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/content': 'Content Factory',
  '/publishing': 'Distribution Hub',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const basePath = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[basePath] ?? 'OmniAffiliate';

  return (
    <div className="flex h-screen bg-zinc-950 dark overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
