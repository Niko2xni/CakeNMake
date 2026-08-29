import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Cake,
  LayoutGrid,
  ClipboardList,
  Tag,
  Boxes,
  MessageCircle,
  Receipt,
  FileText,
  Store,
  LogOut,
  CreditCard,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/bakery', icon: LayoutGrid, label: 'Dashboard' },
  { to: '/bakery/reservations', icon: ClipboardList, label: 'Reservations' },
  { to: '/bakery/pricing', icon: Tag, label: 'Pricing' },
  { to: '/bakery/billing', icon: CreditCard, label: 'Billing' },
  { to: '/bakery/assets', icon: Boxes, label: 'Assets' },
  { to: '/bakery/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/bakery/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/bakery/blueprints', icon: FileText, label: 'Blueprints' },
  { to: '/bakery/profile', icon: Store, label: 'Profile' },
];

export default function BakeryNavbar() {
  const location = useLocation();

  function isActive(to) {
    if (to === '/bakery') return location.pathname === '/bakery';
    return location.pathname.startsWith(to);
  }

  return (
    <nav className="fixed left-0 top-0 h-screen w-[70px] flex flex-col items-center bg-white border-r border-pink-100 py-4 z-20">
      {/* Brand */}
      <div className="relative mb-6 flex-shrink-0" title="Mamshie Bakery">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
          <Cake className="w-6 h-6 text-white" />
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
      </div>

      {/* Nav items */}
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
                  ? 'bg-pink-50 text-pink-600'
                  : 'text-gray-400 hover:bg-pink-50 hover:text-pink-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] leading-none font-medium">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <button
        type="button"
        title="Log out"
        aria-label="Log out"
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-colors mt-2"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </nav>
  );
}