import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Cake,
  ClipboardList,
  Tag,
  MessageCircle,
  Receipt,
  FileText,
  LayoutTemplate,
  Store,
  LogOut,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/bakery/reservations', icon: ClipboardList, label: 'Reservations' },
  { to: '/bakery/pricing', icon: Tag, label: 'Pricing' },
  { to: '/bakery/templates', icon: LayoutTemplate, label: 'Templates' },
  { to: '/bakery/billing', icon: CreditCard, label: 'Billing' },
  { to: '/bakery/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/bakery/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/bakery/blueprints', icon: FileText, label: 'Blueprints' },
  { to: '/bakery/profile', icon: Store, label: 'Profile' },
];

export default function BakeryNavbar() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef(null);

  const mobilePrimaryItems = NAV_ITEMS.slice(0, 4);
  const mobileMoreItems = NAV_ITEMS.slice(4);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  function isActive(to) {
    return location.pathname.startsWith(to);
  }

  return (
    <>
    <nav className="cn-bakery-nav" aria-label="Bakery navigation">
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

    <nav className="cn-bakery-mobile-nav" aria-label="Bakery mobile navigation">
      {mobilePrimaryItems.map(({ to, icon: Icon, label }) => {
        const active = isActive(to);
        return (
          <Link key={to} to={to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
      <button
        ref={moreButtonRef}
        type="button"
        className={mobileMoreItems.some(({ to }) => isActive(to)) ? 'is-active' : ''}
        aria-expanded={moreOpen}
        aria-controls="bakery-more-menu"
        onClick={() => setMoreOpen((open) => !open)}
      >
        <Menu aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>

    {moreOpen && (
      <div className="cn-bakery-more-backdrop" role="presentation" onMouseDown={() => setMoreOpen(false)}>
        <section
          id="bakery-more-menu"
          className="cn-bakery-more-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="More bakery navigation"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <strong>Mamshie Bakery</strong>
              <span>More tools</span>
            </div>
            <button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)}><X /></button>
          </header>
          <div className="cn-bakery-more-grid">
            {mobileMoreItems.map(({ to, icon: Icon, label }) => {
              const active = isActive(to);
              return (
                <Link key={to} to={to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
          <button type="button" className="cn-bakery-mobile-logout"><LogOut /> Log out</button>
        </section>
      </div>
    )}
    </>
  );
}
