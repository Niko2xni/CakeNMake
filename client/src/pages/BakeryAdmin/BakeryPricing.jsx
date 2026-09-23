import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Minus, Plus, Search, Tag, Trash2, X, Zap } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { pricingApi } from '@/services/api';

const STEP_MINOR = 500;
const CATEGORY_LABELS = { base: 'Base cake', structure: 'Size & tiers', sponge: 'Sponge', filling: 'Filling', finish: 'Exterior finish', surface: 'Surface treatment', center: 'Center', edge: 'Edges', side: 'Sides', color: 'Colors', decoration: 'Placed decorations' };
const money = (minor = 0) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(minor) / 100);
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value)) : 'Not scheduled';

function AmountStepper({ label, value, onChange, disabled }) {
  const [inputValue, setInputValue] = useState((value / 100).toFixed(2));

  useEffect(() => {
    setInputValue((value / 100).toFixed(2));
  }, [value]);

  function commitInput() {
    const parsed = Number(inputValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setInputValue((value / 100).toFixed(2));
      return;
    }
    const nextValue = Math.round(parsed * 100);
    setInputValue((nextValue / 100).toFixed(2));
    if (nextValue !== value) onChange(nextValue);
  }

  function applyStep(nextValue) {
    setInputValue((nextValue / 100).toFixed(2));
    onChange(nextValue);
  }

  return <label className="block min-w-[150px]">
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
    <span className="flex h-10 overflow-hidden rounded-xl border border-pink-100 bg-white">
      <button type="button" disabled={disabled || value <= 0} onClick={() => applyStep(Math.max(0, value - STEP_MINOR))} aria-label={`Decrease ${label}`} className="flex w-10 items-center justify-center text-gray-500 hover:bg-pink-50 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
      <span className="relative flex flex-1 items-center border-x border-pink-100"><span className="pointer-events-none absolute left-2 text-xs text-gray-400">₱</span><input type="number" min="0" step="0.01" disabled={disabled} value={inputValue} onChange={(event) => setInputValue(event.target.value)} onBlur={commitInput} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setInputValue((value / 100).toFixed(2)); event.currentTarget.blur(); } }} className="h-full w-full bg-transparent pl-6 pr-2 text-center text-sm font-semibold tabular-nums outline-none" /></span>
      <button type="button" disabled={disabled} onClick={() => applyStep(value + STEP_MINOR)} aria-label={`Increase ${label}`} className="flex w-10 items-center justify-center text-gray-500 hover:bg-pink-50 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
    </span>
  </label>;
}

