import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Loader2, Mail, TimerReset } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { auth, firebaseConfigured, getAuxiliaryAuth, googleProvider, missingFirebaseConfigMessage } from "@/lib/firebase";
import { signInWithCustomToken, signInWithPopup, signOut } from "firebase/auth";
import { authApi } from "@/services/api";
import { useAuth } from '@/lib/AuthContext';

const providerOptions = [
  { id: "google", label: "Continue with Google", icon: GoogleIcon },
];

export default function Login() {
  const navigate = useNavigate();
  const { account, isAuthenticated, isLoadingAuth, authError } = useAuth();
  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated || !account) return;
    navigate(['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role) ? '/bakery/orders' : '/client', { replace: true });
  }, [account, isAuthenticated, isLoadingAuth, navigate]);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [otpExpiredMessage, setOtpExpiredMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const isOtpActive = otpSent && otpTimeLeft > 0;

  const formatTimeLeft = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpTimeLeft(0);
      return undefined;
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setOtpTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        setOtp("");
        setOtpExpiresAt(null);
        setOtpTimeLeft(0);
        setOtpExpiredMessage("OTP expired");
        setStatusMessage("Please request a new code to continue.");
        setError("");
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAt]);

  useEffect(() => {
    if (!isOtpActive) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "Your OTP is still active. Leaving now will expire the code and reset your sign-in progress.";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isOtpActive]);

  const verifyCode = async (codeToVerify) => {
    const targetCode = String(codeToVerify || otp || "").trim();
    if (loading) return;
    setError("");
    setStatusMessage("");
    setOtpExpiredMessage("");
    setLoading(true);

    try {
      if (!otpExpiresAt || Date.now() >= otpExpiresAt || otpTimeLeft <= 0) {
        setOtp("");
        setOtpExpiresAt(null);
        setOtpTimeLeft(0);
        setOtpExpiredMessage("OTP expired");
        setStatusMessage("Please request a new code to continue.");
        setError("Your verification code expired. Please request a new code.");
        return;
      }

      if (!/^\d{6}$/.test(targetCode)) throw new Error("Enter the 6-digit verification code.");
      const { token } = await authApi.verifyEmailOtp(email.trim().toLowerCase(), targetCode);
      if (!firebaseConfigured || !auth) throw new Error(missingFirebaseConfigMessage);
      await signInWithCustomToken(auth, token);
      navigate("/login-success");
    } catch (authError) {
      setError(authError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6 && !loading && otpSent && otpTimeLeft > 0) {
      verifyCode(cleaned);
    }
  };

  const requestNewOtp = async () => {
    setError("");
    setStatusMessage("");
    setOtpExpiredMessage("");
    setOtp("");
    setLoading(true);

    try {
      const targetEmail = email.trim().toLowerCase();
      if (!targetEmail) throw new Error("Email address is missing.");
      const response = await authApi.requestEmailOtp(targetEmail);
      const expiresAt = response?.expiresAt || Date.now() + 3 * 60 * 1000;
      setOtpSent(true);
      setOtpExpiresAt(expiresAt);
      setStatusMessage(`A new 6-digit verification code was sent to ${targetEmail}.`);
    } catch (authError) {
      setError(authError.message || "Could not resend the verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!otpSent) {
      setError("");
      setStatusMessage("");
      setOtpExpiredMessage("");
      setLoading(true);

      try {
        if (!email) throw new Error("Enter your email address.");
        const targetEmail = email.trim().toLowerCase();
        const response = await authApi.requestEmailOtp(targetEmail);
        const expiresAt = response?.expiresAt || Date.now() + 3 * 60 * 1000;
        setOtpSent(true);
        setOtpExpiresAt(expiresAt);
        setStatusMessage(`A 6-digit verification code was sent to ${targetEmail}.`);
        setError("");
      } catch (authError) {
        setError(authError.message || "Authentication failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    await verifyCode(otp);
  };

  const handleProviderAuth = async () => {
    setError("");
    setStatusMessage("");
    setOtpExpiredMessage("");
    setLoading(true);
    try {
      if (!firebaseConfigured || !auth) throw new Error(missingFirebaseConfigMessage);
      const targetAuth = getAuxiliaryAuth ? getAuxiliaryAuth() : auth;
      await signInWithPopup(targetAuth || auth, googleProvider);
      navigate("/login-success");
    } catch (authError) {
      let message = "Provider sign-in failed.";
      if (authError.code === "auth/popup-closed-by-user") {
        message = "Sign-in was cancelled. You can also sign in with your email below.";
      } else if (authError.code === "auth/popup-blocked") {
        message = "Popup was blocked by your browser. Please allow popups or use email sign-in below.";
      } else if (authError.code === "auth/cancelled-popup-request") {
        message = "Only one sign-in request can be active at a time.";
      } else if (authError.message) {
        message = authError.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout icon={null} title="Welcome back" subtitle="Choose how you'd like to sign in">
      {!otpSent && (
        <>
          <div className="space-y-3 mb-6">
            {providerOptions.map(({ id, label, icon: Icon }) => (
              <Button key={id} variant="outline" className="w-full h-12 text-sm font-medium justify-start" onClick={handleProviderAuth} type="button" disabled={loading}>
                <Icon className="w-5 h-5 mr-2" />
                {label}
              </Button>
            ))}
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="cn-auth-divider-label px-3 text-muted-foreground">or</span></div>
          </div>
        </>
      )}

      {(error || authError?.message) && <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error || authError.message}</div>}
      {otpExpiredMessage && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-200">
          {otpExpiredMessage}
        </div>
      )}
      {statusMessage && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!otpSent && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 h-12" required disabled={loading && otpSent} />
            </div>
          </div>
        )}

        {otpSent && (
          <div className="space-y-3">
            <div className="flex justify-start -ml-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cn-auth-back-btn h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setEmail("");
                  setOtpExpiresAt(null);
                  setOtpTimeLeft(0);
                  setStatusMessage("");
                  setError("");
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label>Verification code</Label>
              {otpExpiresAt && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-black whitespace-nowrap">
                  <TimerReset className="w-3.5 h-3.5 text-black" />
                  {formatTimeLeft(otpTimeLeft)}
                </div>
              )}
            </div>
            <div className="w-full flex justify-center">
              <InputOTP
                aria-label="Verification code"
                containerClassName="w-full justify-center"
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                onComplete={(val) => {
                  const cleaned = String(val || "").replace(/\D/g, "").slice(0, 6);
                  if (cleaned.length === 6 && !loading && otpSent && otpTimeLeft > 0) {
                    verifyCode(cleaned);
                  }
                }}
                disabled={loading || otpTimeLeft <= 0}
                autoFocus
                autoComplete="one-time-code"
              >
                <InputOTPGroup className="cn-auth-otp-group w-full gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="cn-auth-otp-slot h-12 rounded-xl text-base font-semibold shadow-sm"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="button"
              variant="outline"
              className="cn-auth-resend w-full h-10 text-sm font-medium disabled:cursor-not-allowed"
              onClick={requestNewOtp}
              disabled={loading || otpTimeLeft > 0}
            >
              Resend OTP
            </Button>
          </div>
        )}

        <Button
          type="submit"
          className="cn-auth-submit w-full h-12 font-medium"
          disabled={loading || (otpSent && (otp.length !== 6 || otpTimeLeft <= 0))}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {otpSent ? "Verifying..." : "Logging in..."}
            </>
          ) : otpSent ? (
            "Verify"
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
