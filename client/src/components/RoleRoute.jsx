import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleRoute({ allowedRoles, fallbackPath }) {
  const { account } = useAuth();

  if (!account || !allowedRoles.includes(account.role)) {
    const isBakery = account && ['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role);
    const destination = fallbackPath || (isBakery ? '/bakery/orders' : '/client');
    return <Navigate to={destination} replace />;
  }

  const feeEnabled = import.meta.env.VITE_REGISTRATION_FEE_ENABLED !== 'false';
  if (feeEnabled && account.role === 'customer' && account.registrationFee?.isPaid === false) {
    return <Navigate to="/activate-account" replace />;
  }

  return <Outlet />;
}
