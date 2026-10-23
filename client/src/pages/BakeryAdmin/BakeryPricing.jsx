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

  const flavorLabels = {
    plain: 'Plain Sponge (6×4 Base)',
    vanilla: 'Vanilla Sponge (6×4 Base)',
    cheese: 'Cheese Sponge (6×4 Base)',
    chocolate: 'Chocolate Sponge (6×4 Base)',
    strawberry: 'Strawberry Sponge (6×4 Base)',
    ube: 'Ube Sponge (6×4 Base)',
    mocha: 'Mocha Sponge (6×4 Base)',
    pickColor: 'All Pick Colors (6×4 Base)',
  };

  const sizeLabels = {
    '6x4': '6×4 Size Factor',
    '8x6': '8×6 Size Factor',
    '10x8': '10×8 Size Factor',
    '12x10': '12×10 Size Factor',
  };

  // 1. Fundamentals: Sponge Flavors & Custom Pick Color Base Rates
  Object.keys(flavorLabels).forEach((key) => {
    const curr = rates?.flavors?.[key] ?? DEFAULT_RATES.flavors?.[key];
    const old = activeRates?.flavors?.[key] ?? DEFAULT_RATES.flavors?.[key];
    checkDiff('Fundamentals · Sponge Flavors', flavorLabels[key], curr, old);
  });

  // 2. Fundamentals: Size Factor Add-ons
  Object.keys(sizeLabels).forEach((key) => {
    const curr = rates?.sizes?.[key] ?? DEFAULT_RATES.sizes?.[key];
    const old = activeRates?.sizes?.[key] ?? DEFAULT_RATES.sizes?.[key];
    checkDiff('Fundamentals · Size Factors', sizeLabels[key], curr, old);
  });

  // 4. Center Decorations Brackets
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

  // 5. Center 3D Fondant Text
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

  // 6. Center Per Piece
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

  // Live Simulator state
  const [simLayers, setSimLayers] = useState(1);
  const [simSize, setSimSize] = useState('8x6');
  const [simTier2Size, setSimTier2Size] = useState('6x4');
  const [simFinish, setSimFinish] = useState('frosted');
  const [simFrostingFlavor, setSimFrostingFlavor] = useState('Vanilla');
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

  // Synchronize sponge table and two-tier rates for backward compatibility
  const syncSpongeRates = (nextRates) => {
    if (!nextRates.sponge) nextRates.sponge = { naked: {}, frosted: {}, textured: {} };
    const baseVanilla = nextRates.flavors?.vanilla ?? 350;
    ['naked', 'frosted', 'textured'].forEach((finish) => {
      if (!nextRates.sponge[finish]) nextRates.sponge[finish] = {};
      ['6x4', '8x6', '10x8', '12x10'].forEach((sz) => {
        const szAddon = nextRates.sizes?.[sz] ?? 0;
        nextRates.sponge[finish][sz] = baseVanilla + szAddon;
      });
      nextRates.sponge[finish]['6x6'] = nextRates.sponge[finish]['6x4'];
      nextRates.sponge[finish]['8x8'] = nextRates.sponge[finish]['8x6'];
      nextRates.sponge[finish]['10x10'] = nextRates.sponge[finish]['10x8'];
      nextRates.sponge[finish]['12x12'] = nextRates.sponge[finish]['12x10'];
      nextRates.sponge[finish]['small'] = nextRates.sponge[finish]['6x4'];
      nextRates.sponge[finish]['big'] = nextRates.sponge[finish]['8x6'];
    });

    if (!nextRates.twoTier) nextRates.twoTier = {};
    const t1Base = baseVanilla + (nextRates.sizes?.['8x6'] ?? 200);
    const t2Base = baseVanilla + (nextRates.sizes?.['6x4'] ?? 0);
    nextRates.twoTier.naked = t1Base + t2Base;
    nextRates.twoTier.frosted = t1Base + t2Base;
    nextRates.twoTier.textured = t1Base + t2Base;
  };

  const setFlavorPrice = (flavorKey, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.flavors) next.flavors = { ...DEFAULT_RATES.flavors };
    next.flavors[flavorKey] = price;
    syncSpongeRates(next);
    updateRates(next);
  };

  const setSizeAddon = (sizeKey, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.sizes) next.sizes = { ...DEFAULT_RATES.sizes };
    next.sizes[sizeKey] = price;
    syncSpongeRates(next);
    updateRates(next);
  };

  const setFinishAddon = (finishKey, price) => {
    const next = JSON.parse(JSON.stringify(rates));
    if (!next.finishAddon) next.finishAddon = { ...DEFAULT_RATES.finishAddon };
    next.finishAddon[finishKey] = price;
    syncSpongeRates(next);
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


  // Simulation calculator
  const simTotal = useMemo(() => {
    let total = 0;
    const currentRates = rates || DEFAULT_RATES;
    const flvKey = (simSpongeFlavor || 'vanilla').toLowerCase().replace(/\s+/g, '');
    const flavorBase =
      flvKey === 'pickcolor'
        ? (currentRates.flavors?.pickColor ?? 400)
        : (currentRates.flavors?.[flvKey] ?? 350);

    const sizeAddTier1 = currentRates.sizes?.[simSize] ?? (simSize === '8x6' ? 200 : simSize === '10x8' ? 400 : simSize === '12x10' ? 600 : 0);

    // Tier 1
    total += flavorBase + sizeAddTier1;

    // Tier 2 (if 2 tiers)
    if (simLayers === 2) {
      const sizeAddTier2 = currentRates.sizes?.[simTier2Size] ?? (simTier2Size === '8x6' ? 200 : 0);
      total += flavorBase + sizeAddTier2;
    }

    // Finish styles, Filling, Drip, Side piping, and Edge borders are Included (₱0)

    // Strawberries bracket (Center Decoration: 1-4 = 200, 5+ = 300)
    if (simStrawberries > 0) {
      const brackets = currentRates.center?.brackets?.strawberry || [
        { maxQty: 4, price: 200 },
        { maxQty: 10, price: 300 },
      ];
      const hit = brackets.find((b) => simStrawberries <= b.maxQty);
      if (hit) total += hit.price;
      else total += 300;
    }

    // Bear figure (Center Decoration)
    if (simBear > 0) {
      const brackets = currentRates.center?.brackets?.chocolateBear;
      if (brackets && brackets.length > 0) {
        const hit = brackets.find((b) => simBear <= b.maxQty);
        if (hit) total += hit.price;
        else total += (brackets[brackets.length - 1]?.price || 300);
      } else {
        total += (currentRates.center?.perPiece?.chocolateBear || 200) * simBear;
      }
    }

    // 3D Buttercream / Fondant Letters (Text Pricing)
    if (simButtercreamLetters > 0) {
      const brackets = currentRates.center?.brackets?.buttercreamText || [];
      const hit = brackets.find((b) => simButtercreamLetters <= b.maxQty);
      if (hit) total += hit.price;
    }
    return total;
  }, [rates, simLayers, simSize, simTier2Size, simFinish, simFrostingFlavor, simSpongeFlavor, simStrawberries, simBear, simButtercreamLetters]);

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
              { id: 'fundamentals', label: 'Fundamentals', icon: Cake, desc: 'Flavors, sizes & finish add-ons' },
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
              <h3 className="text-xs font-bold text-gray-800">Pricing Architecture</h3>
            </div>
            <ul className="text-[11px] text-gray-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span><strong>Fundamentals:</strong> Cake price starts from Sponge Flavor (6×4 base) + Size factor (+₱200/step). All finishes, fillings, drips, side wraps, and edge piping are included at ₱0.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span><strong>All-Inclusive Items:</strong> Finish styles (Naked, Frosted, Textured Buttercream), Filling, Drip, Side piping, and Edge borders have no separate setup — they are included at ₱0 extra charge.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span><strong>Center Toppings:</strong> 1–4 pcs = +₱200 flat; 5+ pcs = +₱300; 3D letters and large chocolate figures priced by bracket/piece.</span>
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
                  <h2 className="text-base font-bold text-gray-900">Fundamentals Cake Pricing</h2>
                  <p className="text-xs text-gray-500">
                    Pricing is calculated from the Sponge Flavor or Custom Pick Color (6×4 base price) plus Size Factor add-ons. Finishes, fillings, drips, side wraps, and edge borders are included at ₱0.
                  </p>
                </div>

                {/* All-Inclusive Features Notice Banner */}
                <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-pink-50/20 p-4 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-emerald-950">Included Features (₱0 Standalone Setup)</h3>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">All-Inclusive</span>
                      </div>
                      <p className="text-xs text-emerald-800/80 mt-0.5">
                        The following components do not have separate price setups. They are included at no extra charge (₱0) in customer quotes and factored directly into the cake pricing:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                        <div className="rounded-xl border border-emerald-200/50 bg-white/80 p-2.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Finishes</span>
                          <span className="block text-xs font-bold text-gray-800">Included (₱0)</span>
                          <span className="block text-[10.5px] text-gray-500 mt-0.5">Naked, Frosted, Textured</span>
                        </div>
                        <div className="rounded-xl border border-emerald-200/50 bg-white/80 p-2.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Filling</span>
                          <span className="block text-xs font-bold text-gray-800">Included (₱0)</span>
                          <span className="block text-[10.5px] text-gray-500 mt-0.5">All 6 core fillings</span>
                        </div>
                        <div className="rounded-xl border border-emerald-200/50 bg-white/80 p-2.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Drip</span>
                          <span className="block text-xs font-bold text-gray-800">Included (₱0)</span>
                          <span className="block text-[10.5px] text-gray-500 mt-0.5">All 18 drip variations</span>
                        </div>
                        <div className="rounded-xl border border-emerald-200/50 bg-white/80 p-2.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Side Piping</span>
                          <span className="block text-xs font-bold text-gray-800">Included (₱0)</span>
                          <span className="block text-[10.5px] text-gray-500 mt-0.5">All 42 side wraps & patterns</span>
                        </div>
                        <div className="rounded-xl border border-emerald-200/50 bg-white/80 p-2.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Edge Borders</span>
                          <span className="block text-xs font-bold text-gray-800">Included (₱0)</span>
                          <span className="block text-[10.5px] text-gray-500 mt-0.5">All 54 border trims & ruffles</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sponge Flavor & Pick Color Base Rates (6×4 Base) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Sponge Flavor Base Rates (6×4 Default)</h2>
                      <p className="text-xs text-gray-500">
                        Default starting base price for 6×4 size naked sponge. Larger sizes add a size factor.
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-primary bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                      6×4 Base
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-3">
                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Plain</span>
                        <span className="text-[10px] text-gray-400">Classic</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.plain ?? 300}
                        activeValue={activeRates.flavors?.plain ?? 300}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('plain', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Vanilla</span>
                        <span className="text-[10px] text-gray-400">Standard</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.vanilla ?? 350}
                        activeValue={activeRates.flavors?.vanilla ?? 350}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('vanilla', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Cheese</span>
                        <span className="text-[10px] text-gray-400">Savory Sweet</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.cheese ?? 400}
                        activeValue={activeRates.flavors?.cheese ?? 400}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('cheese', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Chocolate</span>
                        <span className="text-[10px] text-gray-400">Rich Cocoa</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.chocolate ?? 500}
                        activeValue={activeRates.flavors?.chocolate ?? 500}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('chocolate', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Strawberry</span>
                        <span className="text-[10px] text-gray-400">Berry Fruit</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.strawberry ?? 500}
                        activeValue={activeRates.flavors?.strawberry ?? 500}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('strawberry', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Ube</span>
                        <span className="text-[10px] text-gray-400">Purple Yam</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.ube ?? 500}
                        activeValue={activeRates.flavors?.ube ?? 500}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('ube', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Mocha</span>
                        <span className="text-[10px] text-gray-400">Coffee Cocoa</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.mocha ?? 500}
                        activeValue={activeRates.flavors?.mocha ?? 500}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('mocha', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-200 bg-pink-50/30 p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">All Pick Colors</span>
                        <span className="text-[9.5px] font-bold text-pink-700 bg-pink-100 px-1.5 py-0.5 rounded">Custom Palette</span>
                      </div>
                      <PriceStepper
                        label="6×4 Base"
                        value={rates.flavors?.pickColor ?? 400}
                        activeValue={activeRates.flavors?.pickColor ?? 400}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setFlavorPrice('pickColor', val)}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-pink-100" />

                {/* Size Factor Add-ons */}
                <div>
                  <h2 className="text-base font-bold text-gray-900">Size Factor Add-ons</h2>
                  <p className="text-xs text-gray-500">
                    Additional cost added per tier based on diameter/height. 6×4 is the default base (+₱0).
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-3">
                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div>
                        <span className="text-xs font-bold text-gray-800">6×4</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Base default size</span>
                      </div>
                      <PriceStepper
                        label="Add-on"
                        value={rates.sizes?.['6x4'] ?? 0}
                        activeValue={activeRates.sizes?.['6x4'] ?? 0}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setSizeAddon('6x4', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div>
                        <span className="text-xs font-bold text-gray-800">8×6</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">+₱200 standard</span>
                      </div>
                      <PriceStepper
                        label="Add-on"
                        value={rates.sizes?.['8x6'] ?? 200}
                        activeValue={activeRates.sizes?.['8x6'] ?? 200}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setSizeAddon('8x6', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div>
                        <span className="text-xs font-bold text-gray-800">10×8</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">+₱400 standard</span>
                      </div>
                      <PriceStepper
                        label="Add-on"
                        value={rates.sizes?.['10x8'] ?? 400}
                        activeValue={activeRates.sizes?.['10x8'] ?? 400}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setSizeAddon('10x8', val)}
                      />
                    </div>

                    <div className="rounded-2xl border border-pink-100 bg-white p-3.5 space-y-2 shadow-xs">
                      <div>
                        <span className="text-xs font-bold text-gray-800">12×10</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">+₱600 standard</span>
                      </div>
                      <PriceStepper
                        label="Add-on"
                        value={rates.sizes?.['12x10'] ?? 600}
                        activeValue={activeRates.sizes?.['12x10'] ?? 600}
                        disabled={!isDraftActive}
                        step={25}
                        onChange={(val) => setSizeAddon('12x10', val)}
                      />
                    </div>
                  </div>
                </div>

                {/* 2-Tier Dynamic Formula Card */}
                <div className="rounded-2xl border border-pink-200/80 bg-gradient-to-br from-pink-50/40 via-white to-pink-50/20 p-5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-100 text-primary">
                      <Layers2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">2-Tier Dynamic Calculation Formula</h3>
                      <p className="text-xs text-gray-500">How tiered custom cakes are priced automatically</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    2-Tier cakes calculate both tiers dynamically using the exact rates above:
                    <strong className="text-gray-900 block mt-1">
                      Total = [Tier 1: Flavor Base + Size Add-on] + [Tier 2: Flavor Base + Size Add-on]
                    </strong>
                    All finishes, fillings, drips, side wraps, and edge piping for both tiers are completely included at ₱0.
                  </p>

                  <div className="rounded-xl border border-pink-100 bg-white p-3 text-xs text-gray-700 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">Example: 8×6 + 6×4 Vanilla Cake</span>
                    <span className="font-bold text-primary text-sm">
                      ₱550 (Tier 1: 350 + 200) + ₱350 (Tier 2: 350 + 0) = ₱900 Total Base
                    </span>
                  </div>
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

                      {simLayers === 1 ? (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">1-Tier Cake Size</label>
                          <div className="flex gap-2">
                            {[
                              { key: '6x4', label: '6×4' },
                              { key: '8x6', label: '8×6' },
                              { key: '10x8', label: '10×8' },
                              { key: '12x10', label: '12×10' },
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSimSize(key)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                  simSize === key ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Bottom Tier 1 Size</label>
                            <div className="flex gap-2">
                              {[
                                { key: '8x6', label: '8×6' },
                                { key: '10x8', label: '10×8' },
                                { key: '12x10', label: '12×10' },
                              ].map(({ key, label }) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setSimSize(key)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                    simSize === key ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Top Tier 2 Size</label>
                            <div className="flex gap-2">
                              {[
                                { key: '6x4', label: '6×4' },
                                { key: '8x6', label: '8×6' },
                              ].map(({ key, label }) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setSimTier2Size(key)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                    simTier2Size === key ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sponge Flavor & Filling Selectors */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-600">Sponge Flavor</label>
                            <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">Base</span>
                          </div>
                          <select
                            value={simSpongeFlavor}
                            onChange={(e) => setSimSpongeFlavor(e.target.value)}
                            className="w-full rounded-xl border border-pink-100 bg-white p-2 text-xs font-semibold text-gray-800 outline-none"
                          >
                            <option value="Vanilla">Vanilla (₱{rates.flavors?.vanilla ?? 350})</option>
                            <option value="Plain">Plain (₱{rates.flavors?.plain ?? 300})</option>
                            <option value="Cheese">Cheese (₱{rates.flavors?.cheese ?? 400})</option>
                            <option value="Chocolate">Chocolate (₱{rates.flavors?.chocolate ?? 500})</option>
                            <option value="Strawberry">Strawberry (₱{rates.flavors?.strawberry ?? 500})</option>
                            <option value="Ube">Ube (₱{rates.flavors?.ube ?? 500})</option>
                            <option value="Mocha">Mocha (₱{rates.flavors?.mocha ?? 500})</option>
                            <option value="Pick Color">All Pick Colors (₱{rates.flavors?.pickColor ?? 400})</option>
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
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Finish Style</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'naked', label: 'Naked (Included)' },
                            { id: 'frosted', label: 'Frosted (Included)' },
                            { id: 'textured', label: 'Textured (Included)' },
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600">Surface Drip</label>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Incl. (₱0)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSimGlaze(!simGlaze)}
                          className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            simGlaze ? 'bg-primary text-white' : 'bg-white border border-pink-100 text-gray-700'
                          }`}
                        >
                          {simGlaze ? 'Drip Applied (Included)' : 'No Drip'}
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600">Side Piping Wrap</label>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Incl. (₱0)</span>
                        </div>
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
                                  {it.label} (Included)
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-600">Edge Border Trim</label>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Incl. (₱0)</span>
                        </div>
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
                                  {it.label} (Included)
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
                          <label className="text-xs font-semibold text-gray-600 block mb-1">
                            Strawberries ({simStrawberries} pcs) · {simStrawberries === 0 ? 'None' : simStrawberries <= 4 ? '+₱200 (1–4)' : '+₱300 (5+)'}
                          </label>
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
                          <label className="text-xs font-semibold text-gray-600 block mb-1">
                            Chocolate Bears ({simBear} pcs) · {simBear === 0 ? 'None' : simBear <= 4 ? '+₱200 (1–4)' : '+₱300 (5+)'}
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={8}
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
                        {/* Tier 1: Size & Flavor */}
                        <div className="flex justify-between py-1 text-gray-700">
                          <span className="font-semibold">
                            Size: {simSize.replace('x', '×')} (Tier 1)
                          </span>
                          <span className="font-bold">{money(rates.sizes?.[simSize] ?? 0)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-gray-700">
                          <span className="font-semibold">
                            Flavor: {simSpongeFlavor} Sponge
                          </span>
                          <span className="font-bold">
                            {money(
                              simSpongeFlavor === 'Pick Color'
                                ? (rates.flavors?.pickColor ?? 400)
                                : (rates.flavors?.[simSpongeFlavor.toLowerCase()] ?? 350)
                            )}
                          </span>
                        </div>

                        {/* Tier 2: Size & Flavor (if 2 tiers) */}
                        {simLayers === 2 && (
                          <>
                            <div className="flex justify-between py-1 text-gray-700">
                              <span className="font-semibold">
                                Size: {simTier2Size.replace('x', '×')} (Tier 2)
                              </span>
                              <span className="font-bold">{money(rates.sizes?.[simTier2Size] ?? 0)}</span>
                            </div>
                            <div className="flex justify-between py-1 text-gray-700">
                              <span className="font-semibold">
                                Flavor: {simSpongeFlavor} Sponge (Tier 2)
                              </span>
                              <span className="font-bold">
                                {money(
                                  simSpongeFlavor === 'Pick Color'
                                    ? (rates.flavors?.pickColor ?? 400)
                                    : (rates.flavors?.[simSpongeFlavor.toLowerCase()] ?? 350)
                                )}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Included items */}
                        <div className="flex justify-between py-1 text-gray-600">
                          <span>Finish Style ({simFinish === 'naked' ? 'Naked' : simFinish === 'textured' ? 'Textured' : 'Frosted'})</span>
                          <span className="text-emerald-700 font-bold">Included (₱0)</span>
                        </div>

                        <div className="flex justify-between py-1 text-gray-600">
                          <span>Filling ({simFilling})</span>
                          <span className="text-emerald-700 font-bold">Included (₱0)</span>
                        </div>

                        {simGlaze && (
                          <div className="flex justify-between py-1 text-gray-600">
                            <span>Surface Drip ({simLayers} tier{simLayers > 1 ? 's' : ''})</span>
                            <span className="text-emerald-700 font-bold">Included (₱0)</span>
                          </div>
                        )}

                        {simSideKey !== 'none' && (
                          <div className="flex justify-between py-1 text-gray-600">
                            <span>Side Piping ({selectedSideLabel})</span>
                            <span className="text-emerald-700 font-bold">Included (₱0)</span>
                          </div>
                        )}

                        {simEdgeId !== 'none' && (
                          <div className="flex justify-between py-1 text-gray-600">
                            <span>Edge Border ({selectedEdgeLabel})</span>
                            <span className="text-emerald-700 font-bold">Included (₱0)</span>
                          </div>
                        )}

                        {/* Center Decorations & Text */}
                        {simStrawberries > 0 && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>Strawberries ({simStrawberries} pcs {simStrawberries <= 4 ? '1–4 bracket' : '5+ bracket'})</span>
                            <span className="font-bold">
                              {money(
                                (rates.center?.brackets?.strawberry || []).find((b) => simStrawberries <= b.maxQty)?.price || 300
                              )}
                            </span>
                          </div>
                        )}

                        {simBear > 0 && (
                          <div className="flex justify-between py-1 text-gray-700">
                            <span>Chocolate Bear ({simBear} pcs {simBear <= 4 ? '1–4 bracket' : '5+ bracket'})</span>
                            <span className="font-bold">
                              {money(
                                (rates.center?.brackets?.chocolateBear || []).find((b) => simBear <= b.maxQty)?.price || 300
                              )}
                            </span>
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
