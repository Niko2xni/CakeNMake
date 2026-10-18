import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Loader2, LogIn, Mail, Sparkles, TimerReset } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";
import { auth, firebaseConfigured, missingFirebaseConfigMessage } from "@/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { redirectToGoogleOAuth } from "@/lib/googleAuth";
import { authApi } from "@/services/api";
import { useAuth } from '@/lib/AuthContext';

const providerOptions = [
  { id: "google", label: "Continue with Google", icon: GoogleIcon },
];

export default function GuestAuthModal({
  isOpen,
  onClose,
  actionType = "general", // 'save' | 'order' | 'general'
  onSuccess,
  initialEmail = "",
  initialExpiresAt = null,
}) {
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    if (!isOpen || !pendingUser || isLoadingAuth) return;
    if (authError) {
      setError(authError.message || 'Your account could not be loaded. Please try again.');
      setPendingUser(null);
    } else if (isAuthenticated) {
      setPendingUser(null);
      onClose();
      onSuccess?.(pendingUser);
    }
  }, [isOpen, pendingUser, isLoadingAuth, authError, isAuthenticated, onClose, onSuccess]);

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

  useEffect(() => {
    if (!isOpen) {
      setPendingUser(null);
      setEmail("");
      setOtp("");
      setOtpSent(false);
      setError("");
      setStatusMessage("");
      setOtpExpiredMessage("");
      setLoading(false);
      setOtpExpiresAt(null);
      setOtpTimeLeft(0);
    } else if (initialEmail && !otpSent) {
      const cleanEmail = initialEmail.trim().toLowerCase();
      setEmail(cleanEmail);
      if (initialExpiresAt) {
        setOtp("");
        setOtpSent(true);
        setOtpExpiresAt(initialExpiresAt);
        setStatusMessage(`A 6-digit verification code was sent to ${cleanEmail}.`);
        setError("");
      } else {
        setLoading(true);
        authApi.requestEmailOtp(cleanEmail)
          .then((response) => {
            const expiresAt = response?.expiresAt || Date.now() + 3 * 60 * 1000;
            setOtp("");
            setOtpSent(true);
            setOtpExpiresAt(expiresAt);
            setStatusMessage(`A 6-digit verification code was sent to ${cleanEmail}.`);
            setError("");
          })
          .catch((err) => {
            setError(err.message || "Could not send verification code.");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [isOpen, initialEmail, initialExpiresAt]);

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

  // Warn if leaving while OTP is counting down
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
    if (loading || Boolean(pendingUser)) return;
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
      const cleanEmail = email.trim().toLowerCase();
      const { token } = await authApi.verifyEmailOtp(cleanEmail, targetCode);
      if (!firebaseConfigured || !auth) throw new Error(missingFirebaseConfigMessage);
      const userCredential = await signInWithCustomToken(auth, token);
      setPendingUser(userCredential.user);
    } catch (authError) {
      setError(authError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6 && !loading && !pendingUser && otpSent && otpTimeLeft > 0) {
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
    if (loading || Boolean(pendingUser)) return;

    if (!otpSent) {
      setError("");
      setStatusMessage("");
      setOtpExpiredMessage("");
      setLoading(true);

      try {
        if (!email) throw new Error("Enter your email address.");
        const cleanEmail = email.trim().toLowerCase();
        const response = await authApi.requestEmailOtp(cleanEmail);
        const expiresAt = response?.expiresAt || Date.now() + 3 * 60 * 1000;
        setOtpSent(true);
        setOtpExpiresAt(expiresAt);
        setStatusMessage(`A 6-digit verification code was sent to ${cleanEmail}.`);
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

  const handleProviderAuth = () => {
    setError("");
    setStatusMessage("");
    setOtpExpiredMessage("");
    setLoading(true);
    try {
      const returnPath = '/designer' + (actionType === 'order' ? '?action=order' : '');
      redirectToGoogleOAuth(returnPath);
    } catch (authError) {
      setError(authError.message || "Provider sign-in failed.");
      setLoading(false);
    }
  };

  const modalTitle = actionType === "save"
    ? "Sign in to save your design"
    : actionType === "order"
    ? "Sign in to send to bakery"
    : "Sign in to continue";

  const modalDescription = actionType === "save"
    ? "Create a free account or log in to save this cake design to your personal collection."
    : actionType === "order"
    ? "Log in or sign up to finalize your order and send your design directly to our bakery."
    : "Log in or sign up with your account. Your custom cake design will be preserved.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl">
        <DialogHeader className="space-y-2 text-center items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-center">
            {modalTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center">
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        {!otpSent && (
          <>
            <div className="space-y-2.5 my-3">
              {providerOptions.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant="outline"
                  className="w-full h-11 text-sm font-medium justify-start gap-3 rounded-xl border-border/80 hover:bg-accent"
                  onClick={handleProviderAuth}
                  type="button"
                  disabled={loading || Boolean(pendingUser)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium">or continue with email</span>
              </div>
            </div>
          </>
        )}

        {pendingUser && <p role="status" className="my-2 text-sm text-muted-foreground">Loading your account…</p>}
        {error && (
          <div role="alert" className="my-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
            {error}
          </div>
        )}
        {otpExpiredMessage && (
          <div className="my-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs border border-amber-200">
            {otpExpiredMessage}
          </div>
        )}
        {statusMessage && (
          <div className="my-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!otpSent && (
            <div className="space-y-2">
              <Label htmlFor="guest-auth-email" className="text-xs font-semibold">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="guest-auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10 h-11 rounded-xl"
                  required
                  disabled={loading && otpSent}
                />
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
                <Label className="text-xs font-semibold">Verification code</Label>
                {otpExpiresAt && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground whitespace-nowrap">
                    <TimerReset className="w-3.5 h-3.5" />
                    {formatTimeLeft(otpTimeLeft)}
                  </div>
                )}
              </div>
              <div className="w-full flex justify-center py-2">
                <InputOTP
                  aria-label="Verification code"
                  containerClassName="w-full justify-center"
                  maxLength={6}
                  value={otp}
                  onChange={handleOtpChange}
                  onComplete={(val) => {
                    const cleaned = String(val || "").replace(/\D/g, "").slice(0, 6);
                    if (cleaned.length === 6 && !loading && !pendingUser && otpSent && otpTimeLeft > 0) {
                      verifyCode(cleaned);
                    }
                  }}
                  disabled={loading || Boolean(pendingUser) || otpTimeLeft <= 0}
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
                className="w-full h-9 text-xs font-medium rounded-xl disabled:cursor-not-allowed"
                onClick={requestNewOtp}
                disabled={loading || Boolean(pendingUser) || otpTimeLeft > 0}
              >
                Resend OTP
              </Button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-semibold rounded-xl"
            disabled={loading || Boolean(pendingUser) || (otpSent && (otp.length !== 6 || otpTimeLeft <= 0))}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {otpSent ? "Verifying..." : "Logging in..."}
              </>
            ) : otpSent ? (
              "Verify and log in"
            ) : actionType === "general" ? (
              "Log in"
            ) : (
              "Send OTP"
            )}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Your current 3D cake design will be preserved automatically.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
