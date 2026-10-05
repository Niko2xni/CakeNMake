import React, { useCallback, useEffect, useState } from 'react';
import ClientNavbar from '@/components/client/ClientNavbar';
import SupportThread from '@/components/shared/SupportThread';
import { moderationApi } from '@/services/chat-api';
import { philippineTime } from '@/lib/moderation';
import { RefreshCw, ShieldCheck, ShoppingBag, MessageCircle } from 'lucide-react';

const statusLabel = status => ({ pending_payment: 'Awaiting payment', confirmed: 'Confirmed', in_production: 'In production', completed: 'Completed', ready: 'Submitted', uploading: 'Processing', failed: 'Submission failed' }[status] || 'Processing');

export default function Support() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('order');
  const [orderKey, setOrderKey] = useState('');
  const [text, setText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    setRefreshing(true);
    try { setData(await moderationApi.mine()); setError(''); }
    catch (failure) { setError(failure.message); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  const reservedBlueprints = new Set((data?.orders || []).map(order => String(order.blueprint || '')));
  const hasReservation = Boolean(data?.orders?.length);
  const orders = [
    ...(data?.orders || []).map((order) => ({ ...order, orderType: 'reservation', label: order.designName || `Reservation ${order._id.slice(-8)}`, date: order.pickupDate })),
    ...(data?.blueprints || []).filter(order => !reservedBlueprints.has(String(order._id))).map((order) => ({ ...order, orderType: 'blueprint', label: order.designName || 'Cake submission', date: order.deliveryDate })),
  ];
  const eligible = orders.filter((order) => !data?.restriction || new Date(order.createdAt) <= new Date(data.restriction.startedAt));
  const selectedOrder = eligible.find((order) => `${order.orderType}:${order._id}` === orderKey);
  const pendingAppeal = data?.requests.some((request) => request.kind === 'appeal' && request.status !== 'resolved' && String(request.restriction) === String(data.restriction?.id));
  const pendingOrder = selectedOrder && data?.requests.some((request) => request.kind === 'order' && request.status !== 'resolved' && String(request.order) === selectedOrder._id);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      await moderationApi.createRequest({ kind, text, orderId: selectedOrder?._id, orderType: selectedOrder?.orderType });
      setText(''); await load(); setSuccess('Request sent. Follow the bakery’s response in Your requests below.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function contact(order) {
    setKind('order'); setOrderKey(`${order.orderType}:${order._id}`);
    document.getElementById('support-request-form')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    document.getElementById('support-message')?.focus({ preventScroll: true });
  }
  return <div className="min-h-screen bg-pink-50"><ClientNavbar />
    <main className="md:ml-[84px] px-4 md:px-8 pb-24 pt-24 md:pt-8 space-y-6">
      <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Orders & Support</h1><p className="mt-1 text-sm text-gray-600">Track your cake orders and get help from the bakery.</p></div><button onClick={load} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink-200 bg-white px-4 text-sm disabled:opacity-50"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing…' : 'Refresh'}</button></header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-white p-3 text-red-700">{error} <button onClick={load} className="underline">Refresh</button></div>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      {!data ? <p role="status">Loading support…</p> : <>
        {hasReservation && <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white p-4"><ShieldCheck className="shrink-0 text-emerald-600" size={22} /><div><h2 className="text-sm font-semibold">Reservation account protection</h2><p className="mt-1 text-sm text-gray-600">Customers with reservation history cannot be suspended or banned by the bakery.</p></div></div>}
        {data.restriction && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm"><strong>Account {data.restriction.type}</strong><p>{data.restriction.reason}</p><p>{data.restriction.expiresAt ? `Ends ${philippineTime(data.restriction.expiresAt)} (Philippine time).` : 'This restriction has no expiry.'} {hasReservation ? 'Ask the bakery to restore access under the reservation protection policy.' : 'You can request an account review below.'}</p></div>}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="space-y-3"><h2 className="flex items-center gap-2 font-semibold"><ShoppingBag size={18} />Your orders <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700">{orders.length}</span></h2>{orders.length === 0 ? <div className="rounded-2xl border border-pink-100 bg-white p-6"><p className="font-medium">No orders yet</p><p className="mt-1 text-sm text-gray-500">Your reservations will appear here after you send a design to the bakery.</p></div> : orders.map((order) => <article key={`${order.orderType}:${order._id}`} className="rounded-2xl border border-pink-100 bg-white p-5 text-sm space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{order.label}</h3><span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700">{statusLabel(order.status)}</span></div><p className="text-gray-500">Pickup/delivery: {philippineTime(order.date)}</p>
          {order.orderType === 'reservation' ? <p className="rounded-xl bg-gray-50 p-3">Total: ₱{Number(order.totalPrice || 0).toLocaleString()} · Down payment: ₱{Number(order.downPayment?.amount || 0).toLocaleString()} ({order.downPayment?.isPaid ? 'Paid' : 'Unpaid'})</p> : <p className="text-gray-600">Simulated checkout · Estimate: ₱{Number((order.quoteSnapshot?.totalMinor || 0) / 100).toLocaleString()}</p>}
          <button onClick={() => contact(order)} disabled={!eligible.includes(order)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink-200 px-3 font-medium text-pink-700 hover:bg-pink-50 disabled:opacity-50"><MessageCircle size={16} />Get help with this order</button>
        </article>)}</section>
        <form id="support-request-form" onSubmit={submit} className="rounded-2xl border border-pink-100 bg-white p-5 space-y-4">
          <div><h2 className="font-semibold">Contact the bakery</h2><p className="mt-1 text-sm text-gray-500">Choose your order and tell us what you need help with.</p></div>
          {data.restriction && <label className="block text-sm">Request type<select value={kind} onChange={(event) => setKind(event.target.value)} className="block w-full border rounded-xl min-h-11 p-2 mt-1"><option value="appeal">Request an account review</option><option value="order">Contact about an existing order</option></select></label>}
          {kind === 'order' && <label className="block text-sm">Existing order<select required value={orderKey} onChange={(event) => setOrderKey(event.target.value)} className="block w-full border rounded-lg p-2 mt-1"><option value="">Choose an order</option>{eligible.map((order) => <option key={order._id} value={`${order.orderType}:${order._id}`}>{order.label}</option>)}</select></label>}
          <label className="block text-sm">Your message<textarea id="support-message" rows={4} required maxLength={2000} aria-label="Request message" value={text} onChange={(event) => setText(event.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" placeholder="Ask about pickup, payment, or your cake details…" /></label><p className="text-right text-xs text-gray-500">{text.length.toLocaleString()} / 2,000</p>
          {kind === 'appeal' && pendingAppeal && <p className="text-sm text-gray-500">You already have a pending appeal.</p>}
          {kind === 'order' && pendingOrder && <p className="text-sm text-gray-500">You already have an open request for this order.</p>}
          {kind === 'order' && eligible.length === 0 && <p className="text-sm text-gray-500">Order support is available once you have a reservation or submission.</p>}
          <button disabled={busy || !text.trim() || (kind === 'appeal' ? !data.restriction || pendingAppeal : !selectedOrder || pendingOrder)} className="min-h-11 w-full rounded-xl bg-pink-600 text-white px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Sending…' : 'Submit request'}</button>
        </form></div>
        <section className="space-y-3"><h2 className="font-semibold">Your requests</h2>{data.requests.length === 0 && <p className="text-sm text-gray-500">No support requests yet.</p>}{data.requests.map((request) => <SupportThread key={request._id} request={request} onChange={load} />)}</section>
      </>}
      </div>
    </main>
  </div>;
}
