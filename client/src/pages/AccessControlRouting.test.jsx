import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import { useAuth } from '@/lib/AuthContext';

const mockSession = vi.hoisted(() => ({
  account: null,
  isAuthenticated: false,
  isLoadingAuth: false,
  authChecked: true,
  authError: null,
  checkUserAuth: vi.fn(),
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockSession,
}));

// Dummy component representations
const LandingDummy = () => <div>Landing Page</div>;
const GuestDesignerDummy = () => {
  const { account, isAuthenticated, isLoadingAuth } = useAuth();
  if (!isLoadingAuth && isAuthenticated && account) {
    if (account.role === 'customer') {
      return <Navigate to="/designer" replace />;
    }
    if (['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role)) {
      return <Navigate to="/bakery/orders" replace />;
    }
  }
  return <div>Guest Designer Page</div>;
};
const OriginalDesignerDummy = () => <div>Original Designer Workspace</div>;
const ClientHomeDummy = () => <div>Client Home Dashboard</div>;
const BakeryOrdersDummy = () => <div>Bakery Orders Dashboard</div>;
const LoginDummy = () => {
  const { account, isAuthenticated, isLoadingAuth } = useAuth();
  if (!isLoadingAuth && isAuthenticated && account) {
    const isBakery = ['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role);
    return <Navigate to={isBakery ? '/bakery/orders' : '/client'} replace />;
  }
  return <div>Login Page</div>;
};

function TestApp({ initialEntry = '/' }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<LandingDummy />} />
        <Route path="/guest-designer" element={<GuestDesignerDummy />} />
        <Route path="/login" element={<LoginDummy />} />

        {/* Original designer workspace: only logged in client accounts can access */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/guest-designer" replace />} />}>
          <Route element={<RoleRoute allowedRoles={['customer']} fallbackPath="/bakery/orders" />}>
            <Route path="/designer" element={<OriginalDesignerDummy />} />
          </Route>
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          {/* Customer only */}
          <Route element={<RoleRoute allowedRoles={['customer']} fallbackPath="/bakery/orders" />}>
            <Route path="/client" element={<ClientHomeDummy />} />
          </Route>

          {/* Bakery staff / admin only */}
          <Route element={<RoleRoute allowedRoles={['bakery_staff', 'bakery_admin', 'platform_admin']} fallbackPath="/client" />}>
            <Route path="/bakery" element={<Navigate to="/bakery/orders" replace />} />
            <Route path="/bakery/orders" element={<BakeryOrdersDummy />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Access Control and Routing Specifications', () => {
  beforeEach(() => {
    Object.assign(mockSession, {
      account: null,
      isAuthenticated: false,
      isLoadingAuth: false,
      authChecked: true,
      authError: null,
    });
  });

  describe('Unauthenticated Guest Users', () => {
    it('allows guest to access guest designer page', () => {
      render(<TestApp initialEntry="/guest-designer" />);
      expect(screen.getByText('Guest Designer Page')).toBeInTheDocument();
    });

    it('redirects guest accessing original designer to guest designer page', () => {
      render(<TestApp initialEntry="/designer" />);
      expect(screen.getByText('Guest Designer Page')).toBeInTheDocument();
      expect(screen.queryByText('Original Designer Workspace')).not.toBeInTheDocument();
    });

    it('redirects guest accessing /client to /login', () => {
      render(<TestApp initialEntry="/client" />);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Client Home Dashboard')).not.toBeInTheDocument();
    });

    it('redirects guest accessing /bakery to /login', () => {
      render(<TestApp initialEntry="/bakery" />);
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Bakery Orders Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Logged-in Client Accounts (customer)', () => {
    beforeEach(() => {
      Object.assign(mockSession, {
        account: { id: 'user-1', role: 'customer', displayName: 'Jane Client' },
        isAuthenticated: true,
      });
    });

    it('allows logged-in client account to access original designer page', () => {
      render(<TestApp initialEntry="/designer" />);
      expect(screen.getByText('Original Designer Workspace')).toBeInTheDocument();
    });

    it('redirects logged-in client account accessing guest designer to original designer', () => {
      render(<TestApp initialEntry="/guest-designer" />);
      expect(screen.getByText('Original Designer Workspace')).toBeInTheDocument();
      expect(screen.queryByText('Guest Designer Page')).not.toBeInTheDocument();
    });

    it('allows logged-in client account to access /client', () => {
      render(<TestApp initialEntry="/client" />);
      expect(screen.getByText('Client Home Dashboard')).toBeInTheDocument();
    });

    it('blocks logged-in client account from bakery admin routes and redirects to /client', () => {
      render(<TestApp initialEntry="/bakery/orders" />);
      expect(screen.getByText('Client Home Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Bakery Orders Dashboard')).not.toBeInTheDocument();
    });

    it('redirects logged-in client account from /login to /client', () => {
      render(<TestApp initialEntry="/login" />);
      expect(screen.getByText('Client Home Dashboard')).toBeInTheDocument();
    });
  });

  describe('Logged-in Bakery Admin Accounts', () => {
    beforeEach(() => {
      Object.assign(mockSession, {
        account: { id: 'admin-1', role: 'bakery_admin', displayName: 'Bakery Admin' },
        isAuthenticated: true,
      });
    });

    it('allows bakery admin account to access bakery admin routes', () => {
      render(<TestApp initialEntry="/bakery/orders" />);
      expect(screen.getByText('Bakery Orders Dashboard')).toBeInTheDocument();
    });

    it('blocks bakery admin account from client routes and redirects to /bakery/orders', () => {
      render(<TestApp initialEntry="/client" />);
      expect(screen.getByText('Bakery Orders Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Client Home Dashboard')).not.toBeInTheDocument();
    });

    it('blocks bakery admin account from original designer and redirects to /bakery/orders', () => {
      render(<TestApp initialEntry="/designer" />);
      expect(screen.getByText('Bakery Orders Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Original Designer Workspace')).not.toBeInTheDocument();
    });

    it('redirects bakery admin account from guest designer to /bakery/orders', () => {
      render(<TestApp initialEntry="/guest-designer" />);
      expect(screen.getByText('Bakery Orders Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Guest Designer Page')).not.toBeInTheDocument();
    });

    it('redirects bakery admin account from /login to /bakery/orders', () => {
      render(<TestApp initialEntry="/login" />);
      expect(screen.getByText('Bakery Orders Dashboard')).toBeInTheDocument();
    });
  });
});
