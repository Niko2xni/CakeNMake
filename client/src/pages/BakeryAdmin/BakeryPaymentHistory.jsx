import React, { useState } from 'react';
import { ChevronRight, User, Search, X } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { AdminRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';

const STATUS_LABELS = {
  pending_payment: 'Awaiting Payment', confirmed: 'Confirmed', in_production: 'In Production', completed: 'Completed',
};
const peso = (value) => `₱${Number(value || 0).toLocaleString()}`;
const date = (value) => value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';

export default function BakeryPaymentHistory({ payments, loading, onOpenReservation }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = payments.filter(payment => {
    const matchesStatus = filter === 'all' || Boolean(payment.downPayment?.isPaid) === (filter === 'paid');
    const haystack = [payment.user?.displayName, payment.user?.name, payment.user?.email, payment.designName, payment.downPayment?.paymentReference, payment._id].filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && haystack.includes(search.trim().toLowerCase());
  });
  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex flex-wrap items-center gap-3 border-b border-pink-100 p-4">
      <div className="relative min-w-0 flex-1 basis-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input aria-label="Search payment history" placeholder="Search customer, cake or payment reference" value={search} onChange={event => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-10 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400" />{search && <button type="button" aria-label="Clear payment search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2"><X className="h-4 w-4 text-gray-500" /></button>}</div>
      <label className="flex items-center gap-2 text-xs text-gray-500">Payment<select aria-label="Filter payment history" value={filter} onChange={event => setFilter(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"><option value="all">All payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></label>
      <span role="status" className="text-xs text-gray-500">{loading ? 'Loading…' : `${filtered.length} records`}</span>
    </div>
    <CustomScrollbar className="flex-1 min-h-0" contentClassName="p-4">
    {loading ? <div role="status" aria-label="Loading payments"><AdminRowsSkeleton count={6} avatar /></div> : payments.length === 0 ?
      <p className="py-8 text-center text-sm text-gray-400">No payment records yet.</p> :
      filtered.length === 0 ? <div className="py-12 text-center"><p className="text-sm font-semibold text-gray-700">No matching payments.</p><button type="button" onClick={() => { setSearch(''); setFilter('all'); }} className="mt-3 rounded-lg border px-3 py-2 text-sm text-pink-600">Clear filters</button></div> :
      <div className="space-y-2">{filtered.map((payment) => <button key={payment._id} type="button"
        onClick={() => onOpenReservation(payment)} aria-label={`Open reservation for ${payment.user?.displayName || payment.user?.name || 'Unknown customer'}`}
        className="cn-payment-row w-full flex items-center gap-4 rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-pink-300 hover:bg-pink-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 transition-colors">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500 border border-gray-200/60">
          <User className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-[160px] space-y-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{payment.user?.displayName || payment.user?.name || 'Unknown customer'}</span>
            {payment.designName && (
              <span className="text-xs text-pink-600 font-medium">· {payment.designName}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
            <span>Reservation date: {date(payment.createdAt)}</span>
            {payment.downPayment?.isPaid && (
              <>
                <span className="text-gray-300">·</span>
                <span>Down payment date: {date(payment.downPayment.paidAt)}</span>
              </>
            )}
            {payment.downPayment?.paymentReference && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-mono text-[11px] text-gray-500 truncate max-w-[200px]" title={payment.downPayment.paymentReference}>
                  Ref: {payment.downPayment.paymentReference}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="cn-payment-amounts text-right text-xs text-gray-500 space-y-0.5">
            <p className="text-sm font-bold text-gray-900">Total: {peso(payment.totalPrice)}</p>
            <p className="flex items-center justify-end gap-1">
              <span>{peso(payment.downPayment?.amount)} · <strong className={payment.downPayment?.isPaid ? 'text-green-600' : 'text-yellow-700'}>{payment.downPayment?.isPaid ? 'Paid' : 'Unpaid'}</strong></span>
              {payment.totalPrice != null && (
                <span className="text-gray-400">· Balance: {peso(Math.max(0, (payment.totalPrice || 0) - (payment.downPayment?.amount || 0)))}</span>
              )}
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${
            payment.status === 'completed'
              ? 'bg-green-50 text-green-700 border-green-200'
              : payment.status === 'in_production'
              ? 'bg-pink-50 text-pink-700 border-pink-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {STATUS_LABELS[payment.status] || payment.status}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
        </div>
      </button>)}</div>}
  </CustomScrollbar></div>;
}
