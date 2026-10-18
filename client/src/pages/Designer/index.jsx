import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import DesignerWorkSpace from '@/pages/DesignerWorkSpace';

export default function Designer() {
  const { account, isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  // Logged in users cannot access guest designer page, redirect to customer workspace
  if (!isLoadingAuth && isAuthenticated && account) {
    if (account.role === 'customer') {
      return <Navigate to={`/designer${location.search || ''}`} replace />;
    }
    if (['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role)) {
      return <Navigate to="/bakery/orders" replace />;
    }
  }

  return <DesignerWorkSpace isGuestPage={true} />;
}
