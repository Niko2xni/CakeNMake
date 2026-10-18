import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, LoaderCircle, ReceiptText, TriangleAlert, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const formatMoney = (minor = 0) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
}).format(minor / 100);

function LineItem({ label, details, lineTotalMinor = 0, quantity = 1, unitPriceMinor = 0, showDetails = false }) {
  const isCenterText = label?.startsWith('Center Text') || (Array.isArray(details) && details.some(d => typeof d === 'string' && d.startsWith('Letters x')));

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
      <div className="flex items-start justify-between gap-3 text-xs">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="font-bold text-foreground text-xs">Center Text:</div>
          {displayDetails.map((spec, idx) => (
            <div key={idx} className="text-[11px] text-muted-foreground">
              {spec}
            </div>
          ))}
        </div>
        <span className="shrink-0 font-bold tabular-nums text-foreground">{formatMoney(lineTotalMinor)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <div className="min-w-0 flex-1">
        {showDetails && Array.isArray(details) && details.length > 0 ? (
          <div className="space-y-0.5 text-foreground/85 font-medium leading-tight">
            {details.map((spec, idx) => (
              <div
                key={idx}
                className={idx === 0 ? 'font-bold text-foreground text-xs' : 'text-[11px] text-muted-foreground'}
              >
                {spec}
              </div>
            ))}
            {quantity > 1 && (
              <span className="text-[10px] text-muted-foreground">({quantity} × {formatMoney(unitPriceMinor)})</span>
            )}
          </div>
        ) : (
          <span className="min-w-0 text-foreground/80 font-medium">
            {label}
            {quantity > 1 && <span className="ml-1 text-[10px] text-muted-foreground">({quantity} × {formatMoney(unitPriceMinor)})</span>}
          </span>
        )}
      </div>
      <span className="shrink-0 font-bold tabular-nums text-foreground">{formatMoney(lineTotalMinor)}</span>
    </div>
  );
}

