import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Telescope, FileText, Send, Settings } from 'lucide-react';
import { cn } from '@shared/utils/cn';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/products/discover', icon: Telescope, label: 'Discover' },
  { to: '/content', icon: FileText, label: 'Content' },
  { to: '/publishing', icon: Send, label: 'Publishing' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="flex flex-col w-[var(--sidebar-width)] bg-zinc-950 border-r border-zinc-800 shrink-0 h-full">
      {/* Logo */}
      <div className="flex items-center px-4 h-14 border-b border-zinc-800">
        <img src="/logo.svg" alt="Flow Affiliet" className="h-7" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-zinc-600 text-xs">Phase 1 — Architecture</p>
      </div>
    </aside>
  );
}
