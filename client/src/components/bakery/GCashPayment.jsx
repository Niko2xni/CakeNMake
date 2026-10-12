import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ChevronLeft, ShieldCheck, Smartphone, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Static demo GCash reference code — locked to downpayment amount
function generateRef(amount) {
  return `DEMO-${amount}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export default function GCashPayment({ total, selectedDate, fulfillment, onPaid, onBack, onPaymentComplete, onBusyChange }) {
  const downpayment = Math.ceil(total / 2);
  const remainingBalance = total - downpayment;
  const isPickup = fulfillment?.type !== 'delivery';
  const [ref] = useState(() => generateRef(downpayment));
  const [paying, setPaying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const submitOrder = async () => {
    setSubmitting(true);
    onBusyChange?.(true);
    setSubmissionError('');
    try {
      if (fulfillment !== undefined) {
        await onPaymentComplete?.(selectedDate, fulfillment);
      } else {
        await onPaymentComplete?.(selectedDate);
      }
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(error.message || 'Could not send your order. Please retry.');
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }
  };

  const handlePay = () => {
    setPaying(true);
    onBusyChange?.(true);
    setTimeout(() => {
      setDone(true);
      setPaying(false);
      void submitOrder();
    }, 1800);
  };

  const openBakeryChat = async () => {
    setOpeningChat(true);
    setSubmissionError('');
    try {
      await onPaid?.();
    } catch (error) {
      setSubmissionError(error.message || 'Your order was submitted, but the bakery chat could not be opened. Please retry.');
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} disabled={paying || done} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors disabled:opacity-40">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to fulfillment
      </button>

      <p className="font-heading font-bold text-base mb-1">Simulated GCash checkout</p>
      <p className="text-xs text-muted-foreground mb-4">
        This demo does not charge money. Pay the 50% reservation down payment to lock your date. The remaining 50% balance is due 48 hours before baking.
      </p>

      {/* Order summary */}
      <div className="bg-muted/40 rounded-xl p-4 mb-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Fulfillment</span>
          <span className="font-medium">
            {isPickup ? 'Store Pickup' : 'Courier Delivery (Client-Booked)'}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{isPickup ? 'Pickup date' : 'Delivery date'}</span>
          <span className="font-medium">{selectedDate ? format(selectedDate, 'MMM d, yyyy') : '—'}</span>
        </div>
        {fulfillment?.timeWindow && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{isPickup ? 'Pickup window' : 'Dispatch window'}</span>
            <span className="font-medium text-muted-foreground">{fulfillment.timeWindow}</span>
          </div>
        )}
        {!isPickup && fulfillment?.address && (
          <div className="flex justify-between text-xs gap-3">
            <span className="text-muted-foreground shrink-0">Destination</span>
            <span className="font-medium text-right line-clamp-1">{fulfillment.address}</span>
          </div>
        )}
        <div className="flex justify-between text-xs pt-1 border-t border-border/40">
          <span className="text-muted-foreground">Total cake price</span>
          <span className="font-medium">₱{total}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Balance (due 48h before baking)</span>
          <span className="font-medium text-muted-foreground">₱{remainingBalance}</span>
        </div>
        <Separator className="opacity-40" />
        <div className="flex justify-between gap-3 text-sm font-bold">
          <div>
            <span>Down payment (50%)</span>
            <p className="text-[10px] text-muted-foreground font-normal">Locks calendar slot today</p>
          </div>
          <span className="shrink-0 text-primary">₱{downpayment}</span>
        </div>
      </div>

      {/* PayMongo / GCash UI */}
      <div className="border border-border rounded-2xl overflow-hidden mb-4">
        {/* PayMongo header */}
        <div className="bg-[#0040C1] px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm tracking-tight">PayMongo demo</span>
          <Lock className="w-3.5 h-3.5 text-white/70" />
        </div>

        <div className="p-4">
          {/* GCash option */}
          <div className="border-2 border-[#007DFF] bg-[#007DFF]/5 rounded-xl p-3 flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#007DFF] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#007DFF]">GCash</p>
              <p className="text-[10px] text-muted-foreground">Demo only · No GCash redirect or charge</p>
            </div>
            <div className="w-4 h-4 shrink-0 rounded-full border-2 border-[#007DFF] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#007DFF]" />
            </div>
          </div>

          {/* Reference code */}
          <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Demo reference · Not a payment receipt</p>
            <p className="font-mono text-xs font-bold tracking-widest text-foreground break-all">{ref}</p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
            <ShieldCheck className="w-3 h-3 text-green-500 shrink-0" />
            Simulated payment • No money will be collected
          </div>

          {/* Payment terms & liability disclosure */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[10.5px] text-amber-900 dark:text-amber-200 leading-snug">
            <p className="font-semibold mb-0.5">⚠️ Fulfillment &amp; Payment Rules</p>
            <p>
              Paying this 50% down payment confirms your order slot. The remaining balance (₱{total - downpayment}) must be fully settled on or before delivery. The bakery will not release or deliver the cake without complete payment, and neither the platform nor the bakery is liable for non-fulfillment due to unpaid balances.
            </p>
          </div>
        </div>
      </div>

      {done ? (
        <div className="text-center py-2">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-heading font-bold text-sm text-green-600">{submitted ? 'Order submitted!' : 'Simulated checkout complete'}</p>
          <p className="text-xs text-muted-foreground mb-4">{submitted ? 'Your order has been sent to the bakery.' : submitting ? 'Sending your order to the bakery…' : submissionError ? 'The order or bakery confirmation may still be pending. Retry to finish submitting it.' : 'Your order has not been sent yet.'}</p>
          {submissionError && <p role="alert" className="text-xs text-destructive mb-3">{submissionError}</p>}
          {!submitted && !submitting && <Button className="w-full mb-2" onClick={submitOrder}>Retry sending order</Button>}
          <Button className="w-full" onClick={openBakeryChat} disabled={!submitted || submitting || openingChat}>
            {openingChat ? 'Opening Bakery Chat…' : 'Open Bakery Chat'}
          </Button>
        </div>
      ) : (
        <Button className="w-full bg-[#007DFF] hover:bg-[#0068D9]" onClick={() => setShowConfirmModal(true)} disabled={paying}>
          {paying ? 'Processing...' : 'Continue simulated checkout'}
        </Button>
      )}

      {/* Elaborate Final Confirmation & Rules Modal */}
      {showConfirmModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200" onClick={event => event.stopPropagation()}>
          <div role="dialog" aria-modal="true" aria-label="Confirm demo order" className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-[380px] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-4 sm:p-5 text-left space-y-4">
            <div className="flex items-center gap-2.5 text-primary">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground leading-tight">Confirm demo order</h3>
                <p className="text-[11px] text-muted-foreground">Please review these essential terms</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <span className="font-bold text-foreground shrink-0">•</span>
                <p>
                  <strong className="text-foreground">50% Down Payment (₱{downpayment}):</strong> Arrange payment with the bakery after submission. This demo does not charge your account.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-foreground shrink-0">•</span>
                <p>
                  <strong className="text-foreground">Remaining Balance (₱{total - downpayment}):</strong> Must be settled on or before delivery/pickup.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-foreground shrink-0">•</span>
                <p>
                  <strong className="text-foreground">Permanent Design Lock:</strong> Once submitted, this design is permanently finalized for viewing only and cannot be edited.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-foreground shrink-0">•</span>
                <p>
                  <strong className="text-foreground">Fulfillment Policy:</strong> Unsettled cakes will not be released. The bakery and platform are not liable for non-fulfillment due to unpaid balances.
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-foreground text-center pt-1">
              Are you sure you want to proceed and finalize this order?
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-xs"
                onClick={() => setShowConfirmModal(false)}
              >
                Go Back
              </Button>
              <Button
                className="flex-1 rounded-xl text-xs font-bold bg-[#007DFF] hover:bg-[#0068D9] text-white"
                onClick={() => {
                  setShowConfirmModal(false);
                  handlePay();
                }}
              >
                Submit demo order
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
