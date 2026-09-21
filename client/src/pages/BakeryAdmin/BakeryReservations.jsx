import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, X, Calendar, Banknote, FileText, MessageCircle, User } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { bakeryApi } from '@/services/api'; // adjust path if api.js lives elsewhere


const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending_payment', label: 'Awaiting Payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_production', label: 'In Production' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_META = {
  pending_payment: { label: 'Awaiting Payment', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_production: { label: 'In Production', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString()}`;
}

export default function BakeryReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadReservations();
  }, [activeTab]);

  async function loadReservations() {
    setLoading(true);
    try {
      const data = await bakeryApi.getReservations(activeTab);
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reservations', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id, status) {
    setUpdatingStatus(true);
    try {
      const updated = await bakeryApi.updateReservationStatus(id, status);
      setReservations((prev) => prev.map((r) => (r._id === id ? updated : r)));
      setSelected(updated);
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  const filtered = reservations.filter((r) => {
    if (!search.trim()) return true;
    return (r.user?.displayName || r.user?.name || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className="flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4">
          <h1 className="text-lg font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500">Incoming cake orders for Mamshie Bakery</p>
        </header>

        <div className="flex-shrink-0 px-4 pt-3">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name"
              className="w-full pl-9 py-2 rounded-full bg-pink-50/70 border border-pink-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-px">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 text-sm px-3 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CustomScrollbar className="flex-1" contentClassName="p-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading reservations...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No reservations found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.pending_payment;
                return (
                  <button
                    key={r._id}
                    onClick={() => setSelected(r)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected?._id === r._id
                        ? 'border-pink-300 bg-pink-50/60'
                        : 'border-pink-100 hover:bg-pink-50/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {r.user?.displayName || r.user?.name || 'Unknown customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Pickup {formatDate(r.pickupDate)} · {formatPeso(r.totalPrice)}
                      </p>
                    </div>

                    <span className={`text-[11px] font-medium px-2 py-1 rounded-full border flex-shrink-0 ${meta.color}`}>
                      {meta.label}
                    </span>

                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </CustomScrollbar>
      </div>

      {/* Detail panel - same floating-card pattern as Chats.jsx's Chat info panel, no animation */}
      <div className={`flex-shrink-0 overflow-hidden ${selected ? 'w-[26rem] ml-4' : 'w-0 ml-0'}`}>
        {selected && (
          <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-pink-100 shadow-xl overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-pink-100">
              <h2 className="font-semibold text-gray-900">Reservation Details</h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-pink-50 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <CustomScrollbar className="flex-1" contentClassName="p-4 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selected.user?.displayName || selected.user?.name || 'Unknown customer'}</p>
                  <p className="text-xs text-gray-500">{selected.user?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  Pickup: {formatDate(selected.pickupDate)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Banknote className="w-4 h-4 text-pink-500" />
                  Total: {formatPeso(selected.totalPrice)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Banknote className="w-4 h-4 text-pink-500" />
                  Down payment: {formatPeso(selected.downPayment?.amount)} ·{' '}
                  <span className={selected.downPayment?.isPaid ? 'text-green-600' : 'text-yellow-600'}>
                    {selected.downPayment?.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Update status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_TABS.filter((t) => t.key !== 'all').map((tab) => (
                    <button
                      key={tab.key}
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(selected._id, tab.key)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                        selected.status === tab.key
                          ? 'bg-pink-500 text-white border-pink-500'
                          : 'border-pink-100 text-gray-600 hover:bg-pink-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-pink-100">
                {selected.blueprintUrl ? (
                  <a
                    href={selected.blueprintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm rounded-xl border border-pink-100 px-3 py-2.5 hover:bg-pink-50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-pink-500" />
                    View blueprint PDF
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-sm rounded-xl border border-pink-100 px-3 py-2.5 opacity-40 cursor-not-allowed">
                    <FileText className="w-4 h-4 text-pink-500" />
                    Blueprint not ready yet
                  </div>
                )}

                <button
                  type="button"
                  className="w-full flex items-center gap-2 text-sm rounded-xl border border-pink-100 px-3 py-2.5 hover:bg-pink-50 transition-colors text-left"
                >
                  <MessageCircle className="w-4 h-4 text-pink-500" />
                  Open chat with customer
                </button>
              </div>
            </CustomScrollbar>
          </div>
        )}
      </div>
    </div>
  );
}
