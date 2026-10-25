import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Clock,
  LayoutTemplate,
  LogOut,
  MessageSquare,
  Plus,
  Receipt,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import useLogout from '@/hooks/useLogout';
import LogoutConfirmation from '@/components/shared/LogoutConfirmation';

const primaryItems = [
  { to: '/client', icon: Clock, label: 'Recents' },
  { to: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/trash', icon: Trash2, label: 'Trash' },
];

function NavItem({ to, icon: Icon, label, currentPath }) {
  const active = currentPath === to;
  return (
    <Link
      to={to}
      className={`cn-nav-item ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      title={label}
    >
      <Icon className="w-6 h-6 stroke-[1.85]" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export default function ClientNavbar() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const menuRef = useRef(null);
  const { handleLogout, requestLogout, isLoggingOut, logoutConfirmationOpen, changeLogoutConfirmation } = useLogout();
  const location = useLocation();
  const { user, account } = useAuth();

  const providerPhoto = (user?.providerData || []).find((p) => p?.photoURL)?.photoURL;
  const photoURL = user?.photoURL || providerPhoto || account?.photoURL || null;
  const displayName = account?.displayName || user?.displayName || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Cake Lover';
  const userEmail = account?.email || user?.email || 'user@example.com';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'C';

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setUserDropdownOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);


  return (
    <nav
      className={`cn-sidebar ${logoutConfirmationOpen ? '!z-30 pointer-events-none' : ''}`}
      style={logoutConfirmationOpen ? { zIndex: 30 } : undefined}
      aria-label="Client navigation"
    >
      <Link to="/client" className="cn-sidebar-brand" aria-label="CakeNMake dashboard">
        <span>C</span><span className="is-accent">N</span><span>M</span>
      </Link>

      <div className="cn-sidebar-list">
        <Link to="/designer" className="cn-nav-item cn-create-item" title="Create a cake">
          <Plus className="w-6 h-6 stroke-[2.4]" aria-hidden="true" />
          <span>Create</span>
        </Link>

        {primaryItems.map((item) => (
          <NavItem key={item.to} {...item} currentPath={location.pathname} />
        ))}

        <div className="cn-nav-spacer" />

        <NavItem to="/chats" icon={MessageSquare} label="Chats" currentPath={location.pathname} />

        <div className="cn-user-menu" ref={menuRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen((open) => !open)}
            className={`cn-nav-item cn-account-item ${location.pathname === '/profile' ? 'is-active' : ''}`}
            aria-expanded={userDropdownOpen}
            aria-haspopup="menu"
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 stroke-[1.85]" aria-hidden="true" />
            )}
            <span>Account</span>
          </button>

          {userDropdownOpen && (
            <div className="cn-user-popover" role="menu">
              <div className="cn-user-summary">
                <div className="cn-user-summary-avatar" aria-hidden="true">
                  {photoURL ? (
                    <img src={photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="cn-user-summary-text">
                  <p>{displayName}</p>
                  <span>{userEmail}</span>
                </div>
              </div>
              <div className="cn-user-popover-links">
                <Link
                  to="/profile"
                  role="menuitem"
                  aria-current={location.pathname === '/profile' ? 'page' : undefined}
                  className={location.pathname === '/profile' ? 'is-current' : undefined}
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <User className="w-4 h-4" /> Profile
                </Link>
              </div>
              <div className="cn-user-popover-footer">
                <button
                  type="button"
                  role="menuitem"
                  className="cn-logout-btn"
                  onClick={() => { setUserDropdownOpen(false); requestLogout(); }}
                  disabled={isLoggingOut}
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <LogoutConfirmation open={logoutConfirmationOpen} onOpenChange={changeLogoutConfirmation} onConfirm={handleLogout} pending={isLoggingOut} />
    </nav>
  );
}
