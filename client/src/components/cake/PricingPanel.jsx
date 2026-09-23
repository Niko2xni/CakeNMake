import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const formatMoney = (minor = 0) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
}).format(minor / 100);

function LineItem({ label, lineTotalMinor = 0, quantity = 1, unitPriceMinor = 0 }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="min-w-0 text-foreground/70">
        {label}
        {quantity > 1 && <span className="ml-1 text-[10px] text-muted-foreground">({quantity} × {formatMoney(unitPriceMinor)})</span>}
      </span>
      <span className="shrink-0 font-medium tabular-nums">{formatMoney(lineTotalMinor)}</span>
    </div>
  );
}

export default function PricingPanel({ quote, loading, error }) {
  const [modalOpen, setModalOpen] = useState(false);
  const lineItems = quote?.lineItems || [];
  const hasOverflow = lineItems.length > 5;

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[220px] rounded-2xl border border-border/40 bg-card/90 p-4 text-left shadow-lg backdrop-blur-md transition-shadow hover:shadow-xl disabled:cursor-wait"
        onClick={() => setModalOpen(true)}
        disabled={!quote && loading}
        aria-label="Open estimated price breakdown"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-primary" /> : <Coins className="h-4 w-4 text-primary" />}
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold">Estimated pricing</h3>
            {quote?.pricingVersion && <p className="text-[10px] text-muted-foreground">Price list v{quote.pricingVersion}</p>}
          </div>
        </div>

        {error && !quote ? (
          <div className="flex gap-2 text-xs text-destructive">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Pricing is temporarily unavailable.</span>
          </div>
        ) : lineItems.length ? (
          <div className={`space-y-1.5 ${hasOverflow ? 'relative max-h-[140px] overflow-hidden' : ''}`}>
            {lineItems.map((item) => <LineItem key={item.componentKey} {...item} />)}
            {hasOverflow && <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card/95 to-transparent" />}
          </div>
        ) : <p className="text-xs text-muted-foreground">Calculating your estimate…</p>}

        <Separator className="my-2.5" />
        <div className="flex items-center justify-between">
          <span className="font-heading text-sm font-bold">Estimate</span>
          <span className="font-heading text-lg font-bold tabular-nums text-primary">{quote ? formatMoney(quote.totalMinor) : '—'}</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Final price is confirmed by the bakery.</p>
      </motion.button>

      <AnimatePresence>
        {modalOpen && quote && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
            <motion.div role="dialog" aria-modal="true" aria-label="Estimated price breakdown" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="w-[340px] max-w-full rounded-2xl border border-border/40 bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Coins className="h-4 w-4 text-primary" /></div>
                  <div><h3 className="font-heading text-sm font-bold">Estimated price breakdown</h3><p className="text-[10px] text-muted-foreground">Price list v{quote.pricingVersion}</p></div>
                </div>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-full p-1 hover:bg-muted" aria-label="Close"><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">{lineItems.map((item) => <LineItem key={item.componentKey} {...item} />)}</div>
              {quote.warnings?.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">Some options do not have configured prices yet and were estimated at ₱0.</div>}
              <Separator className="my-3" />
              <div className="flex items-center justify-between"><span className="font-heading font-bold">Estimated total</span><span className="font-heading text-2xl font-bold tabular-nums text-primary">{formatMoney(quote.totalMinor)}</span></div>
              <p className="mt-2 text-[11px] text-muted-foreground">This estimate uses the current bakery price list. The bakery confirms the final price before production.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
