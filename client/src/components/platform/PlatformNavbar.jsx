import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutGrid,
  Store,
  Boxes,
  CreditCard,
  Receipt,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/platform', icon: LayoutGrid, label: 'Dashboard' },
  { to: '/platform/bakeries', icon: Store, label: 'Bakeries' },
  { to: '/platform/assets', icon: Boxes, label: 'Assets' },
  { to: '/platform/billing', icon: CreditCard, label: 'Billing' },
  { to: '/platform/transactions', icon: Receipt, label: 'Transactions' },
];

export default function PlatformNavbar() {
  const location = useLocation();

  function isActive(to) {
    if (to === '/platform') return location.pathname === '/platform';
    return location.pathname.startsWith(to);
  }

  return (
    <nav className="fixed left-0 top-0 h-screen w-[70px] flex flex-col items-center bg-white border-r border-violet-100 py-4 z-20">
      <div className="relative mb-6 flex-shrink-0" title="Platform Admin">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-1 w-full overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={`w-12 h-12 flex-shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
                active
                  ? 'bg-violet-50 text-violet-600'
                  : 'text-gray-400 hover:bg-violet-50 hover:text-violet-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] leading-none font-medium">{label}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        title="Log out"
        aria-label="Log out"
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-400 hover:bg-violet-50 hover:text-violet-500 transition-colors mt-2"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </nav>
  );
}