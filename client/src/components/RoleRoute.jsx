import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleRoute({ allowedRoles }) {
  const { account } = useAuth();

  if (!account || !allowedRoles.includes(account.role)) {
    return <Navigate to="/client" replace />;
  }

  return <Outlet />;
}
