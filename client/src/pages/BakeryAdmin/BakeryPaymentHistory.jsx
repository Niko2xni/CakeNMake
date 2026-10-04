import React from 'react';
import { ChevronRight, User } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { AdminRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';

const STATUS_LABELS = {
  pending_payment: 'Awaiting Payment', confirmed: 'Confirmed', in_production: 'In Production', completed: 'Completed',
};
const peso = (value) => `₱${Number(value || 0).toLocaleString()}`;
const date = (value) => value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';

export default function BakeryPaymentHistory({ payments, loading, onOpenReservation }) {
  return <CustomScrollbar className="h-full" contentClassName="p-4">
    {loading ? <div role="status" aria-label="Loading payments"><AdminRowsSkeleton count={6} avatar /></div> : payments.length === 0 ?
      <p className="py-8 text-center text-sm text-gray-400">No payment records yet.</p> :
      <div className="space-y-2">{payments.map((payment) => <button key={payment._id} type="button"
        onClick={() => onOpenReservation(payment)} aria-label={`Open reservation for ${payment.user?.displayName || payment.user?.name || 'Unknown customer'}`}
        className="w-full flex flex-wrap items-center gap-3 rounded-xl border border-pink-100 px-4 py-3 text-left hover:bg-pink-50/40">
        <User className="h-5 w-5 shrink-0 text-gray-400" />
        <div className="flex-1 min-w-[120px]">
          <p className="text-sm font-semibold text-gray-900">{payment.user?.displayName || payment.user?.name || 'Unknown customer'}</p>
          <p className="text-xs text-gray-500">Reservation date: {date(payment.createdAt)}</p>
          {payment.designName && <p className="text-xs text-gray-500">{payment.designName}</p>}
          {payment.checkoutMode === 'simulated' && <p className="text-xs text-amber-700">Simulated checkout</p>}
          {payment.downPayment?.isPaid && <p className="text-xs text-gray-500">Down payment date: {date(payment.downPayment.paidAt)}</p>}
          {payment.downPayment?.paymentReference && <p className="break-all text-xs text-gray-500">Reference: {payment.downPayment.paymentReference}</p>}
        </div>
        <div className="text-xs text-gray-500">
          <p className="text-sm font-semibold text-gray-900">Order total: {peso(payment.totalPrice)}</p>
          <p>Down payment: {peso(payment.downPayment?.amount)} · <span className={payment.downPayment?.isPaid ? 'text-green-600' : 'text-yellow-700'}>{payment.downPayment?.isPaid ? 'Paid' : 'Unpaid'}</span></p>
          <p>Order status: {STATUS_LABELS[payment.status] || payment.status}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      </button>)}</div>}
  </CustomScrollbar>;
}
