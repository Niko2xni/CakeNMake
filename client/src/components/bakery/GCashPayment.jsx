import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ShieldCheck, Smartphone, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Static demo GCash reference code — locked to downpayment amount
function generateRef(amount) {
  return `GC-${amount}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export default function GCashPayment({ total, selectedDate, onPaid, onBack, onPaymentComplete, onBusyChange }) {
  const downpayment = Math.ceil(total / 2);
  const [ref] = useState(() => generateRef(downpayment));
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const submitOrder = async () => {
    setSubmitting(true);
    onBusyChange?.(true);
    setSubmissionError('');
    try {
      await onPaymentComplete?.(selectedDate);
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

  return (
    <div>
      <button onClick={onBack} disabled={paying || done} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors disabled:opacity-40">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to calendar
      </button>

      <p className="font-heading font-bold text-base mb-1">Down Payment via GCash</p>
      <p className="text-xs text-muted-foreground mb-4">
        Pay 50% now to confirm your order. The remaining balance will be settled on delivery.
      </p>

      {/* Order summary */}
      <div className="bg-muted/40 rounded-xl p-4 mb-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Delivery date</span>
          <span className="font-medium">{selectedDate ? format(selectedDate, 'MMM d, yyyy') : '—'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total cake price</span>
          <span className="font-medium">₱{total}</span>
        </div>
        <Separator className="opacity-40" />
        <div className="flex justify-between text-sm font-bold">
          <span>Down payment (50%)</span>
          <span className="text-primary">₱{downpayment}</span>
        </div>
      </div>

      {/* PayMongo / GCash UI */}
      <div className="border border-border rounded-2xl overflow-hidden mb-4">
        {/* PayMongo header */}
        <div className="bg-[#0040C1] px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm tracking-tight">PayMongo</span>
          <Lock className="w-3.5 h-3.5 text-white/70" />
        </div>

        <div className="p-4">
          {/* GCash option */}
          <div className="border-2 border-[#007DFF] bg-[#007DFF]/5 rounded-xl p-3 flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#007DFF] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-[#007DFF]">GCash</p>
              <p className="text-[10px] text-muted-foreground">You will be redirected to GCash app</p>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-[#007DFF] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#007DFF]" />
            </div>
          </div>

          {/* Reference code */}
          <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Reference code (locked to ₱{downpayment})</p>
            <p className="font-mono text-xs font-bold tracking-widest text-foreground">{ref}</p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 text-green-500" />
            Secured by PayMongo • Only ₱{downpayment} will be charged
          </div>
        </div>
      </div>

      {done ? (
        <div className="text-center py-2">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-heading font-bold text-sm text-green-600">Payment confirmed!</p>
          <p className="text-xs text-muted-foreground mb-4">{submitted ? 'Your order has been sent to the bakery.' : submitting ? 'Sending your order to the bakery…' : 'Your order has not been sent yet.'}</p>
          {submissionError && <p role="alert" className="text-xs text-destructive mb-3">{submissionError}</p>}
          {!submitted && !submitting && <Button className="w-full mb-2" onClick={submitOrder}>Retry sending order</Button>}
          <Button className="w-full" onClick={onPaid} disabled={!submitted || submitting}>Open Bakery Chat</Button>
        </div>
      ) : (
        <Button className="w-full bg-[#007DFF] hover:bg-[#0068D9]" onClick={handlePay} disabled={paying}>
          {paying ? 'Processing...' : `Pay ₱${downpayment} via GCash`}
        </Button>
      )}
    </div>
  );
}
