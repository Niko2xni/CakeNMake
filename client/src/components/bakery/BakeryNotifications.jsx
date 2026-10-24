import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChatSocket } from '@/lib/chat-socket';
import { CheckCircle2, Sparkles, X, ArrowRight, BellRing } from 'lucide-react';

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.14); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.14); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.16);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.55);
  } catch {
    // Non-fatal if audio context is blocked by browser autoplay policy
  }
}

export default function BakeryNotifications() {
  const [notifications, setNotifications] = useState([]);
  const seenIdsRef = useRef(new Set());
  const navigate = useNavigate();

  const addNotification = (item) => {
    const key = `${item.type}-${item.reservationId || item.id || Date.now()}-${item.status}`;
    if (seenIdsRef.current.has(key)) return;
    seenIdsRef.current.add(key);

    const toast = {
      id: Math.random().toString(36).substring(2, 9),
      ...item,
    };

    setNotifications((prev) => [toast, ...prev].slice(0, 3));
    playNotificationChime();

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== toast.id));
    }, 7500);
  };

  useEffect(() => {
    let active = true;
    let socket;

    const handleCustomNotification = (payload) => {
      if (!active || !payload) return;
      addNotification({
        type: payload.type || 'info',
        title: payload.title || 'Bakery Notification',
        message: payload.message || '',
        reservationId: payload.reservationId,
        status: payload.status,
      });
    };

    const handleReservationCreated = (res) => {
      if (!active || !res) return;
      const status = res.status || 'confirmed';
      if (status === 'confirmed') {
        const customerName = res.user?.displayName || res.user?.name || res.customerName || 'A customer';
        const cakeName = res.design?.name || res.blueprint?.designName || res.designName || 'Custom Cake';
        addNotification({
          type: 'confirmed',
          title: 'New Order Confirmed! (Deposit Paid)',
          message: `${customerName} placed an order for "${cakeName}". Deposit is paid and status is Confirmed.`,
          reservationId: res._id,
          status: 'confirmed',
        });
      }
    };

    const handleReservationUpdated = (res) => {
      if (!active || !res) return;
      if (res.status === 'in_production') {
        const customerName = res.user?.displayName || res.user?.name || res.customerName || 'A customer';
        const cakeName = res.design?.name || res.blueprint?.designName || res.designName || 'Custom Cake';
        addNotification({
          type: 'in_production',
          title: 'Balance Paid! (Order In Production)',
          message: `${customerName} completed the balance for "${cakeName}". Order has switched to In Production!`,
          reservationId: res._id,
          status: 'in_production',
        });
      }
    };

    Promise.resolve()
      .then(() => getChatSocket?.())
      .then((s) => {
        if (active && s) {
          socket = s;
          socket.on('bakery:notification', handleCustomNotification);
          socket.on('reservation:created', handleReservationCreated);
          socket.on('reservation:updated', handleReservationUpdated);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      socket?.off('bakery:notification', handleCustomNotification);
      socket?.off('reservation:created', handleReservationCreated);
      socket?.off('reservation:updated', handleReservationUpdated);
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none sm:max-w-md"
      aria-live="polite"
      aria-label="Bakery order notifications"
    >
      {notifications.map((item) => {
        const isConfirmed = item.type === 'confirmed';
        const isInProd = item.type === 'in_production';

        return (
          <div
            key={item.id}
            className={`pointer-events-auto w-full p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-250 flex items-start gap-3.5 ${
              isInProd
                ? 'bg-purple-900/95 border-purple-500/50 text-white'
                : isConfirmed
                ? 'bg-blue-900/95 border-blue-500/50 text-white'
                : 'bg-gray-900/95 border-gray-700 text-white'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                isInProd
                  ? 'bg-purple-700/80 text-purple-200'
                  : isConfirmed
                  ? 'bg-blue-700/80 text-blue-200'
                  : 'bg-pink-700/80 text-pink-200'
              }`}
            >
              {isInProd ? (
                <Sparkles className="w-5 h-5 text-purple-200 animate-pulse" />
              ) : isConfirmed ? (
                <CheckCircle2 className="w-5 h-5 text-blue-200" />
              ) : (
                <BellRing className="w-5 h-5 text-pink-200" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isInProd
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                      : 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                  }`}
                >
                  {isInProd ? 'In Production' : 'Confirmed'}
                </span>
                <span className="text-[10px] text-gray-300">Just now</span>
              </div>

              <h4 className="text-sm font-bold text-white leading-snug">{item.title}</h4>
              <p className="text-xs text-gray-200 mt-1 leading-relaxed">{item.message}</p>

              <button
                type="button"
                onClick={() => {
                  navigate('/bakery/orders');
                  setNotifications((prev) => prev.filter((n) => n.id !== item.id));
                }}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2 hover:no-underline transition-colors cursor-pointer"
              >
                <span>Open in Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== item.id))}
              aria-label="Dismiss notification"
              className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
