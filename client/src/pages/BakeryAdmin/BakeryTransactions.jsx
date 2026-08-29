import React, { useState, useEffect } from 'react';
import { Banknote, TrendingUp, Clock, User } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { transactionApi } from '@/services/api';

const STATUS_META = {
  pending_payment: { label: 'Awaiting Payment', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_production: { label: 'In Production', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200' },
};

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString()}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BakeryTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      const data = await transactionApi.getTransactions();
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">Transaction History</h1>
        <p className="text-sm text-gray-500">Read-only record of reservation payments</p>
      </header>

      {/* Summary cards */}
      {summary && (
        <div className="flex-shrink-0 grid grid-cols-3 gap-3 px-6 py-4 border-b border-pink-100">
          <div className="rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Banknote className="w-4.5 h-4.5 text-pink-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Down Payments Collected</p>
              <p className="text-base font-bold text-gray-900">{formatPeso(summary.totalDownPaymentsCollected)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4.5 h-4.5 text-pink-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Reservation Value</p>
              <p className="text-base font-bold text-gray-900">{formatPeso(summary.totalRevenueExpected)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Clock className="w-4.5 h-4.5 text-pink-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Payments</p>
              <p className="text-base font-bold text-gray-900">{summary.pendingCount}</p>
            </div>
          </div>
        </div>
      )}

      <CustomScrollbar className="flex-1" contentClassName="p-4">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => {
              const meta = STATUS_META[t.status] || STATUS_META.pending_payment;
              return (
                <div
                  key={t._id}
                  className="flex items-center gap-3 rounded-xl border border-pink-100 px-4 py-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {t.user?.name || 'Unknown customer'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(t.createdAt)}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatPeso(t.totalPrice)}</p>
                    <p className="text-xs text-gray-500">
                      Down: {formatPeso(t.downPayment?.amount)} ·{' '}
                      <span className={t.downPayment?.isPaid ? 'text-green-600' : 'text-yellow-600'}>
                        {t.downPayment?.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </p>
                  </div>

                  <span className={`text-[11px] font-medium px-2 py-1 rounded-full border flex-shrink-0 ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CustomScrollbar>
    </div>
  );
}