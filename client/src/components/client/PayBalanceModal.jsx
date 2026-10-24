import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { accountApi } from '@/services/api';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);

function generateBalanceRef(amount) {
  return `DEMO-BAL-${amount}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export default function PayBalanceModal({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [demoRef, setDemoRef] = useState('');

  const downAmount = Number(
    transaction?.downPayment?.amount || Math.ceil((transaction?.totalPrice || 0) / 2)
  );
  const total = Number(transaction?.totalPrice || 0);
  const balanceToPay = Number(
    transaction?.remainingBalance != null
      ? transaction.remainingBalance
      : Math.max(0, total - downAmount)
  );

  const prevOpenRef = React.useRef(false);
  const prevTxIdRef = React.useRef(null);

  useEffect(() => {
    const txId = transaction?.id || transaction?._id;
    if (isOpen && (!prevOpenRef.current || prevTxIdRef.current !== txId)) {
      setDemoRef(generateBalanceRef(balanceToPay));
      setPaymentError('');
      setPaymentSuccess(false);
      setIsProcessing(false);
    }
    prevOpenRef.current = isOpen;
    prevTxIdRef.current = txId;
  }, [isOpen, transaction?.id, transaction?._id, balanceToPay]);

  const handlePay = async () => {
    if (!transaction) return;
    setIsProcessing(true);
    setPaymentError('');

    try {
      // Fast simulated delay in test env, authentic 1.2s delay in production
      const delay =
        typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
          ? 10
          : 1200;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const targetId =
        transaction.reservationId ||
        transaction.id ||
        transaction._id ||
        transaction.blueprintId ||
        (typeof transaction.designId === 'object' ? transaction.designId?._id : transaction.designId);

      if (!targetId) {
        throw new Error('Order identifier is missing.');
      }

      const res = await accountApi.payBalance(targetId, {
        method: 'gcash',
        paymentReference: demoRef,
      });

      setPaymentSuccess(true);
      if (onSuccess) {
        onSuccess(res, transaction);
      }

      // Automatically close after a moment
      setTimeout(() => {
        setIsProcessing(false);
        setPaymentSuccess(false);
        onClose?.();
      }, 1600);
    } catch (err) {
      console.error('Failed to complete balance payment:', err);
      setPaymentError(err?.message || 'Payment simulation failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog
      open={Boolean(isOpen)}
      onOpenChange={(open) => {
        if (!open && !isProcessing) {
          onClose?.();
        }
      }}
    >
      <DialogContent className="max-w-[540px] w-full p-0 overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-2xl [&>button]:text-white [&>button]:opacity-85 hover:[&>button]:opacity-100 [&>button]:top-4 [&>button]:right-5 focus:[&>button]:ring-white focus:[&>button]:ring-offset-0">
        <div className="flex flex-col">
          {/* PayMongo Demo Header */}
          <div className="bg-[#0040C1] px-6 py-4 flex items-center justify-between text-white relative">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-white/80" />
                <span className="font-bold text-sm tracking-tight">PayMongo demo</span>
              </div>
              <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-0.5 rounded-md text-white/95 tracking-wide whitespace-nowrap">
                Simulated Checkout
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-4.5">
            {paymentSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900">
                  Payment Complete!
                </h3>
                <p className="text-xs text-gray-600 max-w-xs mx-auto">
                  Your balance of <strong>{formatCurrency(balanceToPay)}</strong> has been settled via GCash (Simulated).
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Status switched to In Production!</span>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSuccess(false);
                      onClose?.();
                    }}
                    className="px-6 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base text-gray-900">
                    Complete Cake Balance
                  </h3>
                  <p
                    className="text-xs text-gray-500 mt-1 truncate"
                    title={`Order #${(transaction.id || transaction._id || '').slice(-8).toUpperCase()} • ${transaction.designName}`}
                  >
                    Order #{(transaction.id || transaction._id || '').slice(-8).toUpperCase()} • {transaction.designName}
                  </p>
                </div>

                {/* Financial Breakdown */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Total Cake Price</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Down Payment (Paid 50%)</span>
                    <span className="font-semibold">-{formatCurrency(downAmount)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                    <span>Remaining Balance</span>
                    <span className="text-[#007DFF] font-black text-base">
                      {formatCurrency(balanceToPay)}
                    </span>
                  </div>
                </div>

                {/* GCash Payment Method Option */}
                <div className="border-2 border-[#007DFF] bg-[#007DFF]/5 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#007DFF] flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#007DFF]">GCash</p>
                    <p className="text-[10px] text-gray-500">
                      Demo only • No real GCash account or charge
                    </p>
                  </div>
                  <div className="w-4 h-4 shrink-0 rounded-full border-2 border-[#007DFF] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#007DFF]" />
                  </div>
                </div>

                {/* Demo Reference Code */}
                <div className="bg-gray-100/70 rounded-xl px-3 py-2 text-[11px] text-gray-600 space-y-0.5">
                  <p className="text-[10px] text-gray-400 font-medium">Demo Reference Code</p>
                  <p className="font-mono font-bold tracking-wider text-gray-800 break-all">
                    {demoRef}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Simulated payment • Completing balance will automatically start cake production with the bakery.
                  </span>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                    {paymentError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={isProcessing}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#007DFF] hover:bg-[#0068D9] text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing simulated GCash payment...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        <span>Pay {formatCurrency(balanceToPay)} with GCash</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onClose?.()}
                    className="w-full py-2 rounded-xl text-gray-500 hover:text-gray-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
