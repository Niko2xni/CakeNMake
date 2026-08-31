import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { CheckCircle2, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { auth, firebaseConfigured } from "@/lib/firebase";

export default function LoginSuccess() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const finishSignIn = async () => {
      if (!firebaseConfigured || !auth) {
        setError("Firebase is not configured for this app.");
        return;
      }

      if (!isSignInWithEmailLink(auth, window.location.href)) {
        navigate("/client", { replace: true });
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
        navigate("/client", { replace: true });
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
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-label="Signing in" />
      )}
    </AuthLayout>
  );
}
