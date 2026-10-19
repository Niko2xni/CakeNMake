import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Banknote, TrendingUp, Clock } from 'lucide-react';
import { bakeryApi, transactionApi } from '@/services/api';
import { getChatSocket } from '@/lib/chat-socket';
import { Skeleton } from '@/components/ui/skeleton';
import BakeryReservations from './BakeryReservations';
import BakeryPaymentHistory from './BakeryPaymentHistory';

function LoadError({ message, onRetry }) {
  return <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-red-700">
    <span>{message}</span>
    <button type="button" onClick={onRetry} className="rounded-lg border border-red-200 px-3 py-1">Retry</button>
  </div>;
}

export default function BakeryOrders() {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get('tab') === 'payments' ? 'payments' : 'reservations';
  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState('');
  const [paymentsError, setPaymentsError] = useState('');
  const [selected, setSelected] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  async function loadReservations({ silent = false } = {}) {
    if (!silent) setReservationsLoading(true);
    setReservationsError('');
    try {
      const data = await bakeryApi.getReservations('all');
      const rows = Array.isArray(data) ? data : [];
      setReservations(rows);
      setSelected((current) => current ? rows.find((row) => row._id === current._id) || current : null);
    } catch {
      if (!silent) setReservationsError('Could not load reservations. Please try again.');
    } finally {
      if (!silent) setReservationsLoading(false);
    }
  }

  async function loadPayments({ silent = false } = {}) {
    if (!silent) setPaymentsLoading(true);
    setPaymentsError('');
    try {
      const data = await transactionApi.getTransactions();
      setPayments(data.transactions || []);
      setSummary(data.summary || null);
    } catch {
      if (!silent) setPaymentsError('Could not load payment information. Please try again.');
    } finally {
      if (!silent) setPaymentsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    let socket;

    void loadReservations();
    void loadPayments();

    const handleCreated = (newReservation) => {
      if (!active) return;
      if (newReservation?._id) {
        setReservations((prev) => {
          if (prev.some((row) => row._id === newReservation._id)) return prev;
          return [newReservation, ...prev];
        });
      }
      void loadReservations({ silent: true });
      void loadPayments({ silent: true });
    };

    const handleUpdated = (updated) => {
      if (!active) return;
      if (updated?._id) {
        const merge = (row) => ({ ...row, ...updated, user: row.user || updated.user, design: row.design || updated.design });
        setReservations((rows) => rows.map((row) => (row._id === updated._id ? merge(row) : row)));
        setPayments((rows) => rows.map((row) => (row._id === updated._id ? merge(row) : row)));
        setSelected((row) => (row?._id === updated._id ? merge(row) : row));
      }
      void loadReservations({ silent: true });
      void loadPayments({ silent: true });
    };

    Promise.resolve()
      .then(() => getChatSocket?.())
      .then((s) => {
        if (active && s) {
          socket = s;
          socket.on('reservation:created', handleCreated);
          socket.on('reservation:updated', handleUpdated);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      socket?.off('reservation:created', handleCreated);
      socket?.off('reservation:updated', handleUpdated);
    };
  }, []);

  function changeTab(tab) {
    const next = new URLSearchParams(params);
    if (tab === 'payments') next.set('tab', 'payments');
    else next.delete('tab');
    setParams(next);
  }

  async function updateStatus(id, status) {
    setUpdatingStatus(true);
    setStatusError('');
    try {
      const updated = await bakeryApi.updateReservationStatus(id, status);
      // PATCH returns raw references; retain populated customer/design details.
      const merge = (row) => ({ ...row, ...updated, user: row.user || updated.user, design: row.design || updated.design });
      setReservations((rows) => rows.map((row) => row._id === id ? merge(row) : row));
      setPayments((rows) => rows.map((row) => row._id === id ? merge(row) : row));
      setSelected((row) => row?._id === id ? merge(row) : row);
      await Promise.all([loadReservations({ silent: true }), loadPayments({ silent: true })]);
    } catch {
      setStatusError('Could not update the order status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function recordPayment(id, payment) {
    await bakeryApi.recordDownPayment(id, payment);
    await Promise.all([loadReservations({ silent: true }), loadPayments({ silent: true })]);
  }

  const remainingBalance = summary
    ? Math.max(0, (summary.totalRevenueExpected || 0) - (summary.totalDownPaymentsCollected || 0))
    : 0;

  const cards = summary ? [
    { label: 'Down Payments Collected', value: `₱${Number(summary.totalDownPaymentsCollected || 0).toLocaleString()}`, icon: Banknote },
    { label: 'Total Order Value', value: `₱${Number(summary.totalRevenueExpected || 0).toLocaleString()}`, icon: TrendingUp },
    { label: 'Remaining Balance Due', value: `₱${Number(remainingBalance).toLocaleString()}`, icon: Clock },
  ] : [];

  return <div className="cn-bakery-orders h-full min-h-0 rounded-2xl border border-pink-100 bg-white shadow-sm flex flex-col overflow-hidden">
    <header className="shrink-0 border-b border-pink-100 px-4 py-4 sm:px-6">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">Orders</h1>
      <p className="text-sm text-gray-500">Manage cake reservations and payments</p>
    </header>
    <div className="cn-order-summary shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3 sm:px-6 border-b border-pink-100">
      {paymentsLoading ? [0, 1, 2].map((key) => <div key={key} className="space-y-2 rounded-xl border border-pink-100 p-3" aria-label="Loading order summary"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-6 w-1/2" /></div>) : paymentsError ? <div className="sm:col-span-3"><LoadError message={paymentsError} onRetry={loadPayments} /></div> : cards.map(({ label, value, icon: Icon }) =>
        <div key={label} className="rounded-xl border border-pink-100 bg-pink-50/50 px-3 py-2 flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 text-pink-500" />
          <div><p className="text-xs text-gray-500">{label}</p><p className="text-base font-bold text-gray-900">{value}</p></div>
        </div>)}
    </div>
    <div className="shrink-0 flex gap-2 border-b border-pink-100 px-4" role="tablist" aria-label="Order views">
      {[['reservations', 'Reservations'], ['payments', 'Payment History']].map(([key, label], index) => <button
        key={key} type="button" role="tab" id={`orders-${key}-tab`} aria-controls={`orders-${key}-panel`}
        aria-selected={activeTab === key} tabIndex={activeTab === key ? 0 : -1}
        onClick={() => changeTab(key)}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 'reservations' : event.key === 'End' ? 'payments' : index === 0 ? 'payments' : 'reservations';
          changeTab(next);
          document.getElementById(`orders-${next}-tab`)?.focus();
        }}
        className={`px-3 py-3 text-sm font-medium border-b-2 ${activeTab === key ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500'}`}
      >{label}</button>)}
    </div>
    <section id="orders-reservations-panel" role="tabpanel" aria-labelledby="orders-reservations-tab" hidden={activeTab !== 'reservations'} className="flex-1 min-h-0">
      {reservationsError && <LoadError message={reservationsError} onRetry={loadReservations} />}
      <div hidden={Boolean(reservationsError)} className="h-full">
        <BakeryReservations reservations={reservations} loading={reservationsLoading} selected={selected}
          setSelected={(row) => { setSelected(row); setStatusError(''); }} onStatusChange={updateStatus} updatingStatus={updatingStatus} statusError={statusError} onRecordPayment={recordPayment} />
      </div>
    </section>
    <section id="orders-payments-panel" role="tabpanel" aria-labelledby="orders-payments-tab" hidden={activeTab !== 'payments'} className="flex-1 min-h-0">
      {!paymentsError && <BakeryPaymentHistory payments={payments} loading={paymentsLoading} onOpenReservation={(payment) => {
        setSelected(reservations.find((row) => row._id === payment._id) || payment);
        setStatusError('');
        changeTab('reservations');
      }} />}
    </section>
  </div>;
}
