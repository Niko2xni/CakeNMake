import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarClock,
  Check,
  ChevronRight,
  Coins,
  Layers,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  Type,
  X,
  Zap,
  Info,
  Layers2,
  Cake,
  SlidersHorizontal,
  Flame,
  Search,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { pricingApi } from '@/services/api';
import {
  DEFAULT_RATES,
  CENTER_ITEM_META,
  CENTER_DECORATION_META,
  CENTER_PER_PIECE_META,
  TEXT_PRICING_META,
  DRIP_SECTIONS,
  SIDE_SECTIONS,
  EDGE_SECTIONS,
} from '@/lib/cakePricingRules';

const money = (pesos = 0) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(pesos) || 0);

const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      }).format(new Date(value))
    : 'Not scheduled';

function isDeepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}

function PriceStepper({ label, value = 0, activeValue, onChange, disabled, step = 25, min = 0, suffix = '' }) {
  const [inputValue, setInputValue] = useState(String(value ?? 0));

  useEffect(() => {
    setInputValue(String(value ?? 0));
  }, [value]);

  const diff = activeValue !== undefined && value !== activeValue ? value - activeValue : 0;

  function commitInput() {
    const parsed = Number(inputValue);
    if (!Number.isFinite(parsed) || parsed < min) {
      setInputValue(String(value ?? 0));
      return;
    }
    const nextValue = Math.round(parsed);
    setInputValue(String(nextValue));
    if (nextValue !== value) onChange(nextValue);
  }

  function applyStep(delta) {
    const nextValue = Math.max(min, (Number(value) || 0) + delta);
    setInputValue(String(nextValue));
    onChange(nextValue);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-black truncate" title={label}>{label}</span>
        {diff !== 0 && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
              diff > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}
          >
            {diff > 0 ? `+₱${diff}` : `-₱${Math.abs(diff)}`}
          </span>
        )}
      </div>

      <div className={`flex h-10 overflow-hidden rounded-xl border border-pink-100 bg-white transition-all ${
        !disabled ? 'shadow-sm focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-100' : 'bg-pink-50/10'
      }`}>
        {!disabled && (
          <button
            type="button"
            disabled={min !== undefined && value <= min}
            onClick={() => applyStep(-step)}
            aria-label={`Decrease ${label}`}
            className="flex w-10 shrink-0 items-center justify-center text-gray-500 hover:bg-pink-50 disabled:opacity-30 transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        )}

        <div className={`relative flex flex-1 items-center ${!disabled ? 'border-x border-pink-100 bg-pink-50/20' : ''}`}>
          <span className="pointer-events-none absolute left-3 text-xs font-semibold text-gray-400">₱</span>
          <input
            type="number"
            min={min}
            step={step}
            disabled={disabled}
            value={inputValue}
            onChange={(event) => {
              const sanitized = event.target.value.replace(/[^0-9]/g, '');
              setInputValue(sanitized);
            }}
            onPaste={(event) => {
              const pasteText = event.clipboardData.getData('text');
              if (/[^0-9]/.test(pasteText)) {
                event.preventDefault();
                const sanitized = pasteText.replace(/[^0-9]/g, '');
                setInputValue(sanitized);
              }
            }}
            onBlur={commitInput}
            onKeyDown={(event) => {
              if (['+', '-', 'e', 'E', '.'].includes(event.key)) {
                event.preventDefault();
              }
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setInputValue(String(value ?? 0));
                event.currentTarget.blur();
              }
            }}
            className="h-full w-full bg-transparent pl-7 pr-3 text-center text-sm font-semibold tabular-nums text-black outline-none disabled:cursor-default"
          />
          {suffix && <span className="pointer-events-none absolute right-2.5 text-[10px] text-gray-500 hidden sm:inline">{suffix}</span>}
        </div>

        {!disabled && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyStep(step)}
            aria-label={`Increase ${label}`}
            className="flex w-10 shrink-0 items-center justify-center text-gray-500 hover:bg-pink-50 disabled:opacity-30 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function PriceStepperCompact({ value = 0, activeValue, onChange, disabled, step = 25, min = 0 }) {
  const [inputValue, setInputValue] = useState(String(value ?? 0));

  useEffect(() => {
    setInputValue(String(value ?? 0));
  }, [value]);

  const diff = activeValue !== undefined && value !== activeValue ? value - activeValue : 0;

  function commitInput() {
    const parsed = Number(inputValue);
    if (!Number.isFinite(parsed) || parsed < min) {
      setInputValue(String(value ?? 0));
      return;
    }
    const nextValue = Math.round(parsed);
    setInputValue(String(nextValue));
    if (nextValue !== value) onChange(nextValue);
  }

  function applyStep(delta) {
    const nextValue = Math.max(min, (Number(value) || 0) + delta);
    setInputValue(String(nextValue));
    onChange(nextValue);
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {diff !== 0 && (
        <div className="flex justify-end mb-0.5">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
              diff > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}
          >
            {diff > 0 ? `+₱${diff}` : `-₱${Math.abs(diff)}`}
          </span>
        </div>
      )}

      <div className={`flex h-8 w-full overflow-hidden rounded-lg border border-pink-100 bg-white ${
        !disabled ? 'shadow-2xs focus-within:border-pink-400 focus-within:ring-1 focus-within:ring-pink-200' : 'bg-pink-50/15'
      }`}>
        {!disabled && (
          <button
            type="button"
            disabled={min !== undefined && value <= min}
            onClick={() => applyStep(-step)}
            aria-label="Decrease price"
            className="flex w-6 h-full shrink-0 items-center justify-center bg-gray-50 text-gray-600 hover:bg-pink-50 disabled:opacity-30 border-r border-pink-100 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
        )}

        <div className={`relative flex flex-1 h-full items-center justify-center min-w-0 ${!disabled ? 'bg-pink-50/15' : 'bg-transparent'}`}>
          <span className="pointer-events-none absolute left-2 text-[11px] font-medium text-gray-500">₱</span>
          <input
            type="number"
            min={min}
            step={step}
            disabled={disabled}
            value={inputValue}
            onChange={(event) => {
              const sanitized = event.target.value.replace(/[^0-9]/g, '');
              setInputValue(sanitized);
            }}
            onPaste={(event) => {
              const pasteText = event.clipboardData.getData('text');
              if (/[^0-9]/.test(pasteText)) {
                event.preventDefault();
                const sanitized = pasteText.replace(/[^0-9]/g, '');
                setInputValue(sanitized);
              }
            }}
            onBlur={commitInput}
            onKeyDown={(event) => {
              if (['+', '-', 'e', 'E', '.'].includes(event.key)) {
                event.preventDefault();
              }
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setInputValue(String(value ?? 0));
                event.currentTarget.blur();
              }
            }}
            className="h-full w-full bg-transparent pl-4 pr-1 text-center text-xs font-semibold tabular-nums text-black outline-none disabled:cursor-default"
          />
        </div>

        {!disabled && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyStep(step)}
            aria-label="Increase price"
            className="flex w-6 h-full shrink-0 items-center justify-center bg-gray-50 text-gray-600 hover:bg-pink-50 disabled:opacity-30 border-l border-pink-100 transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function computePricingChanges(rates = {}, activeRates = {}) {
  const changes = [];

  function checkDiff(category, name, currentPrice, oldPrice) {
    const curr = Number(currentPrice);
    const old = Number(oldPrice);
    if (!Number.isFinite(curr) || !Number.isFinite(old)) return;
    if (curr !== old) {
      changes.push({
        category,
        name,
        oldPrice: old,
        newPrice: curr,
        diff: curr - old,
      });
    }
  }

  const finishLabels = {
    naked: 'Naked Finish',
    frosted: 'Frosted Finish',
    textured: 'Textured Buttercream',
  };
  const sizeLabels = {
    small: 'Small (6×4)',
    big: 'Big (8×5)',
  };

  // 1. Fundamentals 1-Tier
  ['naked', 'frosted', 'textured'].forEach((finish) => {
    ['small', 'big'].forEach((size) => {
      const curr = rates?.sponge?.[finish]?.[size] ?? DEFAULT_RATES.sponge?.[finish]?.[size];
      const old = activeRates?.sponge?.[finish]?.[size] ?? DEFAULT_RATES.sponge?.[finish]?.[size];
      checkDiff('Fundamentals (1-Tier)', `${finishLabels[finish] || finish} · ${sizeLabels[size] || size}`, curr, old);
    });
  });

  // 2. Fundamentals 2-Tier
  ['naked', 'frosted', 'textured'].forEach((finish) => {
    const curr = rates?.twoTier?.[finish] ?? DEFAULT_RATES.twoTier?.[finish];
    const old = activeRates?.twoTier?.[finish] ?? DEFAULT_RATES.twoTier?.[finish];
    checkDiff('Fundamentals (2-Tier)', `${finishLabels[finish] || finish} Set (2-Tier)`, curr, old);
  });

  // 3. Drip
  DRIP_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const curr = rates?.drip?.[item.id] ?? DEFAULT_RATES.drip?.[item.id] ?? item.defaultPrice;
      const old = activeRates?.drip?.[item.id] ?? DEFAULT_RATES.drip?.[item.id] ?? item.defaultPrice;
      checkDiff('Drip Rates', `${section.title} · ${item.label}`, curr, old);
    });
  });

  // 4. Side
  SIDE_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const curr = rates?.side?.[item.key] ?? DEFAULT_RATES.side?.[item.key] ?? item.defaultPrice;
      const old = activeRates?.side?.[item.key] ?? DEFAULT_RATES.side?.[item.key] ?? item.defaultPrice;
      checkDiff(`Side · ${section.title}`, item.label, curr, old);
    });
  });

  // 5. Edge
  EDGE_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      const curr = rates?.edge?.[item.id] ?? DEFAULT_RATES.edge?.[item.id] ?? item.defaultPrice;
      const old = activeRates?.edge?.[item.id] ?? DEFAULT_RATES.edge?.[item.id] ?? item.defaultPrice;
      checkDiff(`Edge · ${section.title}`, item.label, curr, old);
    });
  });

  // 6. Center Decorations Brackets
  const decBracketKeys = Object.keys(CENTER_DECORATION_META);
  decBracketKeys.forEach((designId) => {
    const currList = rates?.center?.brackets?.[designId] || DEFAULT_RATES.center?.brackets?.[designId] || [];
    const oldList = activeRates?.center?.brackets?.[designId] || DEFAULT_RATES.center?.brackets?.[designId] || [];
    const meta = CENTER_DECORATION_META[designId] || { label: designId, unit: 'pcs' };

    currList.forEach((tier, idx) => {
      const oldTier = oldList[idx] || {};
      const currPrice = tier.price;
      const oldPrice = oldTier.price;
      const prevTier = currList[idx - 1];
      const minQty = prevTier ? prevTier.maxQty + 1 : 1;
      const qtyLabel = tier.maxQty === Infinity ? 'Flat Rate' : `${minQty}–${tier.maxQty} ${meta.unit}`;
      checkDiff('Center (Decorations Brackets)', `${meta.label} · ${qtyLabel}`, currPrice, oldPrice);
    });
  });

  // 7. Center 3D Fondant Text
  const textBracketKeys = Object.keys(TEXT_PRICING_META);
  textBracketKeys.forEach((designId) => {
    const currList = rates?.center?.brackets?.[designId] || DEFAULT_RATES.center?.brackets?.[designId] || [];
    const oldList = activeRates?.center?.brackets?.[designId] || DEFAULT_RATES.center?.brackets?.[designId] || [];
    const meta = TEXT_PRICING_META[designId] || { label: designId, unit: 'letters' };

    currList.forEach((tier, idx) => {
      const oldTier = oldList[idx] || {};
      const currPrice = tier.price;
      const oldPrice = oldTier.price;
      const prevTier = currList[idx - 1];
      const minQty = prevTier ? prevTier.maxQty + 1 : 1;
      const qtyLabel = tier.maxQty === Infinity ? 'Flat Rate' : `${minQty}–${tier.maxQty} ${meta.unit}`;
      checkDiff('Center (3D Fondant Text)', `${meta.label} · ${qtyLabel}`, currPrice, oldPrice);
    });
  });

  // 8. Center Per Piece
  const perPieceKeys = Object.keys(DEFAULT_RATES.center?.perPiece || {});
  perPieceKeys.forEach((designId) => {
    const curr = rates?.center?.perPiece?.[designId] ?? DEFAULT_RATES.center?.perPiece?.[designId];
    const old = activeRates?.center?.perPiece?.[designId] ?? DEFAULT_RATES.center?.perPiece?.[designId];
    const meta = CENTER_ITEM_META[designId] || { label: designId };
    checkDiff('Center (Decorations Per Piece)', `${meta.label}`, curr, old);
  });

  return changes;
}

