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
            {STATUS_TABS.map((tab) => (
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
                        <span>· {formatPeso(r.totalPrice)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Down payment: {formatPeso(r.downPayment?.amount)} ·{' '}
                        <span className={r.downPayment?.isPaid ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                          {r.downPayment?.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                        {' · '}
                        Balance: {formatPeso(r.totalPrice ? Math.max(0, r.totalPrice - (r.downPayment?.amount || 0)) : 0)}
                      </p>
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

      {/* Detail panel - unified cohesive layout with top action bar and unified financials */}
      <div className={`cn-reservation-detail flex-shrink-0 overflow-hidden ${selected ? 'is-open w-[22rem] lg:w-[27rem] ml-4' : 'w-0 ml-0'}`}>
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

            <CustomScrollbar className="flex-1" contentClassName="p-4 space-y-3.5">
              {/* Customer & Cake Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-pink-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {(selected.user?.displayName || selected.user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {selected.user?.displayName || selected.user?.name || 'Unknown customer'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{selected.user?.email}</p>
                    <p className="text-xs font-semibold text-pink-600 truncate mt-0.5">
                      {selected.designName || 'Custom cake'} <span className="text-gray-400 font-normal">· #{selected._id.slice(-6)}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Top Quick Actions Bar (Chat & Blueprint accessible immediately) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openChat}
                  disabled={openingChat}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50/50 hover:bg-pink-100/60 px-2.5 py-2 text-xs font-semibold text-pink-700 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                  <span>Open chat with customer</span>
                </button>

                {selected.blueprint ? (
                  <button
                    type="button"
                    onClick={openBlueprint}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-pink-200 bg-white hover:bg-pink-50 px-2.5 py-2 text-xs font-semibold text-pink-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span>View blueprint PDF</span>
                  </button>
                ) : safeExternalUrl(selected.blueprintUrl) ? (
                  <a
                    href={safeExternalUrl(selected.blueprintUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-pink-200 bg-white hover:bg-pink-50 px-2.5 py-2 text-xs font-semibold text-pink-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span>View blueprint PDF</span>
                  </a>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-400 cursor-not-allowed">
                    <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Blueprint not ready yet</span>
                  </div>
                )}
              </div>
              {blueprintError && <p role="alert" className="text-xs text-red-700">{blueprintError}</p>}
              {chatError && <p role="alert" className="text-xs text-red-700">{chatError}</p>}

              {/* Reservation Schedule & Fulfillment Logistics Card */}
              <div className="rounded-xl border border-pink-100 bg-pink-50/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    {selected.fulfillment?.type === 'delivery' ? (
                      <>
                        <Truck className="w-4 h-4 text-pink-600" />
                        Client-Booked Courier Delivery
                      </>
                    ) : selected.fulfillment?.type === 'pickup' ? (
                      <>
                        <Store className="w-4 h-4 text-pink-600" />
                        Store Pickup
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-pink-600" />
                        Reservation Schedule
                      </>
                    )}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-pink-200 font-semibold text-pink-700">
                    {selected.fulfillment?.type === 'delivery'
                      ? 'Grab / Lalamove Car'
                      : selected.fulfillment?.type === 'pickup'
                      ? 'AH Tinaps Hub'
                      : 'Scheduled Date'}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-gray-800">
                    <Calendar className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                    <span>
                      {selected.fulfillment?.type === 'delivery'
                        ? 'Delivery Date:'
                        : selected.fulfillment?.type === 'pickup'
                        ? 'Pickup Date:'
                        : 'Reservation Date:'}{' '}
                      <strong>{formatDate(selected.pickupDate)}</strong>
                    </span>
                  </div>

                  {selected.fulfillment?.type === 'delivery' ? (
                    <>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-gray-700">Destination: </span>
                          <span>{selected.fulfillment.deliveryAddress || 'Address on file'}</span>
                          {selected.fulfillment.deliveryLandmark && (
                            <p className="text-[11px] text-gray-500 mt-0.5">Gate / Landmark: {selected.fulfillment.deliveryLandmark}</p>
                          )}
                        </div>
                      </div>
                      {selected.fulfillment.timeSlot && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Dispatch window: <strong className="text-gray-700">{selected.fulfillment.timeSlot}</strong></span>
                        </div>
                      )}
                      {selected.fulfillment.recipientPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Rider contact: <strong className="text-gray-700">{selected.fulfillment.recipientPhone}</strong></span>
                        </div>
                      )}
                    </>
                  ) : selected.fulfillment?.type === 'pickup' ? (
                    <>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <span>AH Tinaps Bakeshop, Mandaluyong City</span>
                          <span className="text-[11px] text-gray-500 block">Hours: 9:00 AM – 7:00 PM daily</span>
                        </div>
                      </div>
                      {selected.fulfillment.timeSlot && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Pickup slot: <strong className="text-gray-700">{selected.fulfillment.timeSlot}</strong></span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="pt-1.5 border-t border-pink-100/70 text-xs">
                      <div className="flex items-start gap-1.5 text-gray-700">
                        <Info className="w-3.5 h-3.5 text-pink-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-gray-800">Fulfillment Method: </span>
                          <span className="text-gray-600">Coordinated in chat</span>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Specific pickup time or courier delivery arrangement is coordinated directly with the customer in order chat.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selected.fulfillment?.notes && (
                    <div className="pt-1.5 border-t border-pink-100 text-xs">
                      <span className="text-gray-500 font-medium">Notes: </span>
                      <span className="text-gray-700 italic">"{selected.fulfillment.notes}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Unified Pay-to-Bake & Financial Breakdown Card */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-pink-600" />
                    Pay-to-Bake Policy Status
                  </span>
                  <span className="text-xs font-extrabold text-gray-900">Total: {formatPeso(selected.totalPrice)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white border border-gray-200">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">1. Downpayment (50%)</p>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                      {formatPeso(selected.downPayment?.amount || Math.round(selected.totalPrice * 0.5))}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      selected.downPayment?.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selected.downPayment?.isPaid ? '✓ Verified & Locked' : 'Awaiting Payment'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-gray-200">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">2. Remaining Balance</p>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">
                      {formatPeso(Math.max(0, (selected.totalPrice || 0) - (selected.downPayment?.amount || Math.round(selected.totalPrice * 0.5))))}
                    </p>
                    <span className="inline-block mt-1 text-[10px] text-gray-600">
                      Due 48h before baking
                    </span>
                  </div>
                </div>

                {selected.checkoutMode === 'simulated' && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                    Simulated checkout · Payment requires staff verification below
                  </p>
                )}
              </div>

              {/* Record Downpayment Form if unpaid */}
              {!selected.downPayment?.isPaid && onRecordPayment && (
                <DownPaymentForm key={selected._id} order={selected} onRecordPayment={onRecordPayment} />
              )}
              {selected.downPayment?.isPaid && (
                <div className="p-2.5 rounded-xl border border-green-200 bg-green-50/50 text-xs text-green-800 space-y-0.5">
                  <p className="font-semibold">✓ Down payment recorded ({formatPeso(selected.downPayment.amount)})</p>
                  <p className="text-[11px] text-green-700">
                    {formatDate(selected.downPayment.paidAt)}{selected.downPayment.method && ` · Method: ${selected.downPayment.method}`}{selected.downPayment.paymentReference && ` · Ref: ${selected.downPayment.paymentReference}`}
                  </p>
                </div>
              )}

              {/* Status Updater */}
              <div className="pt-2 border-t border-pink-100">
                {statusError && <p role="alert" className="mb-2 text-sm text-red-600">{statusError}</p>}
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Order Stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_TABS.filter((t) => t.key !== 'all').map((tab) => (
                    <button
                      key={tab.key}
                      disabled={updatingStatus}
                      onClick={() => onStatusChange(selected._id, tab.key)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        selected.status === tab.key
                          ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                          : 'border-pink-200 text-gray-600 hover:bg-pink-50'
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