export default function BakeryPricing() {
  const [workspace, setWorkspace] = useState(null);
  const [draft, setDraft] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await pricingApi.getWorkspace();
      setWorkspace(data); setDraft(data.draft || null);
      setSelectedKey((current) => current || (data.draft || data.active)?.items?.[0]?.componentKey || null);
    } catch (loadError) { setError(loadError.message || 'Could not load pricing.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const source = draft || workspace?.scheduled || workspace?.active;
  const activeIndex = useMemo(() => new Map((workspace?.active?.items || []).map((entry) => [entry.componentKey, entry])), [workspace]);
  const categories = useMemo(() => [...new Set((source?.items || []).map((entry) => entry.category))], [source]);
  const filtered = useMemo(() => (source?.items || []).filter((entry) => `${entry.displayName} ${entry.componentKey}`.toLowerCase().includes(search.toLowerCase()) && (category === 'all' || entry.category === category)), [source, search, category]);
  const selected = source?.items?.find((entry) => entry.componentKey === selectedKey) || filtered[0];
  const activeSelected = selected ? activeIndex.get(selected.componentKey) : null;

  async function ensureDraft() {
    if (draft) return draft;
    const created = await pricingApi.createDraft();
    setDraft(created); setWorkspace((current) => ({ ...current, draft: created }));
    return created;
  }

  async function updateItem(entry, patch) {
    setSavingKey(entry.componentKey); setError('');
    try {
      await ensureDraft();
      const updated = await pricingApi.updateDraftItem(entry.componentKey, patch.costBasisMinor ?? entry.costBasisMinor, patch.markupMinor ?? entry.markupMinor);
      setDraft(updated); setWorkspace((current) => ({ ...current, draft: updated }));
    } catch (saveError) { setError(saveError.message || 'Could not save the draft.'); }
    finally { setSavingKey(null); }
  }

  async function schedule() {
    if (!reason.trim()) { setError('Enter a reason for this pricing update.'); return; }
    try { const scheduled = await pricingApi.scheduleDraft(reason); setReason(''); setDraft(null); setWorkspace((current) => ({ ...current, draft: null, scheduled })); }
    catch (scheduleError) { setError(scheduleError.message || 'Could not schedule pricing.'); }
  }

  async function publishNow() {
    if (!reason.trim()) { setError('Enter a reason for this pricing update.'); return; }
    setPublishing(true); setError('');
    try {
      await pricingApi.publishDraftNow(reason);
      setReason('');
      await load();
    } catch (publishError) { setError(publishError.message || 'Could not publish pricing.'); }
    finally { setPublishing(false); }
  }

  async function discard() {
    try { await pricingApi.discardDraft(); await load(); }
    catch (discardError) { setError(discardError.message || 'Could not discard the draft.'); }
  }

  return <div className="flex h-full flex-col gap-4 xl:flex-row">
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl">
      <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-lg font-bold text-gray-900">Pricing Configuration</h1><p className="text-sm text-gray-500">Cost basis + bakery markup = customer estimate</p></div><div className="text-right text-xs text-gray-500"><p className="font-semibold text-gray-700">Active version {workspace?.active?.version || '—'}</p>{workspace?.scheduled && <p className="text-amber-600">Version {workspace.scheduled.version} scheduled {dateTime(workspace.scheduled.effectiveAt)}</p>}{draft && <p className="text-pink-600">Editing draft version {draft.version}</p>}</div></div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </header>
      <div className="flex-shrink-0 space-y-3 border-b border-pink-100 px-4 py-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pricing components" className="w-full rounded-full border border-pink-100 bg-pink-50/60 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-pink-300" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1"><button onClick={() => setCategory('all')} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${category === 'all' ? 'bg-pink-500 text-white' : 'bg-pink-50 text-gray-600'}`}>All</button>{categories.map((value) => <button key={value} onClick={() => setCategory(value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${category === value ? 'bg-pink-500 text-white' : 'bg-pink-50 text-gray-600'}`}>{CATEGORY_LABELS[value] || value}</button>)}</div>
      </div>
      <CustomScrollbar className="flex-1" contentClassName="p-3 space-y-2">
        {loading ? <p className="py-8 text-center text-sm text-gray-400">Loading pricing…</p> : filtered.map((entry) => <button key={entry.componentKey} onClick={() => setSelectedKey(entry.componentKey)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${selected?.componentKey === entry.componentKey ? 'border-pink-300 bg-pink-50/60' : 'border-pink-100 hover:bg-pink-50/30'}`}><span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-pink-50"><Tag className="h-4 w-4 text-pink-500" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-gray-800">{entry.displayName}</strong><span className="text-xs text-gray-400">{CATEGORY_LABELS[entry.category] || entry.category} · {entry.billingUnit.replace('_', ' ')}</span></span><span className="text-right"><strong className="block text-sm text-pink-600">{money(entry.costBasisMinor + entry.markupMinor)}</strong><span className="text-[10px] text-gray-400">customer estimate</span></span></button>)}
      </CustomScrollbar>
    </div>

    <aside className="flex max-h-[55vh] w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl xl:max-h-none xl:w-96">
      <header className="border-b border-pink-100 px-5 py-4"><h2 className="font-semibold text-gray-900">{selected?.displayName || 'Select a component'}</h2><p className="text-xs text-gray-500">{selected?.componentKey}</p></header>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {selected && <>{!draft && <button onClick={ensureDraft} className="w-full rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-600">Create editable draft</button>}<AmountStepper label="Cost basis" value={selected.costBasisMinor} disabled={!draft || savingKey === selected.componentKey} onChange={(value) => updateItem(selected, { costBasisMinor: value })} /><AmountStepper label="Bakery markup" value={selected.markupMinor} disabled={!draft || savingKey === selected.componentKey} onChange={(value) => updateItem(selected, { markupMinor: value })} /><div className="rounded-xl bg-pink-50 p-4"><div className="flex justify-between text-xs text-gray-500"><span>Cost basis</span><span>{money(selected.costBasisMinor)}</span></div><div className="mt-1 flex justify-between text-xs text-gray-500"><span>Bakery markup</span><span>+ {money(selected.markupMinor)}</span></div><div className="my-3 border-t border-pink-200" /><div className="flex justify-between font-semibold text-gray-900"><span>Customer estimate</span><span className="text-pink-600">{money(selected.costBasisMinor + selected.markupMinor)}</span></div>{activeSelected && <p className="mt-2 text-[11px] text-gray-400">Currently active: {money(activeSelected.costBasisMinor + activeSelected.markupMinor)}</p>}</div></>}
        {draft && <div className="space-y-3 border-t border-pink-100 pt-5"><label className="block text-xs font-semibold text-gray-600">Reason for publication<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Example: Ingredient supplier price update" className="mt-2 w-full resize-none rounded-xl border border-pink-100 p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-pink-300" /></label><button onClick={schedule} disabled={publishing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-50"><CalendarClock className="h-4 w-4" />Schedule for next 10:00 PM</button><button onClick={publishNow} disabled={publishing} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"><Zap className="h-4 w-4" />{publishing ? 'Applying update…' : 'Apply immediately (temporary)'}</button><p className="text-[10px] leading-relaxed text-amber-700">Demo control: activates this draft now without waiting until 10:00 PM.</p><button onClick={discard} disabled={publishing} className="flex w-full items-center justify-center gap-2 rounded-xl border border-pink-100 px-4 py-2.5 text-sm text-gray-600 hover:bg-pink-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Discard draft</button></div>}
        {workspace?.scheduled && !draft && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"><p className="font-semibold">Scheduled version {workspace.scheduled.version}</p><p className="mt-1">Effective {dateTime(workspace.scheduled.effectiveAt)}</p><button onClick={async () => { await pricingApi.cancelScheduled(); await load(); }} className="mt-3 flex items-center gap-1 font-semibold"><X className="h-3.5 w-3.5" />Cancel and return to draft</button></div>}
      </div>
    </aside>
  </div>;
}