export default function BakeryPricing() {
  const [workspace, setWorkspace] = useState(null);
  const [draft, setDraft] = useState(null);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [activeTab, setActiveTab] = useState('fundamentals');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [publishModal, setPublishModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);

  // Search & Filter state for Side and Edge lists
  const [sideSearch, setSideSearch] = useState('');
  const [activeSideSection, setActiveSideSection] = useState('all');
  const [edgeSearch, setEdgeSearch] = useState('');
  const [activeEdgeSection, setActiveEdgeSection] = useState('all');

  // Live Simulator state
  const [simLayers, setSimLayers] = useState(1);
  const [simSize, setSimSize] = useState('big');
  const [simFinish, setSimFinish] = useState('frosted');
  const [simSpongeFlavor, setSimSpongeFlavor] = useState('Vanilla');
  const [simFilling, setSimFilling] = useState('Chocolate');
  const [simGlaze, setSimGlaze] = useState(true);
  const [simSideKey, setSimSideKey] = useState('none');
  const [simEdgeId, setSimEdgeId] = useState('none');
  const [simStrawberries, setSimStrawberries] = useState(4);
  const [simBear, setSimBear] = useState(0);
  const [simButtercreamLetters, setSimButtercreamLetters] = useState(0);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await pricingApi.getWorkspace();
      setWorkspace(data);
      const activeRates = data.active?.rates || DEFAULT_RATES;
      const draftRates = data.draft?.rates || activeRates;
      setDraft(data.draft || null);
      setRates(draftRates);
    } catch (loadError) {
      setError(loadError.message || 'Could not load pricing workspace.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeRates = workspace?.active?.rates || DEFAULT_RATES;
  const isDraftActive = Boolean(draft);
  const hasChanges = useMemo(() => {
    if (!draft) return false;
    return !isDeepEqual(rates, activeRates);
  }, [draft, rates, activeRates]);

  const changedItems = useMemo(() => {
    return computePricingChanges(rates, activeRates);
  }, [rates, activeRates]);

  async function ensureDraft() {
    if (draft) return draft;
    const created = await pricingApi.createDraft();
    setDraft(created);
    setWorkspace((current) => ({ ...current, draft: created }));
    if (created.rates) setRates(created.rates);
    return created;
  }

  async function updateRates(updatedRates) {
    setRates(updatedRates);
    setSaving(true);
    setError('');
    try {
      await ensureDraft();
      const updatedDraft = await pricingApi.updateDraftRates(updatedRates);
      setDraft(updatedDraft);
      setWorkspace((current) => ({ ...current, draft: updatedDraft }));
    } catch (err) {
      setError(err.message || 'Failed to save updated rates.');
    } finally {
      setSaving(false);
    }
  }

  // Nested rate update helpers
  const setSpongePrice = (finish, size, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.sponge) next.sponge = { naked: {}, frosted: {}, textured: {} };
    if (!next.sponge[finish]) next.sponge[finish] = {};
    next.sponge[finish][size] = price;
    updateRates(next);
  };

  const setTwoTierPrice = (finish, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.twoTier) next.twoTier = {};
    next.twoTier[finish] = price;
    updateRates(next);
  };

  const setDripItemPrice = (dripId, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.drip) next.drip = {};
    next.drip[dripId] = price;
    updateRates(next);
  };

  const setGlazeRate = (price) => {
    const next = JSON.parse(JSON.stringify(rates));
    next.glazePerTier = price;
    updateRates(next);
  };

  const setSideItemPrice = (sideKey, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.side) next.side = {};
    next.side[sideKey] = price;
    updateRates(next);
  };

  const setEdgeItemPrice = (edgeId, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.edge) next.edge = {};
    next.edge[edgeId] = price;
    updateRates(next);
  };

  const setCenterBracketPrice = (designId, bracketIndex, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.center) next.center = { brackets: {}, perPiece: {} };
    if (!next.center.brackets) next.center.brackets = {};
    if (!next.center.brackets[designId] || !Array.isArray(next.center.brackets[designId]) || next.center.brackets[designId].length === 0) {
      next.center.brackets[designId] = JSON.parse(
        JSON.stringify(DEFAULT_RATES.center?.brackets?.[designId] || [])
      );
    }
    const defBrackets = DEFAULT_RATES.center?.brackets?.[designId] || [];
    while (next.center.brackets[designId].length < defBrackets.length) {
      const idx = next.center.brackets[designId].length;
      next.center.brackets[designId].push({ ...defBrackets[idx] });
    }
    if (next.center.brackets[designId][bracketIndex]) {
      next.center.brackets[designId][bracketIndex].price = price;
    }
    updateRates(next);
  };

  const setCenterPerPiecePrice = (designId, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.center) next.center = { brackets: {}, perPiece: {} };
    if (!next.center.perPiece) next.center.perPiece = {};
    next.center.perPiece[designId] = price;
    updateRates(next);
  };


  async function publishNow() {
    if (!reason.trim()) {
      setError('Please provide a reason for publication.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      await pricingApi.publishDraftNow(reason);
      setReason('');
      setPublishModal(false);
      await load();
    } catch (publishError) {
      setError(publishError.message || 'Could not publish pricing.');
    } finally {
      setPublishing(false);
    }
  }

  async function schedule() {
    if (!reason.trim()) {
      setError('Please provide a reason for scheduling.');
      return;
    }
    try {
      const scheduled = await pricingApi.scheduleDraft(reason);
      setReason('');
      setScheduleModal(false);
      setDraft(null);
      setWorkspace((current) => ({ ...current, draft: null, scheduled }));
    } catch (scheduleError) {
      setError(scheduleError.message || 'Could not schedule pricing.');
    }
  }

  async function discard() {
    if (window.confirm('Discard all uncommitted draft changes?')) {
      try {
        await pricingApi.discardDraft();
        await load();
      } catch (discardError) {
        setError(discardError.message || 'Could not discard draft.');
      }
    }
  }

  // Filtered Side sections & items
  const filteredSideSections = useMemo(() => {
    const q = sideSearch.trim().toLowerCase();
    return SIDE_SECTIONS.filter((section) => {
      if (activeSideSection !== 'all' && section.id !== activeSideSection) return false;
      if (!q) return true;
      const matchSection = section.title.toLowerCase().includes(q) || section.description.toLowerCase().includes(q);
      const matchItems = section.items.some((it) => it.label.toLowerCase().includes(q));
      return matchSection || matchItems;
    }).map((section) => ({
      ...section,
      items: q
        ? section.items.filter((it) => it.label.toLowerCase().includes(q) || section.title.toLowerCase().includes(q))
        : section.items,
    }));
  }, [sideSearch, activeSideSection]);

  // Filtered Edge sections & items
  const filteredEdgeSections = useMemo(() => {
    const q = edgeSearch.trim().toLowerCase();
    return EDGE_SECTIONS.filter((section) => {
      if (activeEdgeSection !== 'all' && section.id !== activeEdgeSection) return false;
      if (!q) return true;
      const matchSection = section.title.toLowerCase().includes(q) || section.description.toLowerCase().includes(q);
      const matchItems = section.items.some((it) => it.label.toLowerCase().includes(q));
      return matchSection || matchItems;
    }).map((section) => ({
      ...section,
      items: q
        ? section.items.filter((it) => it.label.toLowerCase().includes(q) || section.title.toLowerCase().includes(q))
        : section.items,
    }));
  }, [edgeSearch, activeEdgeSection]);

  // Simulation calculator
  const simTotal = useMemo(() => {
    let total = 0;
    const currentRates = rates || DEFAULT_RATES;
    // Sponge
    if (simLayers === 1) {
      total += currentRates.sponge?.[simFinish]?.[simSize] ?? (simFinish === 'textured' ? currentRates.sponge?.frosted?.[simSize] : 0) ?? 0;
    } else {
      total += currentRates.twoTier?.[simFinish] ?? (simFinish === 'textured' ? currentRates.twoTier?.frosted : 0) ?? 0;
    }
    // Glaze
    if (simGlaze) {
      total += (currentRates.glazePerTier || 0) * simLayers;
    }
    // Side
    if (simSideKey !== 'none') {
      const sidePrice = currentRates.side?.[simSideKey] ?? DEFAULT_RATES.side?.[simSideKey] ?? 100;
      total += sidePrice * simLayers;
    }
    // Edge
    if (simEdgeId !== 'none') {
      const edgePrice = currentRates.edge?.[simEdgeId] ?? DEFAULT_RATES.edge?.[simEdgeId] ?? 150;
      total += edgePrice * simLayers;
    }
    // Strawberries bracket (Center Decoration)
    if (simStrawberries > 0) {
      const brackets = currentRates.center?.brackets?.strawberry || [];
      const hit = brackets.find((b) => simStrawberries <= b.maxQty);
      if (hit) total += hit.price;
    }
    // Bear per piece (Center Decoration)
    if (simBear > 0) {
      total += (currentRates.center?.perPiece?.chocolateBear || 0) * simBear;
    }
    // 3D Buttercream Letters (Text Pricing)
    if (simButtercreamLetters > 0) {
      const brackets = currentRates.center?.brackets?.buttercreamText || [];
      const hit = brackets.find((b) => simButtercreamLetters <= b.maxQty);
      if (hit) total += hit.price;
    }
    return total;
  }, [rates, simLayers, simSize, simFinish, simGlaze, simSideKey, simEdgeId, simStrawberries, simBear, simButtercreamLetters]);

  const selectedSideLabel = useMemo(() => {
    if (simSideKey === 'none') return 'None';
    for (const s of SIDE_SECTIONS) {
      const it = s.items.find((i) => i.key === simSideKey);
      if (it) return `${s.title} — ${it.label}`;
    }
    return simSideKey;
  }, [simSideKey]);

  const selectedEdgeLabel = useMemo(() => {
    if (simEdgeId === 'none') return 'None';
    for (const s of EDGE_SECTIONS) {
      const it = s.items.find((i) => i.id === simEdgeId);
      if (it) return `${s.title} — ${it.label}`;
    }
    return simEdgeId;
  }, [simEdgeId]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading bakery pricing rules" className="flex h-full flex-col gap-5 overflow-hidden">
        <div className="flex items-center justify-between rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
          <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="flex min-h-0 flex-1 gap-5 rounded-2xl border border-pink-100 bg-white p-5">
          <section className="hidden w-64 shrink-0 space-y-4 lg:block">
            <Skeleton className="h-8 w-full" />
            {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-11 w-full rounded-xl" />)}
          </section>
          <section className="min-w-0 flex-1 space-y-5">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-7 w-1/3" />
            {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-16 w-full rounded-xl" />)}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bakery Pricing Rules</h1>
              <p className="text-xs text-gray-500">
                Configure rates for fundamentals, independent side & edge designs, and center decorations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right text-xs">
            <span className="font-semibold text-gray-700">
              Active v{workspace?.active?.version || 1}
            </span>
            {workspace?.scheduled && (
              <p className="text-amber-600 font-medium">
                v{workspace.scheduled.version} effective {dateTime(workspace.scheduled.effectiveAt)}
              </p>
            )}
            {draft && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700">
                Editing draft v{draft.version} {saving ? '• Saving…' : ''}
              </span>
            )}
          </div>

          {!draft ? (
            <button
              type="button"
              onClick={ensureDraft}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Edit Pricing Draft
            </button>
          ) : (
            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={discard}
                title="Discard uncommitted changes"
                className="flex items-center gap-1.5 rounded-xl border border-pink-100 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Discard
              </button>

              <button
                type="button"
                disabled={!hasChanges || saving || publishing}
                onClick={() => setScheduleModal(true)}
                title={!hasChanges ? 'No changes made to the pricing draft' : 'Schedule pricing update for 10 PM'}
                className="flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-3.5 py-2 text-xs font-semibold text-pink-700 hover:bg-pink-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-pink-50"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Schedule (10 PM)
              </button>

              <button
                type="button"
                disabled={!hasChanges || saving || publishing}
                onClick={() => setPublishModal(true)}
                title={!hasChanges ? 'No changes made to the pricing draft' : 'Publish pricing update immediately'}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-primary"
              >
                <Zap className="h-3.5 w-3.5" />
                Publish Now
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-100 rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Content: Categories & Editor Grid */}
      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row">
        {/* Left Column: Navigation Tabs */}
        <div className="flex w-full flex-col gap-4 lg:w-80 shrink-0">
          <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm space-y-1">
            {[
              { id: 'fundamentals', label: 'Fundamentals', icon: Cake, desc: 'Base sponge, 1 & 2 tier pricing' },
              { id: 'side', label: 'Side', icon: Layers, desc: '42 independent item rates' },
              { id: 'edge', label: 'Edge', icon: Layers2, desc: '54 independent item rates' },
              { id: 'center', label: 'Center', icon: Tag, desc: 'Decorations & 3D text rates' },
              { id: 'simulator', label: 'Live Quote Tester', icon: SlidersHorizontal, desc: 'Simulate custom cake estimates' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id || (tab.id === 'center' && (activeTab === 'centerDecorations' || activeTab === 'textPricing'));
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-md shadow-primary/20 font-semibold'
                      : 'text-gray-700 hover:bg-pink-50/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold leading-tight">{tab.label}</span>
                    <span className={`block text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                      {tab.desc}
                    </span>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-gray-300'}`} />
                </button>
              );
            })}
          </div>

          {/* Quick Summary Card */}
          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/50 to-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-xs font-bold text-gray-800">Pricing Logic Rules</h3>
            </div>
            <ul className="text-[11px] text-gray-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span><strong>Filling & Flavors:</strong> Part of sponge price (₱0 extra charge).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span><strong>Side & Edge:</strong> Each item has its own independent price, applied per tier.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span><strong>Center:</strong> Split into Decorations Rates and 3D Fondant Text Rates.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Active Category Editor Panel */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
          <CustomScrollbar className="flex-1" contentClassName="p-6 space-y-6">
            {/* 1. Fundamentals Tab */}
            {activeTab === 'fundamentals' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-gray-900">1-Tier Cake Pricing</h2>
                  <p className="text-xs text-gray-500">
                    Sponge base cake pricing by size (6×4 Small vs 8×5 Big) and finish style.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Naked 1-Tier */}
                  <div className="rounded-2xl border border-pink-100 bg-white p-4 space-y-3.5 shadow-xs">
                    <div>
                      <h3 className="text-sm font-bold text-black">Naked Finish | 1-Tier</h3>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">Exposed sponge layers · Sponge flavor & filling included (₱0)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <PriceStepper
                        label="Small (6×4)"
                        value={rates.sponge?.naked?.small ?? 700}
                        activeValue={activeRates.sponge?.naked?.small}
                        disabled={!isDraftActive}
                        onChange={(val) => setSpongePrice('naked', 'small', val)}
                      />
                      <PriceStepper
                        label="Big (8×5)"
                        value={rates.sponge?.naked?.big ?? 1500}
                        activeValue={activeRates.sponge?.naked?.big}
                        disabled={!isDraftActive}
                        onChange={(val) => setSpongePrice('naked', 'big', val)}
                      />
                    </div>
                  </div>

                  {/* Frosted 1-Tier */}
                  <div className="rounded-2xl border border-pink-100 bg-white p-4 space-y-3.5 shadow-xs">
                    <div>
                      <h3 className="text-sm font-bold text-black">Frosted Finish | 1-Tier</h3>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">Smooth frosted exterior · Sponge flavor & filling included (₱0)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <PriceStepper
                        label="Small (6×4)"
                        value={rates.sponge?.frosted?.small ?? 1000}
                        activeValue={activeRates.sponge?.frosted?.small}
                        disabled={!isDraftActive}
                        onChange={(val) => setSpongePrice('frosted', 'small', val)}
                      />
                      <PriceStepper
                        label="Big (8×5)"
                        value={rates.sponge?.frosted?.big ?? 1700}
                        activeValue={activeRates.sponge?.frosted?.big}
                        disabled={!isDraftActive}
                        onChange={(val) => setSpongePrice('frosted', 'big', val)}
                      />
                    </div>
                  </div>

                  {/* Textured 1-Tier */}
                  <div className="rounded-2xl border border-pink-100 bg-white p-4 space-y-3.5 shadow-xs">
                    <div>
                      <h3 className="text-sm font-bold text-black">Textured Buttercream | 1-Tier</h3>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">Artisanal textured ridges · Sponge flavor & filling included (₱0)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <PriceStepper
                        label="Small (6×4)"
                        value={rates.sponge?.textured?.small ?? 1000}
                        activeValue={activeRates.sponge?.textured?.small}
                        disabled={!isDraftActive}
                        onChange={(val) => setSpongePrice('textured', 'small', val)}
                      />
                      <PriceStepper
                        label="Big (8×5)"
                        value={rates.sponge?.textured?.big ?? 1700}
                        activeValue={activeRates.sponge?.textured?.big}
                        disabled={!isDraftActive}
                        onChange={(val) => setSpongePrice('textured', 'big', val)}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-pink-100" />

                <div>
                  <h2 className="text-base font-bold text-gray-900">2-Tier Cake Pricing</h2>
                  <p className="text-xs text-gray-500">
                    Priced as a combined tiered set. Sponge flavors and fillings across both tiers are included at no extra charge.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-pink-100 bg-white p-4 space-y-3 shadow-xs">
                    <div>
                      <h3 className="text-sm font-bold text-black">Naked Set | 2-Tier</h3>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">Sponge flavor & filling included (₱0)</p>
                    </div>
                    <PriceStepper
                      label="Big (8×5)"
                      value={rates.twoTier?.naked ?? 2200}
                      activeValue={activeRates.twoTier?.naked}
                      disabled={!isDraftActive}
                      step={50}
                      onChange={(val) => setTwoTierPrice('naked', val)}
                    />
                  </div>

                  <div className="rounded-2xl border border-pink-100 bg-white p-4 space-y-3 shadow-xs">
                    <div>
                      <h3 className="text-sm font-bold text-black">Frosted Set | 2-Tier</h3>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">Sponge flavor & filling included (₱0)</p>
                    </div>
                    <PriceStepper
                      label="Big (8×5)"
                      value={rates.twoTier?.frosted ?? 2700}
                      activeValue={activeRates.twoTier?.frosted}
                      disabled={!isDraftActive}
                      step={50}
                      onChange={(val) => setTwoTierPrice('frosted', val)}
                    />
                  </div>

                  <div className="rounded-2xl border border-pink-100 bg-white p-4 space-y-3 shadow-xs">
                    <div>
                      <h3 className="text-sm font-bold text-black">Textured Set | 2-Tier</h3>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">Sponge flavor & filling included (₱0)</p>
                    </div>
                    <PriceStepper
                      label="Big (8×5)"
                      value={rates.twoTier?.textured ?? 2700}
                      activeValue={activeRates.twoTier?.textured}
                      disabled={!isDraftActive}
                      step={50}
                      onChange={(val) => setTwoTierPrice('textured', val)}
                    />
                  </div>
                </div>

                <hr className="border-pink-100" />

                {/* Drip Section inside Fundamentals */}
                <div>
                  <h2 className="text-base font-bold text-gray-900">Drip Rates</h2>
                </div>

                <div className="space-y-8 divide-y divide-pink-100">
                  {DRIP_SECTIONS.map((section, sIdx) => (
                    <div key={section.id} className={sIdx > 0 ? 'pt-6' : ''}>
                      <div className="mb-3">
                        <h3 className="text-sm font-bold text-black">
                          {section.title} | {section.items.length} items
                        </h3>
                        <p className="text-[11.5px] text-gray-500 mt-0.5">{section.description}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                        {section.items.map((item, index) => {
                          const val = rates.drip?.[item.id] ?? DEFAULT_RATES.drip?.[item.id] ?? item.defaultPrice;
                          const activeVal = activeRates.drip?.[item.id] ?? DEFAULT_RATES.drip?.[item.id] ?? item.defaultPrice;
                          return (
                            <div
                              key={item.id}
                              className={`flex flex-col justify-between rounded-xl border border-pink-100 bg-white p-2.5 shadow-xs transition-all ${
                                isDraftActive ? 'hover:border-pink-300 hover:shadow-sm' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2 min-h-[34px]">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-xs">
                                  {index + 1}
                                </span>
                                <p className="text-xs font-medium text-black line-clamp-2 leading-tight" title={item.label}>
                                  {item.label}
                                </p>
                              </div>
                              <PriceStepperCompact
                                value={val}
                                activeValue={activeVal}
                                disabled={!isDraftActive}
                                step={25}
                                onChange={(newPrice) => setDripItemPrice(item.id, newPrice)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Side Tab */}
            {activeTab === 'side' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Side Design Rates (By Section)</h2>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search side designs..."
                      value={sideSearch}
                      onChange={(e) => setSideSearch(e.target.value)}
                      className="h-9 w-full rounded-xl border border-pink-100 bg-white pl-8 pr-8 text-xs font-medium text-black placeholder-gray-400 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                    />
                    {sideSearch && (
                      <button
                        onClick={() => setSideSearch('')}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Quick Jump Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveSideSection('all')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      activeSideSection === 'all'
                        ? 'bg-primary text-white shadow-sm font-semibold'
                        : 'bg-pink-50/50 text-black hover:bg-pink-100/60 border border-pink-100'
                    }`}
                  >
                    All Sections (42)
                  </button>
                  {SIDE_SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSideSection(s.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                        activeSideSection === s.id
                          ? 'bg-primary text-white shadow-sm font-semibold'
                          : 'bg-pink-50/50 text-black hover:bg-pink-100/60 border border-pink-100'
                      }`}
                    >
                      {s.title} ({s.items.length})
                    </button>
                  ))}
                </div>

                {/* Sections List */}
                <div className="space-y-8 divide-y divide-pink-100">
                  {filteredSideSections.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-pink-100 bg-pink-50/20 text-xs text-gray-500">
                      No side designs matched &ldquo;{sideSearch}&rdquo;.
                    </div>
                  ) : (
                    filteredSideSections.map((section, sIdx) => (
                      <div key={section.id} className={sIdx > 0 ? 'pt-6' : ''}>
                        <div className="mb-3">
                          <h3 className="text-sm font-bold text-black">
                            {section.title} | {section.items.length} items
                          </h3>
                          <p className="text-[11.5px] text-gray-500 mt-0.5">{section.description}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                          {section.items.map((item, index) => {
                            const val = rates.side?.[item.key] ?? DEFAULT_RATES.side?.[item.key] ?? item.defaultPrice;
                            const activeVal = activeRates.side?.[item.key] ?? DEFAULT_RATES.side?.[item.key] ?? item.defaultPrice;
                            return (
                              <div
                                key={item.key}
                                className={`flex flex-col justify-between rounded-xl border border-pink-100 bg-white p-2.5 shadow-xs transition-all ${
                                  isDraftActive ? 'hover:border-pink-300 hover:shadow-sm' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2 min-h-[34px]">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-xs">
                                    {index + 1}
                                  </span>
                                  <p className="text-xs font-medium text-black line-clamp-2 leading-tight" title={item.label}>
                                    {item.label}
                                  </p>
                                </div>
                                <PriceStepperCompact
                                  value={val}
                                  activeValue={activeVal}
                                  disabled={!isDraftActive}
                                  step={25}
                                  onChange={(newPrice) => setSideItemPrice(item.key, newPrice)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. Edge Trims Tab */}
            {activeTab === 'edge' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Edge Trim Rates (By Section)</h2>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search edge trims..."
                      value={edgeSearch}
                      onChange={(e) => setEdgeSearch(e.target.value)}
                      className="h-9 w-full rounded-xl border border-pink-100 bg-white pl-8 pr-8 text-xs font-medium text-black placeholder-gray-400 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                    />
                    {edgeSearch && (
                      <button
                        onClick={() => setEdgeSearch('')}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Quick Jump Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveEdgeSection('all')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      activeEdgeSection === 'all'
                        ? 'bg-primary text-white shadow-sm font-semibold'
                        : 'bg-pink-50/50 text-black hover:bg-pink-100/60 border border-pink-100'
                    }`}
                  >
                    All Sections (54)
                  </button>
                  {EDGE_SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveEdgeSection(s.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                        activeEdgeSection === s.id
                          ? 'bg-primary text-white shadow-sm font-semibold'
                          : 'bg-pink-50/50 text-black hover:bg-pink-100/60 border border-pink-100'
                      }`}
                    >
                      {s.title} ({s.items.length})
                    </button>
                  ))}
                </div>

                {/* Sections List */}
                <div className="space-y-8 divide-y divide-pink-100">
                  {filteredEdgeSections.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-pink-100 bg-pink-50/20 text-xs text-gray-500">
                      No edge trims matched &ldquo;{edgeSearch}&rdquo;.
                    </div>
                  ) : (
                    filteredEdgeSections.map((section, sIdx) => (
                      <div key={section.id} className={sIdx > 0 ? 'pt-6' : ''}>
                        <div className="mb-3">
                          <h3 className="text-sm font-bold text-black">
                            {section.title} | {section.items.length} items
                          </h3>
                          <p className="text-[11.5px] text-gray-500 mt-0.5">{section.description}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                          {section.items.map((item, index) => {
                            const val = rates.edge?.[item.id] ?? DEFAULT_RATES.edge?.[item.id] ?? item.defaultPrice;
                            const activeVal = activeRates.edge?.[item.id] ?? DEFAULT_RATES.edge?.[item.id] ?? item.defaultPrice;
                            return (
                              <div
                                key={item.id}
                                className={`flex flex-col justify-between rounded-xl border border-pink-100 bg-white p-2.5 shadow-xs transition-all ${
                                  isDraftActive ? 'hover:border-pink-300 hover:shadow-sm' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2 min-h-[34px]">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-xs">
                                    {index + 1}
                                  </span>
                                  <p className="text-xs font-medium text-black line-clamp-2 leading-tight" title={item.label}>
                                    {item.label}
                                  </p>
                                </div>
                                <PriceStepperCompact
                                  value={val}
                                  activeValue={activeVal}
                                  disabled={!isDraftActive}
                                  step={25}
                                  onChange={(newPrice) => setEdgeItemPrice(item.id, newPrice)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. Center (Split: Decorations Rates & 3D Text Rates) */}
            {(activeTab === 'center' || activeTab === 'centerDecorations' || activeTab === 'textPricing') && (
              <div className="space-y-6">
                {/* Split 2-Column Grid with Vertical Dividing Border Line */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 divide-y xl:divide-y-0 xl:divide-x divide-pink-100 items-start">
                  {/* Left Column: Decorations Rates */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-pink-100">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Decorations Rates</h3>
                        <p className="text-[11px] text-gray-500">Topper quantity brackets & per-piece figure rates</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Quantity Bracket Items */}
                      {Object.entries(CENTER_DECORATION_META).map(([designId, meta]) => {
                        const defaultBrackets = DEFAULT_RATES.center?.brackets?.[designId] || [];
                        const rawBrackets = rates.center?.brackets?.[designId] || [];
                        const rawActiveBrackets = activeRates.center?.brackets?.[designId] || [];

                        const brackets = defaultBrackets.map((defB, idx) => ({
                          maxQty: rawBrackets[idx]?.maxQty ?? defB.maxQty,
                          price: rawBrackets[idx]?.price ?? defB.price,
                        }));

                        const activeBrackets = defaultBrackets.map((defB, idx) => ({
                          maxQty: rawActiveBrackets[idx]?.maxQty ?? defB.maxQty,
                          price: rawActiveBrackets[idx]?.price ?? defB.price,
                        }));

                        return (
                          <div key={designId} className="rounded-2xl border border-pink-100 bg-pink-50/20 p-3.5 space-y-3">
                            <h5 className="text-xs font-bold text-gray-800">{meta.label}</h5>
                            <p className="text-[10px] text-gray-500 leading-tight">{meta.description}</p>

                            <div className="space-y-2">
                              {brackets.map((bracket, idx) => {
                                const label =
                                  bracket.maxQty === Infinity
                                    ? 'Flat rate'
                                    : idx === 0
                                    ? `1 – ${bracket.maxQty}`
                                    : `${brackets[idx - 1].maxQty + 1} – ${bracket.maxQty}`;

                                return (
                                  <PriceStepper
                                    key={idx}
                                    label={label}
                                    value={bracket.price}
                                    activeValue={activeBrackets[idx]?.price}
                                    disabled={!isDraftActive}
                                    step={25}
                                    onChange={(val) => setCenterBracketPrice(designId, idx, val)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Chocolate Bear (Per-Piece Figure) in matching box size */}
                      <div className="rounded-2xl border border-pink-100 bg-pink-50/20 p-3.5 space-y-3">
                        <h5 className="text-xs font-bold text-gray-800">Chocolate Bear</h5>
                        <p className="text-[10px] text-gray-500 leading-tight">Large sculpted 3D chocolate figure topper</p>

                        <div className="space-y-2">
                          <PriceStepper
                            label="1"
                            value={rates.center?.perPiece?.chocolateBear ?? 200}
                            activeValue={activeRates.center?.perPiece?.chocolateBear}
                            disabled={!isDraftActive}
                            step={50}
                            onChange={(val) => setCenterPerPiecePrice('chocolateBear', val)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 3D Text Rates (Divided by split border) */}
                  <div className="space-y-4 xl:pl-8 pt-6 xl:pt-0">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-pink-100">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Type className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">3D Text Rates</h3>
                        <p className="text-[11px] text-gray-500">Tiered quantity brackets for 3D standing fondant letters</p>
                      </div>
                    </div>

                    {/* 3D Fondant Text in one single compact box */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {(() => {
                        const defaultBrackets = DEFAULT_RATES.center?.brackets?.buttercreamText || [
                          { maxQty: 10, price: 50 },
                          { maxQty: 20, price: 100 },
                          { maxQty: 30, price: 150 },
                          { maxQty: 40, price: 200 },
                          { maxQty: 50, price: 250 },
                        ];
                        const rawBrackets = rates.center?.brackets?.buttercreamText || [];
                        const rawActiveBrackets = activeRates.center?.brackets?.buttercreamText || [];

                        const brackets = defaultBrackets.map((defB, idx) => ({
                          maxQty: rawBrackets[idx]?.maxQty ?? defB.maxQty,
                          price: rawBrackets[idx]?.price ?? defB.price,
                        }));

                        const activeBrackets = defaultBrackets.map((defB, idx) => ({
                          maxQty: rawActiveBrackets[idx]?.maxQty ?? defB.maxQty,
                          price: rawActiveBrackets[idx]?.price ?? defB.price,
                        }));

                        return (
                          <div className="rounded-2xl border border-pink-100 bg-pink-50/20 p-3.5 space-y-3">
                            <h5 className="text-xs font-bold text-gray-800">3D Fondant Text</h5>
                            <p className="text-[10px] text-gray-500 leading-tight">Hand-placed individual 3D standing fondant letters</p>

                            <div className="space-y-2">
                              {brackets.map((bracket, idx) => {
                                const minQty = idx === 0 ? 1 : brackets[idx - 1].maxQty + 1;
                                const label = `${minQty} – ${bracket.maxQty}`;

                                return (
                                  <PriceStepper
                                    key={idx}
                                    label={label}
                                    value={bracket.price}
                                    activeValue={activeBrackets[idx]?.price}
                                    disabled={!isDraftActive}
                                    step={25}
                                    onChange={(val) => setCenterBracketPrice('buttercreamText', idx, val)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Live Quote Tester */}
            {activeTab === 'simulator' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Live Cake Estimate Simulator</h2>
                  <p className="text-xs text-gray-500">
                    Test how current draft pricing rules calculate customer estimates across different cake configurations.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Controls */}
                  <div className="rounded-2xl border border-pink-100 bg-pink-50/20 p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Configure Test Cake</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Tiers</label>
                        <div className="flex gap-2">
                          {[1, 2].map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setSimLayers(l)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                simLayers === l ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                              }`}
                            >
                              {l} Tier{l > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      {simLayers === 1 && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">1-Tier Size</label>
                          <div className="flex gap-2">
                            {['small', 'big'].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSimSize(s)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                                  simSize === s ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                                }`}
                              >
                                {s === 'small' ? '6×4 (Small)' : '8×5 (Big)'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sponge Flavor & Filling Selectors */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-600">Sponge Flavor</label>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Incl. (₱0)</span>
                          </div>
                          <select
                            value={simSpongeFlavor}
                            onChange={(e) => setSimSpongeFlavor(e.target.value)}
                            className="w-full rounded-xl border border-pink-100 bg-white p-2 text-xs font-semibold text-gray-800 outline-none"
                          >
                            {['Vanilla', 'Chocolate', 'Strawberry', 'Cheese', 'Ube', 'Mocha', 'Plain'].map((flv) => (
                              <option key={flv} value={flv}>{flv} Sponge</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-600">Filling</label>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Incl. (₱0)</span>
                          </div>
                          <select
                            value={simFilling}
                            onChange={(e) => setSimFilling(e.target.value)}
                            className="w-full rounded-xl border border-pink-100 bg-white p-2 text-xs font-semibold text-gray-800 outline-none"
                          >
                            {['Vanilla', 'Chocolate', 'Strawberry', 'Cheese', 'Ube', 'Mocha', 'None'].map((flv) => (
                              <option key={flv} value={flv}>{flv === 'None' ? 'No Filling' : `${flv} Filling`}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Finish</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'naked', label: 'Naked' },
                            { id: 'frosted', label: 'Frosted' },
                            { id: 'textured', label: 'Textured' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setSimFinish(f.id)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                simFinish === f.id ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Surface Drip</label>
                        <button
                          type="button"
                          onClick={() => setSimGlaze(!simGlaze)}
                          className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            simGlaze ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                          }`}
                        >
                          {simGlaze ? 'Drip Applied' : 'No Drip'}
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Side Treatment</label>
                        <select
                          value={simSideKey}
                          onChange={(e) => setSimSideKey(e.target.value)}
                          className="w-full rounded-xl border border-pink-100 bg-white p-2 text-xs font-semibold text-gray-800 outline-none"
                        >
                          <option value="none">None (₱0)</option>
                          {SIDE_SECTIONS.map((section) => (
                            <optgroup key={section.id} label={section.title}>
                              {section.items.map((it) => (
                                <option key={it.key} value={it.key}>
                                  {it.label} ({money(rates.side?.[it.key] ?? DEFAULT_RATES.side?.[it.key] ?? it.defaultPrice)})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Edge Trim</label>
                        <select
                          value={simEdgeId}
                          onChange={(e) => setSimEdgeId(e.target.value)}
                          className="w-full rounded-xl border border-pink-100 bg-white p-2 text-xs font-semibold text-gray-800 outline-none"
                        >
                          <option value="none">None (₱0)</option>
                          {EDGE_SECTIONS.map((section) => (
                            <optgroup key={section.id} label={section.title}>
                              {section.items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.label} ({money(rates.edge?.[it.id] ?? DEFAULT_RATES.edge?.[it.id] ?? it.defaultPrice)})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* Center Decorations Simulation */}
                      <div className="pt-2 border-t border-pink-100/60 space-y-3">
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">Center Decorations</span>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Strawberries ({simStrawberries} pcs)</label>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={simStrawberries}
                            onChange={(e) => setSimStrawberries(Number(e.target.value))}
                            className="w-full accent-primary"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Chocolate Bears ({simBear} pcs)</label>
                          <input
                            type="range"
                            min={0}
                            max={3}
                            value={simBear}
                            onChange={(e) => setSimBear(Number(e.target.value))}
                            className="w-full accent-primary"
                          />
                        </div>
                      </div>

                      {/* Text Pricing Simulation */}
                      <div className="pt-2 border-t border-pink-100/60 space-y-3">
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">Text Pricings</span>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">
                            3D Fondant Letters ({simButtercreamLetters} letters)
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            step={5}
                            value={simButtercreamLetters}
                            onChange={(e) => setSimButtercreamLetters(Number(e.target.value))}
                            className="w-full accent-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Breakdown */}
                  <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Estimated Breakdown</h3>

                      <div className="space-y-2 text-xs divide-y divide-pink-50">
                        <div className="flex justify-between py-1 text-gray-700">
                          <div className="flex flex-col">
                            <span>
                              {simLayers === 1
                                ? `1-Tier ${simFinish === 'naked' ? 'Naked' : simFinish === 'textured' ? 'Textured' : 'Frosted'} (${simSize === 'big' ? '8×5' : '6×4'})`
                                : `2-Tier ${simFinish === 'naked' ? 'Naked' : simFinish === 'textured' ? 'Textured' : 'Frosted'} Set`}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {simSpongeFlavor} Sponge {simFilling !== 'None' ? `· ${simFilling} Filling` : '· No Filling'} (Included in base)
                            </span>
                          </div>
                          <span className="font-bold">
                            {money(
                              simLayers === 1
                                ? (rates.sponge?.[simFinish]?.[simSize] ?? (simFinish === 'textured' ? rates.sponge?.frosted?.[simSize] : 0))
                                : (rates.twoTier?.[simFinish] ?? (simFinish === 'textured' ? rates.twoTier?.frosted : 0))
                            )}
                          </span>
                        </div>

                        {simGlaze && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>Drip ({simLayers} tier{simLayers > 1 ? 's' : ''})</span>
                            <span className="font-bold">{money((rates.glazePerTier || 0) * simLayers)}</span>
                          </div>
                        )}

                        {simSideKey !== 'none' && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>Side ({selectedSideLabel} × {simLayers})</span>
                            <span className="font-bold">
                              {money((rates.side?.[simSideKey] ?? DEFAULT_RATES.side?.[simSideKey] ?? 100) * simLayers)}
                            </span>
                          </div>
                        )}

                        {simEdgeId !== 'none' && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>Edge ({selectedEdgeLabel} × {simLayers})</span>
                            <span className="font-bold">
                              {money((rates.edge?.[simEdgeId] ?? DEFAULT_RATES.edge?.[simEdgeId] ?? 150) * simLayers)}
                            </span>
                          </div>
                        )}

                        {simStrawberries > 0 && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>Strawberries ({simStrawberries} pcs bracket)</span>
                            <span className="font-bold">
                              {money(
                                (rates.center?.brackets?.strawberry || []).find((b) => simStrawberries <= b.maxQty)?.price || 0
                              )}
                            </span>
                          </div>
                        )}

                        {simBear > 0 && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>Chocolate Bear ({simBear} pcs @ {money(rates.center?.perPiece?.chocolateBear || 0)})</span>
                            <span className="font-bold">{money((rates.center?.perPiece?.chocolateBear || 0) * simBear)}</span>
                          </div>
                        )}

                        {simButtercreamLetters > 0 && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>3D Fondant Letters ({simButtercreamLetters} letters bracket)</span>
                            <span className="font-bold">
                              {money(
                                (rates.center?.brackets?.buttercreamText || []).find((b) => simButtercreamLetters <= b.maxQty)?.price || 0
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">Total Customer Estimate</span>
                      <span className="text-xl font-extrabold text-primary">{money(simTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CustomScrollbar>
        </div>
      </div>

      {/* Publish Now Modal */}
      {publishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-pink-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Review & Publish Pricing Now</h3>
                  <p className="text-xs text-gray-500">Live storefront immediate update</p>
                </div>
              </div>
              <button
                onClick={() => setPublishModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Please review all modified rates below before publishing them live to customers immediately:
            </p>

            {/* Changed Items List */}
            <div className="flex-1 overflow-y-auto max-h-60 rounded-xl border border-pink-100 bg-pink-50/20 p-3 space-y-2">
              {changedItems.length === 0 ? (
                <p className="text-xs text-center text-gray-500 py-4">No price changes detected.</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 px-1 pb-1">
                    <span>{changedItems.length} Changed {changedItems.length === 1 ? 'Item' : 'Items'}</span>
                    <span>Old Price → New Price</span>
                  </div>
                  {changedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-pink-100 shadow-2xs text-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-primary truncate">{item.category}</span>
                        <span className="font-semibold text-gray-900 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-400 line-through tabular-nums text-[11px]">
                          {money(item.oldPrice)}
                        </span>
                        <span className="text-gray-400 text-xs">→</span>
                        <span className="font-bold text-gray-900 tabular-nums">
                          {money(item.newPrice)}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.diff > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {item.diff > 0 ? `+₱${item.diff}` : `-₱${Math.abs(item.diff)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">
                  Audit Reason / Description <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className="text-[10px] text-gray-400">Required</span>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. Updated 11-50 buttercream text tiers and drip rates..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-pink-100 bg-pink-50/20 p-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-pink-400 focus:bg-white transition-colors"
              />
              {!reason.trim() && (
                <p className="text-[11px] text-rose-500 font-medium">
                  Please enter a reason for this pricing update to proceed.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-pink-100">
              <button
                type="button"
                onClick={() => setPublishModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim() || publishing}
                onClick={publishNow}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:shadow-none"
              >
                {publishing ? 'Publishing…' : 'Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-pink-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Review & Schedule Pricing</h3>
                  <p className="text-xs text-gray-500">Auto-activates at 10:00 PM Manila</p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Please review all modified rates below before scheduling them for automatic 10:00 PM activation:
            </p>

            {/* Changed Items List */}
            <div className="flex-1 overflow-y-auto max-h-60 rounded-xl border border-pink-100 bg-pink-50/20 p-3 space-y-2">
              {changedItems.length === 0 ? (
                <p className="text-xs text-center text-gray-500 py-4">No price changes detected.</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 px-1 pb-1">
                    <span>{changedItems.length} Changed {changedItems.length === 1 ? 'Item' : 'Items'}</span>
                    <span>Old Price → New Price</span>
                  </div>
                  {changedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-pink-100 shadow-2xs text-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-primary truncate">{item.category}</span>
                        <span className="font-semibold text-gray-900 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-400 line-through tabular-nums text-[11px]">
                          {money(item.oldPrice)}
                        </span>
                        <span className="text-gray-400 text-xs">→</span>
                        <span className="font-bold text-gray-900 tabular-nums">
                          {money(item.newPrice)}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.diff > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {item.diff > 0 ? `+₱${item.diff}` : `-₱${Math.abs(item.diff)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">
                  Audit Reason / Description <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className="text-[10px] text-gray-400">Required</span>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. Scheduled regular price updates for upcoming menu..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-pink-100 bg-pink-50/20 p-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-pink-400 focus:bg-white transition-colors"
              />
              {!reason.trim() && (
                <p className="text-[11px] text-rose-500 font-medium">
                  Please enter a reason for this pricing update to proceed.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-pink-100">
              <button
                type="button"
                onClick={() => setScheduleModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim()}
                onClick={schedule}
                className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-pink-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-pink-600 disabled:shadow-none"
              >
                Confirm & Schedule (10 PM)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
