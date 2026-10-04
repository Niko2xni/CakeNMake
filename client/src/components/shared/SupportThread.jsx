import React, { useState } from 'react';
import { moderationApi } from '@/services/chat-api';
import { philippineTime } from '@/lib/moderation';

export default function SupportThread({ request, staff = false, onChange }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(resolve = false) {
    setBusy(true); setError('');
    try { await moderationApi.reply(request._id, reply, resolve); setReply(''); await onChange(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const canReply = staff ? request.status !== 'resolved' : request.status === 'waiting_customer';
  return <article className="rounded-xl border border-pink-100 bg-white p-4 space-y-3">
    <h3 className="font-semibold">{request.kind === 'appeal' ? 'Restriction appeal' : 'Existing-order contact'} {staff && `— ${request.customer?.displayName || request.customer?.email || 'Customer'}`}</h3>
    <p className="text-xs text-gray-500">{request.status.replaceAll('_', ' ')} {request.order && `· Order ${String(request.order).slice(-8)}`}</p>
    <div className="space-y-2 max-h-64 overflow-y-auto">{request.messages.map((message, index) => <div key={message._id || index} className={`p-3 rounded-lg ${message.role === 'customer' ? 'bg-pink-50' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500">{message.role === 'customer' ? 'Customer' : 'Bakery staff'} · {philippineTime(message.at)}</p>
      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
    </div>)}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {canReply ? <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-2">
      <textarea aria-label="Support reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} required className="w-full border border-pink-200 rounded-lg p-2 text-sm" placeholder="Plain-text reply (up to 2,000 characters)" />
      <div className="flex flex-wrap gap-2"><button disabled={busy || !reply.trim()} className="rounded-lg bg-pink-600 text-white px-3 py-2 text-sm disabled:opacity-50">Send reply</button>
        {staff && <button type="button" disabled={busy || !reply.trim()} onClick={() => submit(true)} className="rounded-lg border border-pink-200 px-3 py-2 text-sm disabled:opacity-50">Reply and resolve</button>}
      </div>
    </form> : request.status !== 'resolved' && <p className="text-xs text-gray-500">Wait for staff to reply before sending a follow-up.</p>}
  </article>;
}
