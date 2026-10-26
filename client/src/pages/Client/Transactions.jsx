import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Search,
  X,
  Cake,
  Calendar,
  Clock,
  Store,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  RotateCw,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ReceiptText,
  Smartphone,
  Lock,
  LoaderCircle,
} from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { accountApi } from '@/services/api';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import PayBalanceModal from '@/components/client/PayBalanceModal';
import { isWithinThirtyMinutePaymentCutoff } from '@/utils/maintenance';
import { getChatSocket } from '@/lib/chat-socket';

export const COMPLETED_STATUSES = ['completed', 'fulfilled'];
export const ONGOING_STATUSES = [
  'confirmed',
  'in_production',
  'in production',
  'in_progress',
  'in progress',
  'baking',
  'ready',
  'ready for pickup',
  'pending',
  'pending_payment',
  'awaiting_payment',
];

function formatCurrency(amount) {
  const num = Number(amount || 0);
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Not scheduled';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
}

function getStatusBadge(status) {
  const norm = String(status || '').toLowerCase();
  if (['completed', 'fulfilled'].includes(norm)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Order Completed
      </span>
    );
  }
  if (['ready', 'ready for pickup'].includes(norm)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        Order Ready
      </span>
    );
  }
  if (['in_production', 'in production', 'in_progress', 'in progress', 'baking'].includes(norm)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
        <RotateCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />
        In Progress
      </span>
    );
  }
  if (['pending', 'pending_payment', 'awaiting_payment'].includes(norm)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Order Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-200">
      <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
      Order Confirmed
    </span>
  );
}

function formatReceiptItems(rawItems = []) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  // If any item already has details, preserve it cleanly
  const hasExistingDetails = rawItems.some((it) => Array.isArray(it?.details) && it.details.length > 0);
  if (hasExistingDetails) {
    return rawItems.map((item) => {
      let label = item?.label || '';
      if (label.toLowerCase().startsWith('center decorations') && !label.endsWith(':')) {
        label = 'Center Decorations:';
      }
      return { ...item, label };
    });
  }

  // Normalize legacy/unbundled items where ₱0 treatments were separate rows
  const isIncludedTreatment = (label = '', totalMinor = 0) => {
    if (totalMinor > 0) return false;
    const l = (label || '').toLowerCase();
    return (
      l.includes('drip') ||
      l.includes('side') ||
      l.includes('edge') ||
      l.includes('filling') ||
      l.includes('border') ||
      l.includes('piping') ||
      l.includes('finish') ||
      l.includes('textured') ||
      l.includes('frosted') ||
      l.includes('naked')
    );
  };

  const isTierOrSize = (label = '', key = '') => {
    const l = (label || '').toLowerCase();
    const k = (key || '').toLowerCase();
    return l.includes('tier') || l.startsWith('size') || k.includes('size') || k.includes('tier') || k.includes('sponge');
  };

  const isCenter = (label = '', key = '') => {
    const l = (label || '').toLowerCase();
    const k = (key || '').toLowerCase();
    return l.includes('center') || k.includes('center') || k.includes('topping');
  };

  const tierIndex = rawItems.findIndex((it) => isTierOrSize(it.label, it.componentKey));
  const treatmentSpecs = [];
  const otherItems = [];

  rawItems.forEach((it, idx) => {
    const totalMinor = it.lineTotalMinor != null ? it.lineTotalMinor : (it.unitPriceMinor || 0) * (it.quantity || 1);
    if (idx !== tierIndex && isIncludedTreatment(it.label, totalMinor)) {
      let cleanSpec = it.label.replace('—', ':').replace('-', ':').trim();
      if (!cleanSpec.toLowerCase().includes('(included)')) cleanSpec += ' (Included)';
      treatmentSpecs.push(cleanSpec);
    } else {
      otherItems.push({ ...it, originalIdx: idx });
    }
  });

  return otherItems.map((item) => {
    let label = item.label;
    let details = item.details;

    if (item.originalIdx === tierIndex) {
      const sizeMatch = label.match(/\(([^)]+)\)/);
      const tierMatch = label.match(/(\d+\s*Tier)/i);
      if (sizeMatch && tierMatch && !label.startsWith('Size:')) {
        label = `Size: ${sizeMatch[1]} (${tierMatch[1]})`;
      }
      if (treatmentSpecs.length > 0 && (!details || details.length === 0)) {
        details = [label, ...treatmentSpecs];
      }
    } else if (isCenter(label, item.componentKey)) {
      if (!label.endsWith(':')) label = 'Center Decorations:';
    }

    return { ...item, label, details };
  });
}

