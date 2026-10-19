import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, FileText, Smartphone, ExternalLink, Lock, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { accountApi } from '@/services/api';
import BusinessComplianceModal from '@/components/shared/BusinessComplianceModal';

function generateRef() {
  return `DEMO-REG-25-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export default function ActivateAccount() {
  const navigate = useNavigate();
  const { account, isAuthenticated, isLoadingAuth, refreshAccount } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [demoRef] = useState(generateRef);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated || !account) {
      navigate('/login', { replace: true });
      return;
    }
    // If staff/admin or already paid, redirect out
    if (['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role)) {
      navigate('/bakery/orders', { replace: true });
      return;
    }
    if (account.registrationFee?.isPaid) {
      navigate('/client', { replace: true });
    }
  }, [account, isAuthenticated, isLoadingAuth, navigate]);

  const handleSimulatedPay = async () => {
    if (!agreed) {
      setError('Please accept the Terms of Service & Registration Policy to continue.');
      return;
    }
    setError('');
    setProcessing(true);

    try {
      // Simulate realistic payment gateway processing delay (1.5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await accountApi.payRegistrationFee({
        paymentReference: demoRef,
        agreedToTerms: true,
        method: 'gcash',
      });

      setSuccess(true);
      await refreshAccount();

      setTimeout(() => {
        navigate('/client', { replace: true });
      }, 1200);
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/60 via-white to-pink-50/30 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-100 text-pink-600 shadow-sm text-2xl mb-3">
            🎂
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Account Activation
          </h1>
          <p className="mt-1.5 text-sm text-gray-600">
            One-time verification fee to unlock your CakeNMake client workspace
          </p>
        </div>

        {/* Main Activation Card */}
        <div className="bg-white rounded-3xl border border-pink-100 shadow-xl overflow-hidden">
          {/* Fee Header Banner */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-5 text-white flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-pink-100">One-Time Registration Fee</p>
              <p className="text-2xl font-extrabold tracking-tight mt-0.5">₱25.00</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white border border-white/30">
                <ShieldCheck size={14} /> Verification Required
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Why Fee is Required */}
            <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 text-xs text-gray-700 leading-relaxed space-y-1.5">
              <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-pink-600 shrink-0" />
                Why is there a ₱25 verification fee?
              </p>
              <p>
                To maintain a safe, spam-free platform and prevent troll accounts from abusing our live bakery chat and 3D custom cake reservation pipeline, CakeNMake requires a nominal one-time verification fee for all customer accounts.
              </p>
            </div>

            {/* Bakery Legitimacy & Compliance Card */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-pink-700">
                    <FileText size={16} />
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    Verified Bakery Partner
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> DTI &amp; BIR Registered
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200/70 text-gray-600">
                <div>
                  <span className="block text-[11px] text-gray-400">Operating Bakery</span>
                  <span className="font-semibold text-gray-900">AH TINAPS BAKESHOP</span>
                </div>
                <div>
                  <span className="block text-[11px] text-gray-400">DTI Registration No.</span>
                  <span className="font-semibold text-gray-900 font-mono">6752278</span>
                </div>
                <div>
                  <span className="block text-[11px] text-gray-400">Tax Identification (TIN)</span>
                  <span className="font-semibold text-gray-900 font-mono">648-577-458-00000</span>
                </div>
                <div>
                  <span className="block text-[11px] text-gray-400">Jurisdiction</span>
                  <span className="font-semibold text-gray-900">Philippines</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCompliance(true)}
                className="mt-1 text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>View Official DTI &amp; BIR Registration Certificates</span>
                <ExternalLink size={12} />
              </button>
            </div>

            {/* Error Message if any */}
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Terms and Agreement Checkbox */}
            <div className="pt-1">
              <label className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                agreed ? 'border-pink-400 bg-pink-50/30' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-xs text-gray-700 leading-relaxed select-none">
                  <strong className="text-gray-900 block font-medium mb-0.5">
                    I agree to the Terms of Service &amp; Registration Policy
                  </strong>
                  I acknowledge that this one-time ₱25 verification fee establishes authentic account identity, is non-refundable, and unlocks full platform access.
                </span>
              </label>
            </div>

            {/* Payment Trigger Button */}
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                disabled={!agreed || processing || success}
                onClick={() => setShowPaymentModal(true)}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-sm shadow-md shadow-pink-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Smartphone size={17} />
                <span>Pay ₱25 with GCash (Simulated)</span>
              </Button>
              <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1">
                <Lock size={12} />
                Simulated demo checkout — No real funds are deducted
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated GCash Modal */}
      {showPaymentModal && (
        <div role="dialog" aria-modal="true" aria-label="Simulated GCash Payment" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-blue-100">
            {/* GCash Blue Header */}
            <div className="bg-[#007DFE] px-6 py-4 text-white text-center">
              <p className="text-xs font-semibold tracking-wider uppercase text-blue-100">Simulated GCash Checkout</p>
              <p className="text-2xl font-bold mt-1">₱25.00</p>
              <p className="text-[11px] text-blue-100 mt-0.5">CakeNMake Account Verification</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Merchant</span>
                  <span className="font-semibold text-gray-800">AH TINAPS BAKESHOP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-semibold text-gray-800">Account Registration</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-gray-500">Reference No.</span>
                  <span className="font-semibold text-blue-600">{demoRef}</span>
                </div>
              </div>

              {success ? (
                <div className="py-4 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={28} />
                  </div>
                  <p className="text-sm font-bold text-gray-900">Verification Complete!</p>
                  <p className="text-xs text-gray-500">Redirecting to your dashboard…</p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-gray-500 text-center leading-relaxed">
                    This is an educational simulation. Click below to simulate completing the ₱25 verification payment.
                  </p>
                  <Button
                    type="button"
                    disabled={processing}
                    onClick={handleSimulatedPay}
                    className="w-full h-11 rounded-xl bg-[#007DFE] hover:bg-[#006ee0] text-white font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying payment…</span>
                      </>
                    ) : (
                      <span>Confirm Simulated ₱25 Payment</span>
                    )}
                  </Button>
                  {!processing && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DTI & BIR Compliance Modal */}
      <BusinessComplianceModal
        isOpen={showCompliance}
        onClose={() => setShowCompliance(false)}
      />
    </div>
  );
}
