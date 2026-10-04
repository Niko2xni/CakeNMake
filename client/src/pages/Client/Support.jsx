import React, { useCallback, useEffect, useState } from 'react';
import ClientNavbar from '@/components/client/ClientNavbar';
import SupportThread from '@/components/shared/SupportThread';
import { moderationApi } from '@/services/chat-api';
import { philippineTime } from '@/lib/moderation';
import { safeExternalUrl } from '@/lib/safe-url';

export default function Support() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('order');
  const [orderKey, setOrderKey] = useState('');
  const [text, setText] = useState('');
  const load = useCallback(async () => {
    try { setData(await moderationApi.mine()); setError(''); }
    catch (failure) { setError(failure.message); }
  }, []);
  useEffect(() => { void load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  const orders = [
    ...(data?.orders || []).map((order) => ({ ...order, orderType: 'reservation', label: `Reservation ${order._id.slice(-8)}`, date: order.pickupDate })),
    ...(data?.blueprints || []).map((order) => ({ ...order, orderType: 'blueprint', label: order.designName, date: order.deliveryDate })),
  ];
  const eligible = orders.filter((order) => !data?.restriction || new Date(order.createdAt) <= new Date(data.restriction.startedAt));
  const selectedOrder = eligible.find((order) => `${order.orderType}:${order._id}` === orderKey);
  const pendingAppeal = data?.requests.some((request) => request.kind === 'appeal' && request.status !== 'resolved' && String(request.restriction) === String(data.restriction?.id));
  const pendingOrder = selectedOrder && data?.requests.some((request) => request.kind === 'order' && request.status !== 'resolved' && String(request.order) === selectedOrder._id);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await moderationApi.createRequest({ kind, text, orderId: selectedOrder?._id, orderType: selectedOrder?.orderType });
      setText(''); await load();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function download(id) {
    try {
      const access = await moderationApi.blueprintAccess(id);
      const url = safeExternalUrl(access.url);
      if (!url) throw new Error('Blueprint link is unavailable.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (failure) { setError(failure.message); }
  }
  return <div className="min-h-screen bg-pink-50"><ClientNavbar />
    <main className="md:ml-[84px] px-4 pb-24 pt-28 max-w-5xl space-y-5">
      <header><h1 className="text-2xl font-bold">Orders & Support</h1><p className="text-sm text-gray-600">View existing orders, contact the bakery, or appeal a restriction.</p><button onClick={load} className="mt-2 text-sm text-pink-700 underline">Refresh requests</button></header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-white p-3 text-red-700">{error} <button onClick={load} className="underline">Refresh</button></div>}
      {!data ? <p role="status">Loading support…</p> : <>
        {data.restriction && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm"><strong>Account {data.restriction.type}</strong><p>{data.restriction.reason}</p><p>Expires: {philippineTime(data.restriction.expiresAt)} (Philippine time). Existing orders remain available.</p></div>}
        <section className="space-y-2"><h2 className="font-semibold">Existing orders</h2>{orders.length === 0 ? <p className="text-sm text-gray-500">No existing orders found.</p> : orders.map((order) => <article key={`${order.orderType}:${order._id}`} className="rounded-xl border border-pink-100 bg-white p-4 text-sm space-y-1">
          <h3 className="font-semibold">{order.label}</h3><p>{order.status} · Pickup/delivery: {philippineTime(order.date)}</p>
          {order.orderType === 'reservation' ? <><p>Total: ₱{Number(order.totalPrice || 0).toLocaleString()} · Down payment: ₱{Number(order.downPayment?.amount || 0).toLocaleString()} ({order.downPayment?.isPaid ? 'Paid' : 'Unpaid'})</p>{safeExternalUrl(order.blueprintUrl) && <a href={safeExternalUrl(order.blueprintUrl)} target="_blank" rel="noopener noreferrer" className="underline text-pink-700">View blueprint</a>}</> : <><p>Simulated checkout · Estimate: ₱{Number((order.quoteSnapshot?.totalMinor || 0) / 100).toLocaleString()}</p>{order.status === 'ready' && <button onClick={() => download(order._id)} className="underline text-pink-700">Download blueprint</button>}</>}
        </article>)}</section>
        <form onSubmit={submit} className="rounded-xl border border-pink-100 bg-white p-4 space-y-3">
          <h2 className="font-semibold">Submit a request</h2>
          <label className="block text-sm">Request type<select value={kind} onChange={(event) => setKind(event.target.value)} className="block w-full border rounded-lg p-2 mt-1"><option value="appeal" disabled={!data.restriction}>Appeal restriction</option><option value="order">Contact about an existing order</option></select></label>
          {kind === 'order' && <label className="block text-sm">Existing order<select required value={orderKey} onChange={(event) => setOrderKey(event.target.value)} className="block w-full border rounded-lg p-2 mt-1"><option value="">Choose an order</option>{eligible.map((order) => <option key={order._id} value={`${order.orderType}:${order._id}`}>{order.label}</option>)}</select></label>}
          <textarea required maxLength={2000} aria-label="Request message" value={text} onChange={(event) => setText(event.target.value)} className="w-full rounded-lg border p-3 text-sm" placeholder="Explain your request (plain text, up to 2,000 characters)" />
          {kind === 'appeal' && pendingAppeal && <p className="text-sm text-gray-500">You already have a pending appeal.</p>}
          {kind === 'order' && pendingOrder && <p className="text-sm text-gray-500">You already have an open request for this order.</p>}
          <button disabled={busy || !text.trim() || (kind === 'appeal' ? !data.restriction || pendingAppeal : !selectedOrder || pendingOrder)} className="rounded-lg bg-pink-600 text-white px-4 py-2 text-sm disabled:opacity-50">Submit request</button>
        </form>
        <section className="space-y-3"><h2 className="font-semibold">Your requests</h2>{data.requests.length === 0 && <p className="text-sm text-gray-500">No support requests yet.</p>}{data.requests.map((request) => <SupportThread key={request._id} request={request} onChange={load} />)}</section>
      </>}
    </main>
  </div>;
}
