import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, TrendingDown, Info, Calendar, Tag, Layers, CheckCircle2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

function money(pesos) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(pesos || 0);
}

function minorToMoney(minor) {
  return money(Math.round((minor || 0) / 100));
}

export default function PricingUpdateModal({ isOpen, onClose, quote, previousQuote }) {
  const [activeTab, setActiveTab] = useState('design'); // 'design' | 'catalog'

  if (!isOpen) return null;

  const changes = quote?.changes;
  const reason = changes?.reason || quote?.publicationReason || 'The bakery published an updated pricing schedule to reflect current catalog rates.';
  
  const effectiveDate = quote?.effectiveAt
    ? format(new Date(quote.effectiveAt), 'MMM d, yyyy · h:mm a')
    : 'Recent update';

  const newTotalMinor = quote?.totalMinor ?? 0;
  const previousTotalMinor = changes?.previousTotalMinor ?? previousQuote?.totalMinor ?? null;
  const hasTotalDiff = previousTotalMinor !== null && previousTotalMinor !== undefined;
  const diffMinor = hasTotalDiff ? (newTotalMinor - previousTotalMinor) : (changes?.diffMinor ?? 0);
  const isIncrease = diffMinor > 0;
  const isDecrease = diffMinor < 0;

  const lineItemDiffs = changes?.lineItemDiffs || [];
  const catalogDiffs = changes?.catalogDiffs || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-pink-100 bg-white shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="relative border-b border-pink-100/80 bg-gradient-to-r from-pink-50/70 via-rose-50/30 to-purple-50/50 px-6 py-5 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="w-3 h-3" />
                    Price Update Notice
                  </span>
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {effectiveDate}
                  </span>
                </div>
                <h2 className="text-xl font-display font-bold text-gray-900 tracking-tight">
                  Pricing Recalculation Details
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                  The bakery updated its pricing structure. Below is the explanation and exact breakdown of adjustments.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:text-gray-700 hover:bg-white/80 transition-colors shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Reason Box */}
            <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <Info className="w-4 h-4" />
                <span>Bakery's Reason for Update</span>
              </div>
              <p className="text-sm font-medium text-gray-800 leading-snug">
                "{reason}"
              </p>
            </div>

            {/* Design Impact Card */}
            <div className="rounded-2xl border border-pink-100/80 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Impact on Your Current Cake
                </span>
                {hasTotalDiff && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    isIncrease
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : isDecrease
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isIncrease ? <TrendingUp className="w-3.5 h-3.5" /> : isDecrease ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                    {isIncrease ? `+${minorToMoney(diffMinor)}` : isDecrease ? `-${minorToMoney(Math.abs(diffMinor))}` : 'No net change'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {hasTotalDiff && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                    <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">Previous Estimate</span>
                    <span className="text-base font-bold text-gray-600 line-through">
                      {minorToMoney(previousTotalMinor)}
                    </span>
                  </div>
                )}
                <div className={`rounded-xl border p-3 ${
                  hasTotalDiff ? 'border-primary/20 bg-primary/5' : 'col-span-2 border-pink-100 bg-pink-50/30'
                }`}>
                  <span className="text-[11px] font-semibold text-primary block mb-0.5">Recalculated Estimate</span>
                  <span className="text-xl font-extrabold text-primary">
                    {minorToMoney(newTotalMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs for Detailed Line Items vs Full Catalog Changes */}
            {(lineItemDiffs.length > 0 || catalogDiffs.length > 0) && (
              <div className="space-y-3">
                <div className="flex border-b border-pink-100 gap-4 text-xs font-bold">
                  {lineItemDiffs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('design')}
                      className={`pb-2.5 transition-colors cursor-pointer border-b-2 -mb-px ${
                        activeTab === 'design'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Cake Items Adjusted ({lineItemDiffs.length})
                    </button>
                  )}
                  {catalogDiffs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      className={`pb-2.5 transition-colors cursor-pointer border-b-2 -mb-px ${
                        activeTab === 'catalog'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      All Catalog Rate Changes ({catalogDiffs.length})
                    </button>
                  )}
                </div>

                {/* Cake Line Items Adjusted Tab */}
                {activeTab === 'design' && lineItemDiffs.length > 0 && (
                  <div className="rounded-2xl border border-pink-100 divide-y divide-pink-50 overflow-hidden text-xs">
                    {lineItemDiffs.map((diff, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-pink-50/20">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-gray-800 block">{diff.label}</span>
                          <span className="text-[11px] text-gray-500">
                            Was {minorToMoney(diff.fromMinor)} ➔ Now {minorToMoney(diff.toMinor)}
                          </span>
                        </div>
                        <span className={`font-bold ${diff.diffMinor > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {diff.diffMinor > 0 ? `+${minorToMoney(diff.diffMinor)}` : `-${minorToMoney(Math.abs(diff.diffMinor))}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* All Catalog Rate Changes Tab */}
                {(activeTab === 'catalog' || lineItemDiffs.length === 0) && catalogDiffs.length > 0 && (
                  <div className="rounded-2xl border border-pink-100 divide-y divide-pink-50 overflow-hidden text-xs max-h-56 overflow-y-auto">
                    {catalogDiffs.map((diff, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-pink-50/20">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{diff.category}</span>
                            <span className="font-semibold text-gray-800">{diff.item}</span>
                          </div>
                          <span className="text-[11px] text-gray-500">
                            {money(diff.from)} ➔ {money(diff.to)}
                          </span>
                        </div>
                        <span className={`font-bold ${diff.to > diff.from ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {diff.to > diff.from ? `+${money(diff.to - diff.from)}` : `-${money(diff.from - diff.to)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inclusions Reminder */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Included at No Extra Charge (₱0)</span>
                <span className="text-emerald-800 leading-relaxed text-[11px]">
                  All exterior finish styles (Naked, Frosted, Textured Buttercream), fillings, drips, side wraps, and edge border trims are fully included with your chosen size.
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="border-t border-pink-100 bg-gray-50/60 px-6 py-4 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Understood — Continue Designing</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
