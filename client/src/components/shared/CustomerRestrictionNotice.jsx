import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { activeRestriction, philippineTime } from '@/lib/moderation';

export default function CustomerRestrictionNotice() {
  const { account } = useAuth();
  const location = useLocation();
  const restriction = activeRestriction(account);
  if (!restriction || location.pathname === '/support') return null;
  return <aside role="status" className="fixed z-[90] top-2 left-2 right-2 md:left-24 mx-auto max-w-3xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm shadow-lg text-amber-950">
    <strong>Account {restriction.type}</strong>: {restriction.reason}
    <p>Chatting and new orders are unavailable. {restriction.type === 'suspended' && <>Ends {philippineTime(restriction.expiresAt)} (Philippine time). </>}
      <Link to="/support" className="font-semibold underline">View existing orders, appeal or contact the bakery</Link>
    </p>
  </aside>;
}
