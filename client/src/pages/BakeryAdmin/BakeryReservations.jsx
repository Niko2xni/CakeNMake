import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, X, Calendar, Banknote, FileText, MessageCircle, User, Store, Truck, Clock, ShieldCheck, MapPin, Phone, Info } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { AdminRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';
import { safeExternalUrl } from '@/lib/safe-url';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '@/services/chat-api';
import { bakeryApi } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function DownPaymentForm({ order, onRecordPayment }) {
  const [method, setMethod] = useState('gcash');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onRecordPayment(order._id, { amount: order.downPayment.amount, method, reference }); }
    catch (failure) { setError(failure.message || 'Could not record payment.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-pink-100 bg-pink-50/40 p-3">
    <h3 className="text-sm font-semibold">Record down payment</h3><p className="text-xs text-gray-600">Record only after verifying receipt of ₱{Number(order.downPayment.amount).toLocaleString()}. Simulated checkout does not collect money.</p>
    <label className="block text-xs">Payment method<select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm"><option value="gcash">GCash</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>
    <label className="block text-xs">Receipt / payment reference<input required maxLength={200} value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" /></label>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}<button disabled={busy || !reference.trim()} className="w-full rounded-lg bg-pink-600 p-2 text-sm text-white disabled:opacity-50">{busy ? 'Recording…' : 'Record verified payment'}</button>
  </form>;
}


const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_production', label: 'In Production' },
  { key: 'completed', label: 'Completed' },
];

const ORDER_STAGES = [
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

export default function BakeryReservations({ reservations, loading, selected, setSelected, onStatusChange, updatingStatus, statusError, onRecordPayment }) {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState('');
  const [blueprintError, setBlueprintError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    setChatError('');
    setBlueprintError('');
    setPreviewUrl(null);
  }, [selected?._id]);
  useEffect(() => {
    if (!selected || previewUrl) return undefined;
    const close = event => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected, previewUrl, setSelected]);
  async function openBlueprint() {
    setBlueprintError('');
    try {
      const { url } = await bakeryApi.getBlueprintAccess(selected.blueprint);
      if (!safeExternalUrl(url)) throw new Error('Invalid blueprint link.');
      setPreviewUrl(url);
    } catch (error) { setBlueprintError(error.message || 'Could not access blueprint.'); }
  }
  async function openChat() {
    setOpeningChat(true); setChatError('');
    try {
      const { conversation } = await chatApi.openReservationChat(selected._id);
      navigate(`/bakery/chats?tab=messages&conversation=${encodeURIComponent(conversation.id)}`);
    } catch (error) { setChatError(error.message || 'Could not open customer chat.'); }
    finally { setOpeningChat(false); }
  }

  const hasUnpaid = reservations.some((r) => r.status === 'pending_payment');
  const availableTabs = hasUnpaid
    ? [...STATUS_TABS, { key: 'pending_payment', label: 'Unpaid Deposit' }]
    : STATUS_TABS;

  const filtered = reservations.filter((r) => {
    if (activeTab !== 'all' && r.status !== activeTab) return false;
    if (!search.trim()) return true;
    return [
      r.user?.displayName,
      r.user?.name,
      r.user?.email,
      r.designName,
      r._id,
      r.fulfillment?.type,
      r.fulfillment?.deliveryAddress,
      r.fulfillment?.timeSlot,
    ].filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <div className="cn-bakery-reservations flex h-full min-h-0">
      <Dialog open={Boolean(previewUrl)} onOpenChange={(open) => { if (!open) setPreviewUrl(null); }}><DialogContent className="flex h-[85dvh] max-w-5xl flex-col"><DialogHeader><DialogTitle>Blueprint PDF preview</DialogTitle></DialogHeader>{previewUrl && <iframe title="Order blueprint PDF" src={previewUrl} className="min-h-0 w-full flex-1 rounded-lg border" />}</DialogContent></Dialog>
      {/* Main list */}
      <div className="flex-1 min-w-0 bg-white flex flex-col overflow-hidden">

        <div className="flex-shrink-0 px-4 pt-3">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search reservations by customer name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, cake, email or order ID"
              className="w-full pl-9 py-2 rounded-full bg-pink-50/70 border border-pink-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            />
            {search && <button type="button" aria-label="Clear reservation search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500"><X className="h-4 w-4" /></button>}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-px">
            {availableTabs.map((tab) => (
              <button
                key={tab.key}
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 text-sm px-3 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span aria-hidden="true" className="ml-1.5 text-xs opacity-70">{reservations.filter(r => tab.key === 'all' || r.status === tab.key).length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 text-xs text-gray-500" role="status">{loading ? 'Loading orders…' : `${filtered.length} of ${reservations.length} reservations`}</div>
        <CustomScrollbar className="flex-1" contentClassName="p-3">
          {loading ? (
            <div role="status" aria-label="Loading reservations" className="p-1">
              <AdminRowsSkeleton count={6} avatar />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4"><Calendar className="mx-auto mb-3 h-8 w-8 text-pink-300" /><p className="text-sm font-semibold text-gray-700">No reservations found.</p><p className="mt-1 text-xs text-gray-500">{search || activeTab !== 'all' ? 'Try another search or clear your filters.' : 'Customer reservations will appear here.'}</p>{(search || activeTab !== 'all') && <button type="button" onClick={() => { setSearch(''); setActiveTab('all'); }} className="mt-3 rounded-lg border px-3 py-2 text-sm text-pink-600">Clear filters</button>}</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.pending_payment;
                return (
                  <button
                    key={r._id}
                    aria-pressed={selected?._id === r._id}
                    onClick={() => setSelected(r)}
                    className={`w-full flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected?._id === r._id
                        ? 'border-pink-300 bg-pink-50/60'
                        : 'border-pink-100 hover:bg-pink-50/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>

                    <div className="flex-1 min-w-[120px]">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {r.user?.displayName || r.user?.name || 'Unknown customer'}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-600">{r.designName || 'Custom cake'} · #{r._id.slice(-6)}</p>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
                        {r.fulfillment?.type && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            r.fulfillment.type === 'delivery'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {r.fulfillment.type === 'delivery' ? '🛵 Courier Delivery' : '🏪 Store Pickup'}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                          <Calendar className="w-3 h-3 text-pink-500" />
                          Reservation: {formatDate(r.pickupDate)}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="font-semibold text-gray-800">{formatPeso(r.totalPrice)} total</span>
                        <span className="text-gray-300">·</span>
                        {r.downPayment?.isPaid ? (
                          <span className="text-gray-600">
                            <span className="text-green-600 font-medium">Deposit paid</span>
                            {' · '}
                            <span>Balance: <strong>{formatPeso(Math.max(0, (r.totalPrice || 0) - (r.downPayment?.amount || 0)))}</strong></span>
                          </span>
                        ) : (
                          <span className="text-yellow-700 font-medium bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200 text-[11px]">
                            Deposit unpaid ({formatPeso(r.downPayment?.amount)})
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${meta.color}`}>
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

      {/* Detail panel - streamlined modern layout */}
      <div className={`cn-reservation-detail flex-shrink-0 overflow-hidden ${selected ? 'is-open w-[22rem] lg:w-[26rem] ml-4' : 'w-0 ml-0'}`}>
        {selected && (
          <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-pink-100 shadow-xl overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-pink-100 bg-pink-50/20">
              <h2 className="font-semibold text-gray-900 text-sm">Reservation Details</h2>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_META[selected.status]?.color || STATUS_META.pending_payment.color}`}>
                  {STATUS_META[selected.status]?.label || selected.status}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-pink-100/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <CustomScrollbar className="flex-1" contentClassName="p-3 space-y-2.5">
              {/* Customer & Cake Header */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {(selected.user?.displayName || selected.user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-xs truncate">
                    {selected.user?.displayName || selected.user?.name || 'Unknown customer'}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{selected.user?.email}</p>
                  <p className="text-[11px] font-medium text-pink-600 truncate mt-0.5">
                    {selected.designName || 'Custom cake'} <span className="text-gray-400 font-normal">· #{selected._id.slice(-6)}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openChat}
                  disabled={openingChat}
                  aria-label="Open chat with customer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50/70 hover:bg-pink-100 px-2 py-2 text-xs font-semibold text-pink-700 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                  <span className="truncate">Chat with customer</span>
                </button>

                {selected.blueprint ? (
                  <button
                    type="button"
                    onClick={openBlueprint}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span className="truncate">View blueprint PDF</span>
                  </button>
                ) : safeExternalUrl(selected.blueprintUrl) ? (
                  <a
                    href={safeExternalUrl(selected.blueprintUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span className="truncate">View blueprint PDF</span>
                  </a>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-xs font-medium text-gray-400 cursor-not-allowed">
                    <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">Blueprint not ready yet</span>
                  </div>
                )}
              </div>
              {blueprintError && <p role="alert" className="text-xs text-red-700">{blueprintError}</p>}
              {chatError && <p role="alert" className="text-xs text-red-700">{chatError}</p>}

              {/* Reservation Schedule & Fulfillment Card */}
              <div className="rounded-xl border border-pink-100 bg-pink-50/30 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span>Reservation Schedule</span>
                  </span>
                  {selected.fulfillment?.type && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white border border-pink-200 text-pink-700">
                      {selected.fulfillment.type === 'delivery' ? 'Courier Delivery' : 'Store Pickup'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-700 pt-0.5">
                  <span className="text-gray-500">
                    {selected.fulfillment?.type === 'delivery' ? 'Delivery Date:' : 'Reservation Date:'}
                  </span>
                  <span className="font-bold text-gray-900">{formatDate(selected.pickupDate)}</span>
                </div>

                {selected.fulfillment?.type === 'delivery' && (
                  <div className="pt-1.5 border-t border-pink-100/80 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-800">Client-Booked Courier Delivery</p>
                    <p className="truncate">Destination: <strong className="text-gray-800">{selected.fulfillment.deliveryAddress || 'Address on file'}</strong></p>
                    {selected.fulfillment.deliveryLandmark && (
                      <p className="text-[11px] text-gray-500">Landmark: {selected.fulfillment.deliveryLandmark}</p>
                    )}
                    {selected.fulfillment.timeSlot && (
                      <p>Dispatch window: <strong className="text-gray-800">{selected.fulfillment.timeSlot}</strong></p>
                    )}
                    {selected.fulfillment.recipientPhone && (
                      <p>Rider contact: <strong className="text-gray-800">{selected.fulfillment.recipientPhone}</strong></p>
                    )}
                  </div>
                )}

                {selected.fulfillment?.type === 'pickup' && (
                  <div className="pt-1.5 border-t border-pink-100/80 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-800">Store Pickup</p>
                    <p className="text-[11px] text-gray-500">AH Tinaps Bakeshop, Mandaluyong City</p>
                    {selected.fulfillment.timeSlot && (
                      <p>Pickup slot: <strong className="text-gray-800">{selected.fulfillment.timeSlot}</strong></p>
                    )}
                  </div>
                )}

                {!selected.fulfillment?.type && (
                  <p className="text-[11px] text-gray-500 pt-0.5">
                    Pickup or delivery logistics are coordinated directly in customer chat.
                  </p>
                )}

                {selected.fulfillment?.notes && (
                  <p className="text-[11px] text-gray-600 italic border-t border-pink-100/80 pt-1">
                    "{selected.fulfillment.notes}"
                  </p>
                )}
              </div>

              {/* Financial & Payment Summary */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span>Payment Summary</span>
                  </span>
                  <span className="font-bold text-gray-900 text-sm">Total: {formatPeso(selected.totalPrice)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-medium">1. Downpayment (50%)</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-bold text-gray-900">
                          {formatPeso(selected.downPayment?.amount || Math.round(selected.totalPrice * 0.5))}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          selected.downPayment?.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {selected.downPayment?.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                    {selected.downPayment?.isPaid && (
                      <p className="text-[10px] text-gray-500 mt-1 truncate" title={`${selected.downPayment.method || 'paid'}${selected.downPayment.paymentReference ? ` · Ref: ${selected.downPayment.paymentReference}` : ''}`}>
                        {selected.downPayment.method || 'paid'}{selected.downPayment.paymentReference ? ` · Ref: ${selected.downPayment.paymentReference}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-gray-200/80 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-medium">2. Remaining Balance</span>
                      <p className="font-bold text-gray-900 mt-0.5">
                        {formatPeso(Math.max(0, (selected.totalPrice || 0) - (selected.downPayment?.amount || Math.round(selected.totalPrice * 0.5))))}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Due 48h before baking
                    </span>
                  </div>
                </div>

                {/* Simulated checkout alert - only show if still unpaid */}
                {!selected.downPayment?.isPaid && selected.checkoutMode === 'simulated' && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                    Simulated checkout · Payment requires staff verification below
                  </p>
                )}
              </div>

              {/* Record Downpayment Form if unpaid */}
              {!selected.downPayment?.isPaid && onRecordPayment && (
                <DownPaymentForm key={selected._id} order={selected} onRecordPayment={onRecordPayment} />
              )}

              {/* Order Stage */}
              <div className="pt-2 border-t border-gray-100">
                {statusError && <p role="alert" className="mb-2 text-xs text-red-600">{statusError}</p>}
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Order Stage</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {ORDER_STAGES.map((tab) => (
                    <button
                      key={tab.key}
                      disabled={updatingStatus}
                      onClick={() => onStatusChange(selected._id, tab.key)}
                      className={`text-xs py-1.5 px-2 rounded-lg border font-medium transition-colors text-center truncate ${
                        selected.status === tab.key
                          ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                          : 'border-gray-200 text-gray-600 hover:bg-pink-50/50 hover:border-pink-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </CustomScrollbar>
          </div>
        )}
      </div>
    </div>
  );
}
