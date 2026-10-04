import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AuthLayout from "@/components/AuthLayout";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { useAuth } from '@/lib/AuthContext';

export default function LoginSuccess() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { account, isAuthenticated, isLoadingAuth, authError } = useAuth();
  useEffect(() => {
    if (isLoadingAuth) return;
    if (isAuthenticated && account) {
      navigate(['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role) ? '/bakery/orders' : '/client', { replace: true });
    } else if (authError) {
      setError(authError.message || 'Your account could not be loaded. Please try signing in again.');
    } else if (auth && !auth.currentUser && !isSignInWithEmailLink(auth, window.location.href)) {
      navigate('/login', { replace: true });
    }
  }, [account, isAuthenticated, isLoadingAuth, authError, navigate]);

  useEffect(() => {
    const finishSignIn = async () => {
      if (!firebaseConfigured || !auth) {
        setError("Firebase is not configured for this app.");
        return;
      }

      if (!isSignInWithEmailLink(auth, window.location.href)) {
        return;
      }

      const email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        setError("Please return to the login page and request a new sign-in link.");
        return;
      }

      try {
        await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem("emailForSignIn");
      } catch (signInError) {
        setError(signInError.message || "This sign-in link is no longer valid.");
      }
    };

    finishSignIn();
  }, [navigate]);

  return (
    <AuthLayout icon={CheckCircle2} title="Signing you in" subtitle="Please wait a moment">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div role="status" aria-label="Signing you in" className="space-y-3">
          <Skeleton className="mx-auto h-10 w-10 rounded-full" />
          <Skeleton className="mx-auto h-4 w-40" />
          <Skeleton className="mx-auto h-3 w-56 max-w-full" />
        </div>
      )}
    </AuthLayout>
  );
}
