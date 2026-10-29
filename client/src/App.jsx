import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PageLoadingSkeleton from '@/components/shared/PageLoadingSkeleton';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import ScrollToTop from './components/ScrollToTop';
import DesignerWorkSpace from '@/pages/DesignerWorkSpace';
import Designer from '@/pages/Designer';
import Landing from '@/pages/Landing';
import ClientHome from '@/pages/Client/Home';
import Profile from '@/pages/Client/Profile';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import LoginSuccess from '@/pages/LoginSuccess';
import GoogleCallback from '@/pages/GoogleCallback';
import Templates from '@/pages/Client/Templates';
import Transactions from '@/pages/Client/Transactions';
import CakeAI from '@/pages/Client/CakeAI';
import Trash from '@/pages/Client/Trash';
import Chats from '@/pages/Client/Chats';
import BakeryAdminLayout from '@/pages/BakeryAdmin/BakeryAdminLayout';
import BakeryPricing from '@/pages/BakeryAdmin/BakeryPricing';
import BakeryOrders from '@/pages/BakeryAdmin/BakeryOrders';
import BakeryChatsSection from '@/pages/BakeryAdmin/BakeryChatsSection';
import CustomerSupport from '@/pages/Client/Support';
import CustomerRestrictionNotice from '@/components/shared/CustomerRestrictionNotice';
import BakeryBilling from '@/pages/BakeryAdmin/BakeryBilling';
import BakeryBlueprints from '@/pages/BakeryAdmin/BakeryBlueprints';
import BakeryTemplates from '@/pages/BakeryAdmin/BakeryTemplates';
import BakeryDesigner from '@/pages/BakeryAdmin/BakeryDesigner';
import BakeryProfile from '@/pages/BakeryAdmin/BakeryProfile';
import BakeryEmployees from '@/pages/BakeryAdmin/BakeryEmployees';
import ClientAccessGuard from '@/components/shared/ClientAccessGuard';
import ClientUpdateAdvanceWarning from '@/components/shared/ClientUpdateAdvanceWarning';
import { BakeryControlPanelProvider } from '@/context/BakeryControlPanelContext';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, authChecked, isLoadingPublicSettings, authError, navigateToLogin, retryAccountSync } = useAuth();

  // Keep the active route's layout visible while public settings or auth load.
  if (isLoadingPublicSettings || (isLoadingAuth && !authChecked)) {
    return <PageLoadingSkeleton />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  if (user && (authError || isLoadingAuth)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <section role="alert" className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center shadow-lg">
          <h1 className="text-lg font-semibold">Reconnecting to your account</h1>
          <p className="text-sm text-muted-foreground">
            Your sign-in is still active, but CakeNMake could not load your account. We’ll keep trying automatically.
          </p>
          {authError?.message && <p className="text-xs text-muted-foreground">{authError.message}</p>}
          <button
            type="button"
            onClick={retryAccountSync}
            disabled={isLoadingAuth}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isLoadingAuth ? 'Retrying…' : 'Retry now'}
          </button>
        </section>
      </main>
    );
  }

  if (authError?.type === 'auth_required') {
    navigateToLogin();
    return null;
  }

  // Render the main app
  return (
    <ClientAccessGuard>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/guest-designer" element={<Designer />} />

        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        {/* Original designer workspace: only logged in client accounts can access */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/guest-designer" replace />} />}>
          <Route element={<RoleRoute allowedRoles={['customer']} fallbackPath="/bakery/orders" />}>
            <Route path="/designer" element={<DesignerWorkSpace />} />
          </Route>
        </Route>

        {/* Protected client and bakery routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          {/* Only client accounts can access customer routes */}
          <Route element={<RoleRoute allowedRoles={['customer']} fallbackPath="/bakery/orders" />}>
            <Route path="/client" element={<ClientHome />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/cake-ai" element={<CakeAI />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/chats" element={<Chats />} />
            <Route path="/support" element={<CustomerSupport />} />
          </Route>

          {/* Only bakery admin / staff accounts can access bakery admin routes */}
          <Route element={<RoleRoute allowedRoles={['bakery_staff', 'bakery_admin', 'platform_admin']} fallbackPath="/client" />}>
            <Route
              element={
                <BakeryControlPanelProvider>
                  <Outlet />
                </BakeryControlPanelProvider>
              }
            >
              <Route path="/bakery/designer" element={<BakeryDesigner />} />
              <Route path="/bakery" element={<BakeryAdminLayout />}>
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<BakeryOrders />} />
                <Route path="reservations" element={<Navigate to="/bakery/orders" replace />} />
                <Route path="pricing" element={<BakeryPricing />} />
                <Route path="templates" element={<BakeryTemplates />} />
                <Route path="transactions" element={<Navigate to="/bakery/orders?tab=payments" replace />} />
                <Route path="chats" element={<BakeryChatsSection />} />
                <Route path="assets" element={<Navigate to="/bakery/orders" replace />} />
                <Route path="billing" element={<BakeryBilling />} />
                <Route path="employees" element={<BakeryEmployees />} />
                <Route path="blueprints" element={<BakeryBlueprints />} />
                <Route path="profile" element={<BakeryProfile />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </ClientAccessGuard>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
          <CustomerRestrictionNotice />
          <ClientUpdateAdvanceWarning />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