function BreakdownLineItem({ label, details, items, lineTotalMinor, unitPriceMinor = 0, quantity = 1, showDetails = true, componentKey = '' }) {
  const isCenterText = label?.startsWith('Center Text') || (Array.isArray(details) && details.some((d) => typeof d === 'string' && d.startsWith('Letters x')));
  const isCenterDeco = componentKey === 'center-decorations' || label?.startsWith('Center Decorations');
  const isFlavor = label?.toLowerCase().startsWith('flavor') || componentKey?.includes('flavor');
  const isHeading = isFlavor || label?.toLowerCase().startsWith('size') || label?.toLowerCase().startsWith('center') || componentKey?.includes('size') || componentKey?.includes('center');
  const computedTotal = lineTotalMinor != null ? lineTotalMinor / 100 : ((unitPriceMinor || 0) * (quantity || 1)) / 100;

  if (isCenterDeco) {
    const hasItems = Array.isArray(items) && items.length > 0;
    const decoList = hasItems
      ? items
      : Array.isArray(details) && details.length > 1
        ? details.slice(1).map((name) => ({ name, priceMinor: lineTotalMinor }))
        : [];

    return (
      <div className="text-xs space-y-1 py-1">
        <div className="font-bold text-gray-900 text-xs">Center Decorations:</div>
        <div className="space-y-0.5">
          {decoList.map((deco, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px] text-gray-500">
              <span>{deco.name || deco.label}</span>
              {deco.priceMinor != null && (
                <span className="shrink-0 font-bold tabular-nums text-gray-900">{formatCurrency(deco.priceMinor / 100)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isCenterText) {
    let displayDetails = Array.isArray(details) && details.length > 0 ? details : [];
    if (displayDetails.length === 0) {
      const match = label?.match(/Center Text\s*(?:x|×)\s*(\d+)/i);
      const letterCount = match ? match[1] : (quantity > 1 ? quantity : null);
      if (letterCount) {
        displayDetails = [`Letters x ${letterCount}`];
      }
    }

    return (
      <div className="flex items-start justify-between gap-3 text-xs py-1">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="font-bold text-gray-900 text-xs">Center Text:</div>
          {displayDetails.map((spec, idx) => (
            <div key={idx} className="text-[11px] text-gray-500">
              {spec}
            </div>
          ))}
        </div>
        <span className="shrink-0 font-bold tabular-nums text-gray-900">{formatCurrency(computedTotal)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 text-xs py-1">
      <div className="min-w-0 flex-1">
        {showDetails && Array.isArray(details) && details.length > 0 ? (
          <div className="space-y-0.5 font-medium leading-tight text-gray-800">
            {details.map((spec, idx) => (
              <div
                key={idx}
                className={idx === 0 ? 'font-bold text-gray-900 text-xs' : 'text-[11px] text-gray-500'}
              >
                {spec}
              </div>
            ))}
            {quantity > 1 && (
              <span className="text-[10px] text-gray-400">({quantity} × {formatCurrency((unitPriceMinor || 0) / 100)})</span>
            )}
          </div>
        ) : (
          <span className={`min-w-0 ${isHeading ? 'font-bold text-gray-900 text-xs' : 'text-gray-800 font-medium text-xs'}`}>
            {label}
            {quantity > 1 && <span className="ml-1 text-[10px] text-gray-400">({quantity} × {formatCurrency((unitPriceMinor || 0) / 100)})</span>}
          </span>
        )}
      </div>
      <span className="shrink-0 font-bold tabular-nums text-gray-900">{formatCurrency(computedTotal)}</span>
    </div>
  );
}

function generateBalanceRef(amount) {
  return `DEMO-BAL-${amount}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState(null);
  const [payingBalanceTx, setPayingBalanceTx] = useState(null);

  const openBalancePayment = (tx) => {
    if (!tx) return;
    setPayingBalanceTx(tx);
  };

  const handlePaymentSuccess = (res, tx) => {
    const updatedStatus = res.status || 'in_production';
    const finalPayment = res.reservation?.finalPayment || res.finalPayment || {
      amount: tx.remainingBalance,
      isPaid: true,
      method: 'gcash',
      paidAt: new Date().toISOString(),
    };

    const matchesTx = (t) => {
      if (!t || !tx) return false;
      if (t.id && tx.id && t.id === tx.id) return true;
      if (t.reservationId && tx.id && t.reservationId === tx.id) return true;
      if (t.id && tx.reservationId && t.id === tx.reservationId) return true;
      if (t.reservationId && tx.reservationId && t.reservationId === tx.reservationId) return true;
      if (t.blueprintId && tx.blueprintId && t.blueprintId === tx.blueprintId) return true;
      return false;
    };

    setTransactions((prev) =>
      prev.map((t) => {
        if (matchesTx(t)) {
          return {
            ...t,
            status: updatedStatus,
            remainingBalance: 0,
            finalPayment,
          };
        }
        return t;
      })
    );

    setSelectedTx((prev) => {
      if (prev && matchesTx(prev)) {
        return {
          ...prev,
          status: updatedStatus,
          remainingBalance: 0,
          finalPayment,
        };
      }
      return prev;
    });
  };

  const fetchTransactions = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const res = await accountApi.getTransactions();
      setTransactions(res?.transactions || []);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      if (!silent) setError(err?.message || 'Could not load your orders. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    let active = true;
    let socket;
    Promise.resolve()
      .then(() => getChatSocket?.())
      .then((s) => {
        if (active && s) {
          socket = s;
          socket.on('reservation:updated', (updatedRes) => {
            if (!active) return;
            if (updatedRes?._id) {
              const updatedId = String(updatedRes._id);
              setTransactions((prev) =>
                prev.map((t) => {
                  if (t.id === updatedId || t.reservationId === updatedId) {
                    return {
                      ...t,
                      status: updatedRes.status || t.status,
                      finalPayment: updatedRes.finalPayment || t.finalPayment,
                      remainingBalance: updatedRes.status === 'completed' ? 0 : t.remainingBalance,
                    };
                  }
                  return t;
                })
              );
              setSelectedTx((prev) => {
                if (prev && (prev.id === updatedId || prev.reservationId === updatedId)) {
                  return {
                    ...prev,
                    status: updatedRes.status || prev.status,
                    finalPayment: updatedRes.finalPayment || prev.finalPayment,
                    remainingBalance: updatedRes.status === 'completed' ? 0 : prev.remainingBalance,
                  };
                }
                return prev;
              });
            }
            fetchTransactions({ silent: true });
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      socket?.off('reservation:updated');
    };
  }, []);

  const counts = useMemo(() => {
    const total = transactions.length;
    const completed = transactions.filter((tx) =>
      COMPLETED_STATUSES.includes(String(tx.status || '').toLowerCase())
    ).length;
    const ongoing = total - completed;
    return { total, ongoing, completed };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const raw = search.trim().toLowerCase();
    const clean = raw.replace(/^#/, '').trim();
    return transactions.filter((tx) => {
      const normStatus = String(tx.status || 'confirmed').toLowerCase();
      const isCompleted = COMPLETED_STATUSES.includes(normStatus);

      if (statusFilter === 'ongoing' && isCompleted) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;

      if (!raw) return true;

      const ids = [
        tx.id,
        tx.reservationId,
        tx.blueprintId,
        typeof tx.designId === 'object' ? tx.designId?._id : tx.designId,
      ].filter(Boolean).map((val) => String(val).toLowerCase());

      const idMatch = ids.some((idVal) => {
        if (idVal.includes(raw)) return true;
        if (clean) {
          if (idVal.includes(clean)) return true;
          if (idVal.slice(-6).includes(clean)) return true;
          if (idVal.slice(-8).includes(clean)) return true;
        }
        return false;
      });

      const nameMatch = String(tx.designName || '').toLowerCase().includes(raw) ||
        (clean && String(tx.designName || '').toLowerCase().includes(clean));
      const bakeryMatch = String(tx.bakeryName || '').toLowerCase().includes(raw);
      const readableStatus = normStatus.replace(/_/g, ' ');
      const statusMatch = normStatus.includes(raw) || readableStatus.includes(raw) ||
        (normStatus === 'in_production' && (raw.includes('production') || raw.includes('progress') || raw.includes('baking'))) ||
        (normStatus === 'pending_payment' && (raw.includes('pending') || raw.includes('payment')));
      const dateStr = formatDate(tx.pickupDate).toLowerCase();
      const createdDateStr = formatDate(tx.createdAt).toLowerCase();
      const dateMatch = (tx.pickupDate && String(tx.pickupDate).toLowerCase().includes(raw)) ||
        dateStr.includes(raw) ||
        createdDateStr.includes(raw);

      return idMatch || nameMatch || bakeryMatch || statusMatch || dateMatch;
    });
  }, [transactions, search, statusFilter]);

  return (
    <div className="cn-app-page min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
      <ClientNavbar />

      <main className="w-full px-4 sm:px-6 md:px-10 py-8 max-w-[1100px] mx-auto space-y-6">
        {/* Customer Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-pink-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-pink-500/10 text-pink-600 shadow-2xs">
                <ShoppingBag className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading tracking-tight">
                My Cake Orders
              </h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              View your order history, scheduled order dates, and payment receipts.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchTransactions}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-pink-200 bg-white hover:bg-pink-50 text-pink-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Orders
          </button>
        </div>

        {/* Customer Order Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-pink-600 border border-pink-100'
              }`}
            >
              All Orders ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ongoing')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'ongoing'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-pink-600 border border-pink-100'
              }`}
            >
              Ongoing ({counts.ongoing})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'completed'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-pink-600 border border-pink-100'
              }`}
            >
              Completed ({counts.completed})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by cake or order ID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-pink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-pink-400 placeholder-gray-400 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Orders List Section */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/80 rounded-2xl p-5 border border-pink-100 shadow-xs animate-pulse flex flex-col sm:flex-row gap-5 items-center"
              >
                <div className="w-20 h-20 bg-pink-100/70 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2.5 w-full">
                  <div className="h-4 bg-pink-100/70 rounded-md w-1/3" />
                  <div className="h-3.5 bg-pink-100/50 rounded-md w-1/2" />
                  <div className="h-3.5 bg-pink-100/40 rounded-md w-1/4" />
                </div>
                <div className="w-28 h-9 bg-pink-100/60 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
            <AlertCircle className="w-7 h-7 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={fetchTransactions}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-xs"
            >
              Try Again
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-xs rounded-3xl border border-pink-100 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto text-pink-500">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-800 font-heading">
                {search ? 'No matching orders found' : 'No cake orders yet'}
              </h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {search
                  ? `We couldn't find any orders matching "${search}". Try searching for another keyword or clear the search.`
                  : "When you place a cake order with simulated checkout, your order progress and receipts will appear here."}
              </p>
            </div>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-4 py-2 rounded-full border border-pink-300 text-pink-600 text-xs font-semibold hover:bg-pink-50"
              >
                Clear Search
              </button>
            ) : (
              <Link
                to="/designer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold shadow-xs transition-colors"
              >
                <Cake className="w-4 h-4" /> Start Designing Your Cake
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((tx) => {
              const downPaymentAmount = Number(tx.downPayment?.amount || 0);
              const totalAmount = Number(tx.totalPrice || 0);
              const isPaidInFull = Boolean(tx.finalPayment?.isPaid) || Number(tx.remainingBalance) === 0;
              const remainingBalance = isPaidInFull
                ? 0
                : (tx.remainingBalance != null
                    ? Number(tx.remainingBalance)
                    : Math.max(0, totalAmount - downPaymentAmount));

              return (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl border border-pink-100 hover:border-pink-300 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Card Top: Bakery Name, Order Date, & Status Badge */}
                  <div className="bg-pink-50/50 px-5 py-3 border-b border-pink-100/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-pink-600" />
                      <span className="font-bold text-gray-900">{tx.bakeryName}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">Ordered {formatDate(tx.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-400 text-[11px] bg-white px-2 py-0.5 rounded-md border border-gray-100">
                        Order #{String(tx.id || tx._id || '').slice(-8).toUpperCase()}
                      </span>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                    {/* Left: Cake Thumbnail and Schedule */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-pink-50 border border-pink-100 flex-shrink-0 flex items-center justify-center relative shadow-2xs">
                        {tx.thumbnail ? (
                          <img
                            src={tx.thumbnail}
                            alt={tx.designName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Cake className="w-9 h-9 text-pink-300" />
                        )}
                        <span className="absolute bottom-1 right-1 bg-black/60 text-[9px] text-white px-1.5 py-0.2 rounded font-mono">
                          3D
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 font-heading">
                          {tx.designName}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 font-medium border border-pink-100">
                            <Calendar className="w-3.5 h-3.5 text-pink-500" />
                            Scheduled Date: <strong>{formatDate(tx.pickupDate)}</strong>
                          </span>
                        </div>

                        {remainingBalance > 0 ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              {tx.downPayment?.isPaid !== false
                                ? `Down Payment Paid • Balance of ${formatCurrency(remainingBalance)} remaining`
                                : `Payment Pending • Balance of ${formatCurrency(remainingBalance)} remaining`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fully Paid via GCash (Simulated)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Payment Breakdown & Action Buttons */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-pink-100">
                      <div className="text-left md:text-right space-y-0.5">
                        <span className="text-[11px] text-gray-400 font-medium">Total Cake Price</span>
                        <p className="text-xl font-black text-gray-900 font-heading">
                          {formatCurrency(totalAmount)}
                        </p>
                        {remainingBalance > 0 ? (
                          <p className="text-[11px] text-amber-700 font-semibold">
                            Paid: {formatCurrency(downPaymentAmount)} • Balance: {formatCurrency(remainingBalance)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-emerald-600 font-semibold">
                            Paid in Full: {formatCurrency(totalAmount)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        {remainingBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => openBalancePayment(tx)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#007DFF] hover:bg-[#0068D9] text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            Pay Balance ({formatCurrency(remainingBalance)})
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Receipt
                        </button>

                        <Link
                          to="/chats"
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-pink-50 text-gray-700 hover:text-pink-600 text-xs font-semibold border border-pink-200 transition-colors"
                          title="Message bakery about this order"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Message Baker
                        </Link>

                        {tx.designId && (
                          <Link
                            to={`/designer?designId=${typeof tx.designId === 'object' ? tx.designId?._id : tx.designId}`}
                            className="hidden sm:inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-pink-50 text-gray-500 hover:text-pink-600 border border-pink-200 transition-colors"
                            title="Open design in 3D workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Customer Order Receipt & Price List Breakdown Modal */}
      <Dialog open={Boolean(selectedTx)} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-[420px] w-full p-5 sm:p-6 rounded-3xl bg-white border border-gray-100 shadow-2xl">
          {selectedTx && (() => {
            const downPaymentAmount = Number(selectedTx.downPayment?.amount || 0);
            const totalAmount = Number(selectedTx.totalPrice || 0);
            const isPaidInFull = Boolean(selectedTx.finalPayment?.isPaid) || Number(selectedTx.remainingBalance) === 0;
            const remainingBalance = isPaidInFull
              ? 0
              : (selectedTx.remainingBalance != null
                  ? Number(selectedTx.remainingBalance)
                  : Math.max(0, totalAmount - downPaymentAmount));
            const formattedItems = formatReceiptItems(selectedTx.pricingSnapshot?.lineItems || []);
            const isCutoff = isWithinThirtyMinutePaymentCutoff();

            return (
              <div className="space-y-4">
                {/* Header matching 1st image with clean single close button */}
                <div className="flex items-start justify-between pr-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 shrink-0">
                      <ReceiptText className="h-4 w-4 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm sm:text-base font-bold text-gray-900">
                        Price list breakdown
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium truncate max-w-[260px]">
                        <span className="font-mono font-bold text-gray-700">#{String(selectedTx.id || selectedTx._id || '').slice(-8).toUpperCase()}</span> • {selectedTx.designName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items matching 2nd image */}
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {formattedItems.length > 0 ? (
                    formattedItems.map((item, idx) => (
                      <BreakdownLineItem key={item.componentKey || idx} {...item} showDetails={true} />
                    ))
                  ) : (
                    <div className="py-3 text-xs text-gray-500 text-center">
                      Custom 3D Cake Design Configuration
                    </div>
                  )}
                </div>

                {/* Total & Payment Summary matching 2nd image */}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-gray-900 text-sm">Total</span>
                    <span className="font-heading text-xl sm:text-2xl font-bold tabular-nums text-pink-600">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>

                  {selectedTx.downPayment?.isPaid !== false ? (
                    <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Down Payment Paid (GCash Simulated)
                      </span>
                      <span className="tabular-nums font-bold">-{formatCurrency(downPaymentAmount)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-amber-600 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Down Payment Pending
                      </span>
                      <span className="tabular-nums font-bold">₱0.00</span>
                    </div>
                  )}

                  {remainingBalance > 0 ? (
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                        <span>Balance to Pay</span>
                        <span className="text-pink-600 tabular-nums">
                          {formatCurrency(remainingBalance)}
                        </span>
                      </div>
                      {isCutoff && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Payment cutoff active (9:30 PM - 10:05 PM). Balance payments temporarily unavailable.</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => openBalancePayment(selectedTx)}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#007DFF] hover:bg-[#0068D9] text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <Smartphone className="w-4 h-4" />
                        Pay Remaining Balance ({formatCurrency(remainingBalance)}) with GCash
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Remaining Balance Paid (GCash Simulated)
                        </span>
                        <span className="tabular-nums font-bold">-{formatCurrency(totalAmount - downPaymentAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-bold text-gray-900 pt-1">
                        <span>Balance to Pay</span>
                        <span className="text-emerald-600 tabular-nums font-bold">₱0.00 (Fully Settled)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Policy helper text directly matching 2nd image */}
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  This is the total price for the custom cake. Overall payment may include additional delivery charges, which are calculated separately and not included in this cake pricing.
                </p>

                {/* Optional Order Note */}
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500 leading-relaxed">
                  <strong>Order Notice (Optional):</strong> Showing this receipt is completely optional. You can show this screen, show your confirmation email, or just mention your name and order ID (<span className="font-mono font-bold text-gray-800">#{String(selectedTx.id || selectedTx._id || '').slice(-8).toUpperCase()}</span>) at {selectedTx.bakeryName}. Any remaining balance can be settled directly with the bakery.
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    to="/chats"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message Baker
                  </Link>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Simulated GCash Balance Payment Dialog */}
      <PayBalanceModal
        isOpen={Boolean(payingBalanceTx)}
        transaction={payingBalanceTx}
        onClose={() => setPayingBalanceTx(null)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
