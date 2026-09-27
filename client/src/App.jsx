import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import ScrollToTop from './components/ScrollToTop';
import DesignerWorkSpace from '@/pages/DesignerWorkSpace';
import Designer from '@/pages/Designer';
import Landing from '@/pages/Landing';
import ClientHome from '@/pages/Client/Home';
import Profile from '@/pages/Client/Profile';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import LoginSuccess from '@/pages/LoginSuccess';
import Templates from '@/pages/Client/Templates';
import CakeAI from '@/pages/Client/CakeAI';
import Trash from '@/pages/Client/Trash';
import Chats from '@/pages/Client/Chats';
import BakeryAdminLayout from '@/pages/BakeryAdmin/BakeryAdminLayout';
import BakeryDashboard from '@/pages/BakeryAdmin/BakeryDashboard';
import BakeryPricing from '@/pages/BakeryAdmin/BakeryPricing';
import BakeryReservations from '@/pages/BakeryAdmin/BakeryReservations';
import BakeryTransactions from '@/pages/BakeryAdmin/BakeryTransactions';
import BakeryChat from '@/pages/BakeryAdmin/BakeryChat';
import BakeryAssets from '@/pages/BakeryAdmin/BakeryAssets';
import BakeryBilling from '@/pages/BakeryAdmin/BakeryBilling';
import BakeryBlueprints from '@/pages/BakeryAdmin/BakeryBlueprints';
import BakeryProfile from '@/pages/BakeryAdmin/BakeryProfile';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-pink-50">
        <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/designer" element={<DesignerWorkSpace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/login-success" element={<LoginSuccess />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/client" element={<ClientHome />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/cake-ai" element={<CakeAI />} />
        <Route path="/trash" element={<Trash />} />
        <Route path="/chats" element={<Chats />} />

        <Route element={<RoleRoute allowedRoles={['bakery_staff', 'bakery_admin', 'platform_admin']} />}>
          <Route path="/bakery" element={<BakeryAdminLayout />}>
            <Route index element={<BakeryDashboard />} />
            <Route path="reservations" element={<BakeryReservations />} />
            <Route path="pricing" element={<BakeryPricing />} />
            <Route path="transactions" element={<BakeryTransactions />} />
            <Route path="chats" element={<BakeryChat />} />
            <Route path="assets" element={<BakeryAssets />} />
            <Route path="billing" element={<BakeryBilling />} />
            <Route path="blueprints" element={<BakeryBlueprints />} />
            <Route path="profile" element={<BakeryProfile />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
