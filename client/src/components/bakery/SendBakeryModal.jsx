import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeliveryCalendar from './DeliveryCalendar';
import GCashPayment from './GCashPayment';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { activeRestriction } from '@/lib/moderation';
import { moderationApi } from '@/services/chat-api';

export default function SendBakeryModal({ config, total, onClose, onOrderComplete, onPaymentComplete }) {
  const [step, setStep] = useState('calendar'); // 'calendar' | 'pay' | 'chat'
  const [selectedDate, setSelectedDate] = useState(null);
  const [busy, setBusy] = useState(false);
  const { account } = useAuth();
  const [accessError, setAccessError] = useState('');
  const restricted = Boolean(activeRestriction(account));
  async function continueToPayment() {
    setBusy(true); setAccessError('');
    try {
      const data = await moderationApi.mine();
      if (data.restriction) throw new Error('New orders are restricted. Existing orders remain available through Orders & Support.');
      setStep('pay');
    } catch (error) { setAccessError(error.message); }
    finally { setBusy(false); }
  }
  const close = () => { if (!busy) onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={close}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="bg-card rounded-2xl shadow-2xl border border-border/40 w-full max-w-[420px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base">Send to Bakery</h2>
              <div className="flex gap-2 mt-0.5">
                {['calendar', 'pay'].map((s, i) => (
                  <div key={s} className={`h-1 w-8 rounded-full transition-colors ${
                    step === s ? 'bg-primary' :
                    (step === 'pay' && i === 0) ? 'bg-primary/40' : 'bg-muted'
                  }`} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={close} disabled={busy} className="rounded-full p-1.5 hover:bg-muted transition-colors disabled:opacity-40">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {accessError && <p role="alert" className="text-sm text-red-700 mb-3">{accessError}</p>}
          {!account ? <p className="text-sm">Please <Link to="/login" className="underline">sign in</Link> to submit an order to the bakery.</p> : restricted ? <p className="text-sm">New orders are restricted. <Link to="/support" className="underline">View existing orders or contact the bakery.</Link></p> :
          <AnimatePresence mode="wait">
            {step === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <DeliveryCalendar
                  config={config}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />
                {selectedDate && (
                  <Button disabled={busy} className="w-full mt-4" onClick={continueToPayment}>
                    Continue to Payment
                  </Button>
                )}
              </motion.div>
            )}
            {step === 'pay' && (
              <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GCashPayment
                  total={total}
                  selectedDate={selectedDate}
                  onPaid={async () => { await onOrderComplete?.(selectedDate); onClose(); }}
                  onPaymentComplete={onPaymentComplete}
                  onBusyChange={setBusy}
                  onBack={() => setStep('calendar')}
                />
              </motion.div>
            )}
          </AnimatePresence>}
        </div>
      </motion.div>
    </motion.div>
  );
}