export default function PricingPanel({ quote, loading, error, onOpenChange }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lineItems = quote?.lineItems || [];
  const hasOverflow = lineItems.length > 5;
  const openModal = () => {
    if (!quote) return;
    setModalOpen(true);
    onOpenChange?.(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    onOpenChange?.(false);
  };

  const isDragScrollingRef = React.useRef(false);
  const startDragYRef = React.useRef(0);
  const startScrollTopRef = React.useRef(0);
  const hasDraggedRef = React.useRef(false);

  const handlePointerDownScroll = React.useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('input, select, textarea, button, a')) return;

    const viewport = e.currentTarget;
    if (!viewport) return;

    isDragScrollingRef.current = true;
    startDragYRef.current = e.clientY;
    startScrollTopRef.current = viewport.scrollTop;
    hasDraggedRef.current = false;

    const onPointerMove = (moveEvent) => {
      if (!isDragScrollingRef.current) return;
      const deltaY = moveEvent.clientY - startDragYRef.current;
      if (Math.abs(deltaY) > 3) {
        hasDraggedRef.current = true;
      }
      viewport.scrollTop = startScrollTopRef.current - deltaY;
    };

    const onPointerUp = () => {
      isDragScrollingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (hasDraggedRef.current) {
        const preventClick = (clickEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        window.addEventListener('click', preventClick, { capture: true, once: true });
        setTimeout(() => {
          window.removeEventListener('click', preventClick, { capture: true });
        }, 60);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, []);

  React.useEffect(() => {
    onOpenChange?.(modalOpen);
  }, [modalOpen, onOpenChange]);

  return (
    <>
      {/* Mobile View: Compact total price badge, clicking directly opens full price breakdown modal */}
      <motion.div
        layout
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="md:hidden flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-card/90 shadow-md backdrop-blur-md cursor-pointer hover:bg-card hover:shadow-lg transition-all active:scale-95 select-none"
        onClick={openModal}
        role="button"
        tabIndex={0}
        title="Click to view full price breakdown"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
          }
        }}
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 shrink-0">
          {loading ? (
            <LoaderCircle className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <ReceiptText className="h-3 w-3 text-primary" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</span>
          <span className="font-heading text-xs sm:text-sm font-bold tabular-nums text-primary">
            {quote ? formatMoney(quote.totalMinor) : '—'}
          </span>
        </div>
      </motion.div>

      {/* Desktop View: Full Card with collapse/expand toggle */}
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`hidden md:block w-[220px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/40 bg-card/90 text-left shadow-lg backdrop-blur-md transition-shadow hover:shadow-xl select-none ${
          isCollapsed ? 'p-3 cursor-pointer' : 'p-4'
        }`}
        onClick={isCollapsed ? () => setIsCollapsed(false) : undefined}
      >
        {isCollapsed ? (
          /* Collapsed View: Whole section expands on click */
          <div
            className="cursor-pointer select-none"
            onClick={() => setIsCollapsed(false)}
            title="Click to expand price list"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsCollapsed(false);
              }
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading text-sm font-bold">Total</span>
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-lg font-bold tabular-nums text-primary">
                  {quote ? formatMoney(quote.totalMinor) : '—'}
                </span>
                <div className="rounded-lg p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shrink-0">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Cake price only. Delivery fee is not included.</p>
          </div>
        ) : (
          /* Expanded View: Full Breakdown Card */
          <div>
            {/* Whole top header section collapses on click */}
            <div
              className="mb-3 flex items-center justify-between gap-2 cursor-pointer select-none rounded-xl -m-1 p-1 hover:bg-muted/40 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              title="Click to collapse price list"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsCollapsed(true);
                }
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-primary" /> : <ReceiptText className="h-4 w-4 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-bold truncate">Price list breakdown</h3>
                </div>
              </div>
              <div className="rounded-lg p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shrink-0">
                <ChevronUp className="h-4 w-4" />
              </div>
            </div>

            {/* Line items & total opens detailed breakdown modal */}
            <div
              className="cursor-pointer select-none"
              onClick={openModal}
              title="Click to view full breakdown"
            >
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
              ) : <p className="text-xs text-muted-foreground">Calculating your pricing…</p>}

              <Separator className="my-2.5" />
              <div className="flex items-center justify-between">
                <span className="font-heading text-sm font-bold">Total</span>
                <span className="font-heading text-lg font-bold tabular-nums text-primary">{quote ? formatMoney(quote.totalMinor) : '—'}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Cake price only. Delivery fee is not included.</p>
            </div>
          </div>
        )}
      </motion.div>

      {modalOpen && quote && createPortal(
          <div style={{ zIndex: 10000 }} className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={closeModal}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Price list breakdown"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="w-[360px] max-w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <ReceiptText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold">Price list breakdown</h3>
                  </div>
                </div>
                <button type="button" onClick={closeModal} className="rounded-full p-1 hover:bg-muted" aria-label="Close">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div
                onPointerDown={handlePointerDownScroll}
                className="flex-1 min-h-0 overflow-y-auto space-y-3 select-none touch-pan-y pricing-modal-scroll md:pr-2 cursor-grab active:cursor-grabbing"
              >
                {lineItems.map((item) => (
                  <LineItem key={item.componentKey} {...item} showDetails={true} />
                ))}
              </div>

              <div className="shrink-0 pt-3">
                {quote.warnings?.length > 0 && (
                  <div className="mb-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">
                    Some options do not have configured prices yet and were estimated at ₱0.
                  </div>
                )}
                <Separator className="my-2.5" />
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold">Total</span>
                  <span className="font-heading text-2xl font-bold tabular-nums text-primary">{formatMoney(quote.totalMinor)}</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  This is the total price for the custom cake. Overall payment may include additional delivery charges, which are calculated separately and not included in this cake pricing.
                </p>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}
