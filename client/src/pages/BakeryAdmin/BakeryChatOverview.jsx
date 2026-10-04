import React, { useCallback, useEffect, useState } from 'react';
import { moderationApi } from '@/services/chat-api';
import { getChatSocket } from '@/lib/chat-socket';
import { philippineTime, suspensionExpiry } from '@/lib/moderation';
import SupportThread from '@/components/shared/SupportThread';
import { ShieldCheck, MessageSquareWarning, Clock3, Ban, LifeBuoy, Search, ChevronRight, RefreshCw, Users } from 'lucide-react';

const button = 'rounded-lg border border-pink-200 px-3 py-2 text-sm hover:bg-pink-50 disabled:opacity-50';

function EmptyQueue({ support = false }) {
  const Icon = support ? LifeBuoy : ShieldCheck;
  return <div className="flex flex-col items-center px-4 py-8 text-center">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-pink-500"><Icon size={22} aria-hidden="true" /></span>
    <p className="text-sm font-medium text-gray-700">{support ? 'No open requests.' : 'No messages awaiting review.'}</p>
    <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-500">{support ? 'Customer appeals and questions about existing orders will appear here.' : 'Messages flagged for possible spam will appear here for your review.'}</p>
  </div>;
}

function FlagReview({ flag, onChange, onCustomer }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function review(decision) {
    setBusy(true); setError('');
    try { await moderationApi.review(flag._id, decision, reason); await onChange(); if (decision === 'reject') onCustomer(flag.sender?._id); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <article className="rounded-xl border border-pink-100 p-4 bg-white space-y-2">
    <button className="font-semibold text-pink-700 underline" onClick={() => onCustomer(flag.sender?._id)}>{flag.sender?.displayName || flag.sender?.email || 'Customer'}</button>
    <p className="text-xs text-gray-500">{philippineTime(flag.createdAt)} · {flag.flagReason}</p>
    <p className="whitespace-pre-wrap break-words rounded-lg bg-pink-50 p-3 text-sm">{flag.text}</p>
    <input aria-label="Message review reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Reason for your review decision" className="w-full rounded-lg border p-2 text-sm" />
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || !reason.trim()} onClick={() => review('release')}>Dismiss flag & release</button><button className={button} disabled={busy || !reason.trim()} onClick={() => review('reject')}>Confirm abuse</button></div>
  </article>;
}

function CustomerModeration({ id, revision, onChange, onClose }) {
  const [data, setData] = useState(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [custom, setCustom] = useState('');
  const [evidence, setEvidence] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setData(await moderationApi.evidence(id)); }, [id]);
  useEffect(() => { load().catch((failure) => setError(failure.message)); }, [load, revision]);
  async function act(action) {
    setBusy(true); setError('');
    try {
      await moderationApi.restrict(id, { action, reason, messageId: evidence, acknowledged, expectedRestrictionId: data.customer.restrictionVersionId,
        ...(action === 'suspend' ? { expiresAt: suspensionExpiry(days, custom) } : {}) });
      await load(); await onChange(); setReason(''); setAcknowledged(false);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function flag(message) {
    setBusy(true); setError('');
    try { await moderationApi.flag(message._id, reason); await load(); await onChange(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const reviewed = data?.messages.filter((message) => message.moderation === 'rejected') || [];
  let expiry = '';
  try { expiry = philippineTime(suspensionExpiry(days, custom)); } catch { /* No valid custom date yet. */ }
  const field = 'mt-2 block w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100';
  return <section aria-label="Customer account review" className="overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-sm">
    <div className="flex items-start justify-between gap-3 border-b border-pink-100 bg-pink-50/50 p-5 sm:p-6"><div className="flex min-w-0 items-center gap-3"><span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-pink-600 sm:flex"><ShieldCheck size={24} aria-hidden="true" /></span><div className="min-w-0"><p className="mb-1 text-xs font-medium text-pink-600">Customer account</p><h2 className="break-words text-lg font-semibold">Account review — {data?.customer.displayName || data?.customer.email || 'Loading…'}</h2>{data?.customer.email && <p className="mt-1 break-all text-xs text-gray-500">{data.customer.email}</p>}</div></div><button className={`${button} shrink-0 bg-white`} onClick={onClose}>Close</button></div>
    {error && <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!data && <p role="status" className="p-6 text-sm text-gray-500">Loading account details…</p>}
    {data && <>
      <div className="grid items-start gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-xl border border-gray-200"><div className="border-b border-gray-100 p-4"><h3 className="text-sm font-semibold">Recent customer messages (up to 50)</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">Read the conversation first. Add a reason in Account actions to flag a message.</p></div>
      <div className="max-h-[460px] overflow-y-auto space-y-3 bg-gray-50/50 p-4">{data.messages.length === 0 && <div className="py-8 text-center"><MessageSquareWarning size={24} aria-hidden="true" className="mx-auto mb-3 text-gray-400" /><p className="text-sm text-gray-500">No messages to review.</p></div>}{data.messages.map((message) => <article key={message._id} className="rounded-xl border border-gray-100 bg-white p-4 text-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-gray-500">{philippineTime(message.createdAt)}</p><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${message.moderation === 'rejected' ? 'bg-rose-50 text-rose-700' : message.moderation === 'held' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{message.moderation || 'approved'}</span></div><p className="whitespace-pre-wrap break-words leading-relaxed text-gray-800">{message.text}</p>
        {message.reviewReason && <p className="text-xs mt-1">Review: {message.reviewReason}</p>}
        {(message.moderationHistory || []).map((entry, index) => <p key={entry._id || index} className="text-xs text-gray-500">{philippineTime(entry.at)} · {entry.action} · {entry.reason} · {entry.staff ? `Staff ${String(entry.staff).slice(-8)}` : 'Automatic detector'}</p>)}
        {!['held', 'rejected'].includes(message.moderation) && <button className={`${button} mt-2`} disabled={busy || !reason.trim()} onClick={() => flag(message)}>Flag for review</button>}
      </article>)}</div></section>
      <section className="rounded-xl border border-gray-200 p-4"><h3 className="mb-3 text-sm font-semibold">Moderation history</h3>{data.customer.moderationHistory.length === 0 ? <p className="text-xs text-gray-500">No account actions recorded.</p> : <div className="max-h-56 space-y-4 overflow-y-auto">{data.customer.moderationHistory.slice().reverse().map((entry) => <div key={entry._id} className="border-l-2 border-pink-200 pl-3"><p className="text-sm font-medium capitalize">{entry.action}</p><p className="mt-1 break-words text-sm text-gray-600">{entry.reason}</p><p className="mt-1 text-xs text-gray-500">{philippineTime(entry.at)} · Staff {String(entry.staff).slice(-8)}{entry.expiresAt && ` · Ends ${philippineTime(entry.expiresAt)}`}</p></div>)}</div>}</section>
      </div>
      <section className="min-w-0 space-y-4 rounded-xl border border-gray-200 p-4 sm:p-5">
      <div><h3 className="text-sm font-semibold">Account actions</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">Suspension and bans block chatting and new orders.</p></div>
      <div className={`rounded-xl p-3 text-sm ${data.customer.restriction ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}><p className="font-medium">{data.customer.restriction ? (data.customer.restriction.type === 'banned' ? 'Account banned' : 'Account suspended') : 'No active restriction'}</p>{data.customer.restriction && <><p className="mt-1 break-words text-xs leading-relaxed">{data.customer.restriction.reason}</p><p className="mt-1 text-xs">{data.customer.restriction.expiresAt ? `Ends ${philippineTime(data.customer.restriction.expiresAt)}` : 'Indefinite restriction'}</p></>}</div>
      <label className="block text-sm font-medium">Action / review reason<textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Explain why this action is needed…" className={`${field} resize-y font-normal`} /></label>
      <label className="block text-sm font-medium">Confirmed abuse evidence<select value={evidence} onChange={(event) => { setEvidence(event.target.value); setAcknowledged(false); }} className={`${field} font-normal`}><option value="">Select a reviewed message</option>{reviewed.map((message) => <option key={message._id} value={message._id}>{message.text.slice(0, 80)}</option>)}</select></label>
      {reviewed.length === 0 && <p className="text-xs leading-relaxed text-gray-500">Confirm abuse in Messages awaiting review before restricting this account.</p>}
      <label className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600"><input className="mt-0.5 accent-pink-600" type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I reviewed the message evidence before taking account action.</label>
      <div className="border-t border-gray-100 pt-4 space-y-3"><label className="block text-sm font-medium">Suspension duration<select value={days} onChange={(event) => setDays(event.target.value)} className={`${field} font-normal`}>{[1, 3, 7, 30].map((day) => <option key={day} value={day}>{day} {day === 1 ? 'day' : 'days'}</option>)}<option value="custom">Custom expiry</option></select></label>
      {days === 'custom' && <label className="block text-sm">Expiry (Philippine time)<input aria-label="Custom suspension expiry" type="datetime-local" value={custom} onChange={(event) => setCustom(event.target.value)} className={field} /></label>}
      <p className="text-xs leading-relaxed text-gray-500">Suspension will end: {expiry || 'Choose a valid future date'} (Philippine time)</p></div>
      <div className="grid gap-2 sm:grid-cols-2"><button className="rounded-xl bg-pink-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || !reason.trim() || !evidence || !acknowledged || !expiry} onClick={() => act('suspend')}>Suspend</button><button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || !reason.trim() || !evidence || !acknowledged} onClick={() => act('ban')}>Ban indefinitely</button></div>
      <div className="border-t border-gray-100 pt-4"><button className={`${button} w-full text-emerald-700 disabled:cursor-not-allowed`} disabled={busy || !reason.trim() || !data.customer.restriction} onClick={() => act('restore')}>Restore access</button><p className="mt-2 text-xs leading-relaxed text-gray-500">To lift a restriction, enter a reason and restore access.</p></div>
      </section>
      </div>
    </>}
  </section>;
}

export default function BakeryChatOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    try { setData(await moderationApi.overview()); setError(''); }
    catch (failure) { setError(failure.message); }
  }, []);
  useEffect(() => {
    void load(); let socket; let active = true;
    const refresh = () => { void load(); };
    getChatSocket().then((value) => { if (active) { socket = value; socket.on('moderation:updated', refresh); } }).catch(() => {});
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); socket?.off('moderation:updated', refresh); };
  }, [load]);
  const suspended = data?.customers.filter((customer) => customer.restriction?.type === 'suspended').length || 0;
  const banned = data?.customers.filter((customer) => customer.restriction?.type === 'banned').length || 0;
  const visible = data?.customers.filter((customer) =>
    `${customer.displayName || ''} ${customer.email || ''}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === 'all' || customer.restriction?.type === filter)) || [];
  return <div className="h-full overflow-y-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex items-start justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-pink-600">Customer care</p><h1 className="text-xl font-bold sm:text-2xl">Chats Overview</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">Keep conversations safe and help customers with their accounts and orders.</p></div><button className={`${button} flex shrink-0 items-center gap-2 bg-white`} onClick={load}><RefreshCw size={15} aria-hidden="true" />Refresh</button></header>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    {!data ? <p role="status">Loading overview…</p> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{[
        ['Held messages', data.flags.length, MessageSquareWarning, 'bg-amber-50 text-amber-600'],
        ['Suspended accounts', suspended, Clock3, 'bg-orange-50 text-orange-600'],
        ['Banned accounts', banned, Ban, 'bg-rose-50 text-rose-600'],
        ['Open support requests', data.requests.length, LifeBuoy, 'bg-pink-50 text-pink-600'],
      ].map(([label, count, Icon, color]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:p-5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={20} aria-hidden="true" /></span><div><p className="text-2xl font-bold leading-none text-gray-900">{count}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">{label}</p></div></div>)}</div>
      {selected && <CustomerModeration key={selected} id={selected} revision={data} onChange={load} onClose={() => setSelected(null)} />}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="space-y-4 border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Customer account management</h2><p className="mt-1 text-xs leading-relaxed text-gray-500">Select a customer to review messages and manage access.</p></div><span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700">{data.customers.length}</span></div>
          <div className="relative"><Search size={17} aria-hidden="true" className="absolute left-3 top-3 text-gray-400" /><input type="search" aria-label="Search customer accounts" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100" /></div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter customer accounts">{[['all', 'All customers'], ['suspended', 'Suspended'], ['banned', 'Banned']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === value ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-pink-50'}`}>{label}</button>)}</div>
        </div>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">{visible.map((customer) => <button key={customer._id} onClick={() => setSelected(customer._id)} className="group flex w-full items-center gap-3 px-5 py-4 text-left text-sm transition-colors hover:bg-pink-50 focus-visible:outline-pink-500">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-xs font-semibold text-pink-600">{(customer.displayName || customer.email || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium text-gray-800">{customer.displayName || customer.email}</span><span className="mt-1 block truncate text-xs text-gray-500">{customer.email}</span></span>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${customer.restriction?.type === 'banned' ? 'bg-rose-50 text-rose-700' : customer.restriction?.type === 'suspended' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{customer.restriction?.type || 'Unrestricted'}</span><ChevronRight size={16} aria-hidden="true" className="hidden shrink-0 text-gray-400 group-hover:text-pink-600 sm:block" />
        </button>)}{visible.length === 0 && <div className="flex flex-col items-center px-5 py-12 text-center"><Users size={24} aria-hidden="true" className="mb-3 text-gray-400" /><p className="text-sm font-medium text-gray-700">No customers found</p><p className="mt-1 text-xs text-gray-500">Try a different search or account filter.</p></div>}</div>
        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-xs text-gray-500">Showing {visible.length} of {data.customers.length} customers</div>
      </section>
      <div className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white"><div className="border-b border-gray-100 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Messages awaiting review</h2><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{data.flags.length}</span></div><p className="mt-1 text-xs leading-relaxed text-gray-500">Review flagged messages before deciding on account action.</p></div>{data.flags.length === 0 ? <EmptyQueue /> : <div className="max-h-[560px] space-y-3 overflow-y-auto p-4">{data.flags.map((flag) => <FlagReview key={flag._id} flag={flag} onChange={load} onCustomer={setSelected} />)}<p className="text-xs text-gray-500">Showing up to 100 oldest held messages. Account restrictions require a separate review.</p></div>}</section>
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white"><div className="border-b border-gray-100 p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold">Appeals & existing-order contact</h2><span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700">{data.requests.length}</span></div><p className="mt-1 text-xs leading-relaxed text-gray-500">Help restricted customers with appeals and existing orders.</p></div>{data.requests.length === 0 ? <EmptyQueue support /> : <div className="max-h-[560px] space-y-3 overflow-y-auto p-4">{data.requests.map((request) => <SupportThread key={request._id} request={request} staff onChange={load} />)}<p className="text-xs text-gray-500">Showing up to 100 oldest requests. Restore account access separately after an appeal.</p></div>}</section>
      </div>
      </div>
    </>}
    </div>
  </div>;
}
