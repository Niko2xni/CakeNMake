import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useLogout from '@/hooks/useLogout';
import LogoutConfirmation from '@/components/shared/LogoutConfirmation';
import {
  Cake,
  ClipboardList,
  Tag,
  MessageCircle,
  FileText,
  LayoutTemplate,
  Store,
  LogOut,
  CreditCard,
  Menu,
  X,
  Radio,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useBakeryControlPanel } from '@/context/BakeryControlPanelContext';

const NAV_ITEMS = [
  { to: '/bakery/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/bakery/pricing', icon: Tag, label: 'Pricing' },
  { to: '/bakery/templates', icon: LayoutTemplate, label: 'Templates' },
  { to: '/bakery/billing', icon: CreditCard, label: 'Billing' },
  { to: '/bakery/chats', icon: MessageCircle, label: 'Chats' },
  { to: '/bakery/blueprints', icon: FileText, label: 'Blueprints' },
  { to: '/bakery/profile', icon: Store, label: 'Profile' },
];

export default function BakeryNavbar() {
  const { account } = useAuth();
  const isAdmin = account?.role === 'bakery_admin' || account?.role === 'platform_admin';
  const { handleLogout, requestLogout, isLoggingOut, logoutConfirmationOpen, changeLogoutConfirmation } = useLogout();
  const {
    isControlPanelVisible,
    toggleControlPanel,
    systemStatus,
    totalDrafts,
  } = useBakeryControlPanel();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef(null);

  const navItems = [
    { to: '/bakery/orders', icon: ClipboardList, label: 'Orders' },
    { to: '/bakery/pricing', icon: Tag, label: 'Pricing' },
    { to: '/bakery/templates', icon: LayoutTemplate, label: 'Templates' },
    ...(isAdmin ? [{ to: '/bakery/billing', icon: CreditCard, label: 'Billing' }] : []),
    { to: '/bakery/chats', icon: MessageCircle, label: 'Chats' },
    { to: '/bakery/blueprints', icon: FileText, label: 'Blueprints' },
    { to: '/bakery/profile', icon: Store, label: 'Profile' },
    ...(isAdmin ? [{ to: '/bakery/employees', icon: Users, label: 'Employees' }] : []),
  ];

  const mobilePrimaryItems = navItems.slice(0, 4);
  const mobileMoreItems = navItems.slice(4);

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
    <nav
      className={`cn-bakery-nav ${logoutConfirmationOpen ? '!z-30 pointer-events-none' : ''}`}
      style={logoutConfirmationOpen ? { zIndex: 30 } : undefined}
      aria-label="Bakery navigation"
    >
      {/* Brand */}
      <div className="relative mb-3 flex-shrink-0" title="AH TINAPS BAKESHOP">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center shadow-xs">
          <Cake className="w-6 h-6 text-white" />
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
      </div>

      {/* Control Panel Summon Button */}
      <button
        type="button"
        onClick={toggleControlPanel}
        title={isControlPanelVisible ? 'Control Panel (Active) - Click to minimize' : 'Summon Control Panel to Top'}
        aria-label="Control Panel"
        className={`w-12 h-12 flex-shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all relative mb-1.5 ${
          isControlPanelVisible
            ? 'bg-pink-100 text-pink-700 shadow-xs font-bold border border-pink-300 ring-2 ring-pink-400/20'
            : 'text-gray-400 hover:bg-pink-50 hover:text-pink-600 border border-transparent'
        }`}
      >
        <Radio className={`w-5 h-5 ${isControlPanelVisible ? 'text-pink-600 animate-pulse' : ''}`} />
        <span className="text-[8px] leading-none font-semibold">Control</span>
        {/* Status indicator dot or badge */}
        {systemStatus?.isWebsiteOff ? (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white animate-ping" />
        ) : totalDrafts > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[15px] h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-white shadow-2xs">
            {totalDrafts}
          </span>
        ) : (
          <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
        )}
      </button>

      <div className="w-8 h-px bg-pink-200/60 mb-1.5 flex-shrink-0" />

      {/* Nav items */}
      <div className="flex-1 flex flex-col items-center gap-1 w-full overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
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
        onClick={requestLogout}
        disabled={isLoggingOut}
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-colors mt-2"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </nav>

    <nav
      className={`cn-bakery-mobile-nav ${logoutConfirmationOpen ? '!z-30 pointer-events-none' : ''}`}
      style={logoutConfirmationOpen ? { zIndex: 30 } : undefined}
      aria-label="Bakery mobile navigation"
    >
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
          <div className="p-2 border-b border-gray-100">
            <button
              type="button"
              onClick={() => {
                toggleControlPanel();
                setMoreOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isControlPanelVisible ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700 hover:bg-pink-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-pink-600" />
                <span>Control Panel & Monitoring</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white font-bold border border-pink-200">
                {isControlPanelVisible ? 'Active' : 'Summon'}
              </span>
            </button>
          </div>
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
          <button type="button" className="cn-bakery-mobile-logout" onClick={() => { setMoreOpen(false); requestLogout(); }} disabled={isLoggingOut}><LogOut /> Log out</button>
        </section>
      </div>
    )}
    <LogoutConfirmation open={logoutConfirmationOpen} onOpenChange={changeLogoutConfirmation} onConfirm={handleLogout} pending={isLoggingOut} />
    </>
  );
}
