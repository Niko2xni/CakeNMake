import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TUTORIAL_STEPS } from './tutorialSteps';

export { TUTORIAL_STEPS };

const STUCK_AFTER_MS = 7000;
const SPOT_PAD = 8;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Bounding box of an element clipped by every scrolling/overflow-hidden ancestor and the
// viewport. Returns null when nothing of it is actually on screen, so highlights never
// float over parts that have been scrolled out of their panel.
function getVisibleRect(el) {
    const r = el.getBoundingClientRect();
    let top = r.top;
    let left = r.left;
    let bottom = r.bottom;
    let right = r.right;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(`${cs.overflow}${cs.overflowX}${cs.overflowY}`)) {
            const pr = p.getBoundingClientRect();
            top = Math.max(top, pr.top);
            left = Math.max(left, pr.left);
            bottom = Math.min(bottom, pr.bottom);
            right = Math.min(right, pr.right);
        }
    }
    top = Math.max(top, 0);
    left = Math.max(left, 0);
    bottom = Math.min(bottom, window.innerHeight);
    right = Math.min(right, window.innerWidth);
    if (right - left < 2 || bottom - top < 2) return null;
    return { top, left, width: right - left, height: bottom - top };
}

function queryVisible(selector) {
    if (!selector) return [];
    return Array.from(document.querySelectorAll(selector)).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    });
}

/**
 * Compact card placement. Rules:
 *  - desktop, target in the tool panel  → card sits to its left, arrow pointing at it
 *  - desktop, target in the header      → card hangs below it
 *  - desktop, anything else (3D area)   → card sits low in the 3D area, no arrow
 *  - mobile                             → card goes to whichever half does NOT hold the target
 */
function getLayout({ rect, cardH, vw, vh, step, stepIndex, groupIdx }) {
    const mobile = vw < 768;
    const pad = 12;
    const w = mobile ? Math.min(vw - pad * 2, 400) : 340;
    const h = cardH || 170;
    let top;
    let left;
    let arrow = 'none';
    let arrowOffset = {};

    if (mobile) {
        left = Math.round((vw - w) / 2);
        const isStep1Or2 =
            stepIndex === 0 ||
            stepIndex === 1 ||
            step?.group === 1 ||
            step?.group === 2 ||
            groupIdx === 0 ||
            groupIdx === 1 ||
            step?.id === 'cam-rotate' ||
            step?.id === 'cam-zoom';
        const isStep8PlaceOrSelect =
            step?.id === 'center-place' ||
            step?.id === 'center-select' ||
            step?.id === 'interior-preview-explain' ||
            step?.title === 'Place it' ||
            step?.title === 'Select an item';

        if (isStep1Or2 || isStep8PlaceOrSelect) {
            top = Math.max(pad, vh - h - 16);
        } else {
            top = 58; // locked just under the header, over the 3D render, never over the tool panel
        }
    } else if (rect && rect.left > vw * 0.55) {
        const cy = rect.top + rect.height / 2;
        left = rect.left - w - 18;
        top = clamp(cy - h / 2, 64, vh - h - 16);
        arrow = 'right';
        arrowOffset = { top: clamp(cy - top, 22, h - 22) };
    } else if (rect && rect.bottom < 90) {
        const cx = rect.left + rect.width / 2;
        left = clamp(cx - w / 2, pad, vw - w - pad);
        top = rect.bottom + 16;
        arrow = 'top';
        arrowOffset = { left: clamp(cx - left, 22, w - 22) };
    } else {
        const renderW = Math.max(300, vw - 340);
        left = clamp(Math.round((renderW - w) / 2), pad, vw - w - pad);
        top = vh - h - 28;
    }

    return {
        style: {
            top: `${clamp(Math.round(top), pad, Math.max(pad, vh - h - pad))}px`,
            left: `${clamp(Math.round(left), pad, Math.max(pad, vw - w - pad))}px`,
            width: `${w}px`,
        },
        arrow,
        arrowOffset,
    };
}

export default function DesignerTutorial({
    isOpen,
    currentStepIndex,
    isStepDone,
    onStepChange,
    onComplete,
    onSkip,
}) {
    const [rects, setRects] = useState([]);
    const [cardH, setCardH] = useState(170);
    const [stuck, setStuck] = useState(false);
    const [viewport, setViewport] = useState(() => ({
        w: typeof window !== 'undefined' ? window.innerWidth : 390,
        h: typeof window !== 'undefined' ? window.innerHeight : 844,
    }));
    const cardRef = useRef(null);

    const step = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
    const isTry = step.kind === 'try';
    const total = TUTORIAL_STEPS.length;
    const isLast = currentStepIndex === total - 1;
    const groups = Array.from(new Set(TUTORIAL_STEPS.map((s) => s.group)));
    const groupIdx = groups.indexOf(step.group);
    const canContinue = !isTry || isStepDone;

    useEffect(() => {
        const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // "Stuck" escape hatch for try-steps (e.g. no right mouse button on a trackpad)
    useEffect(() => {
        setStuck(false);
        if (!isOpen || !isTry) return undefined;
        const t = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
        return () => clearTimeout(t);
    }, [isOpen, isTry, currentStepIndex]);

    const measure = useCallback(() => {
        const collect = (selector) => queryVisible(selector).map(getVisibleRect).filter(Boolean);
        let next = collect(step.target);
        if (!next.length && !queryVisible(step.target).length) next = collect(step.fallback);
        next = next.map((r) => ({ top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }));
        setRects((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, [step]);

    // Track target: a light poll covers panels that re-layout (sections opening, tabs switching)
    useEffect(() => {
        if (!isOpen) return undefined;
        measure();
        const poll = setInterval(measure, 250);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            clearInterval(poll);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [isOpen, measure]);

    // Let the user scroll the tool panel, but not so far that the highlighted target is lost:
    // scrolling is clamped to a window around the target's own top and bottom.
    useEffect(() => {
        if (!isOpen || !isTry || !step.target) return undefined;
        const SLACK = 48;
        const viewportEl = () => document.querySelector('[data-tutorial="toolpanel"] [data-radix-scroll-area-viewport]');
        const clampScroll = () => {
            const vp = viewportEl();
            if (!vp) return;
            const els = queryVisible(step.target).filter((el) => vp.contains(el) && !el.contains(vp));
            if (!els.length) return;
            const vr = vp.getBoundingClientRect();
            const tops = els.map((el) => el.getBoundingClientRect().top - vr.top + vp.scrollTop);
            const bottoms = els.map((el) => el.getBoundingClientRect().bottom - vr.top + vp.scrollTop);
            const T = Math.min(...tops);
            const B = Math.max(...bottoms);
            const V = vp.clientHeight;
            const maxScroll = Math.max(0, vp.scrollHeight - V);
            const lo = clamp(Math.min(B - V, T) - SLACK, 0, maxScroll);
            const hi = clamp(Math.max(B - V, T) + SLACK, 0, maxScroll);
            if (vp.scrollTop < lo - 1) vp.scrollTop = lo;
            else if (vp.scrollTop > hi + 1) vp.scrollTop = hi;
        };
        const vp = viewportEl();
        vp?.addEventListener('scroll', clampScroll, { passive: true });
        const poll = setInterval(clampScroll, 300);
        return () => {
            vp?.removeEventListener('scroll', clampScroll);
            clearInterval(poll);
        };
    }, [isOpen, isTry, step]);

    // Bring tool-panel targets into view when the step changes
    useEffect(() => {
        if (!isOpen) return undefined;
        const run = () => {
            const el = queryVisible(step.target)[0] || document.querySelector(step.target || '') || null;
            if (el && el.closest('[data-tutorial="toolpanel"]')) {
                el.scrollIntoView({ behavior: 'smooth', block: step.scroll || 'nearest' });
            }
        };
        const t1 = setTimeout(run, 120);
        const t2 = setTimeout(run, 380);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isOpen, step]);

    useEffect(() => {
        if (!isOpen || !cardRef.current) return undefined;
        const update = () => {
            const h = Math.round(cardRef.current?.getBoundingClientRect().height || 0);
            if (h > 0) setCardH((prev) => (prev === h ? prev : h));
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(cardRef.current);
        return () => ro.disconnect();
    }, [isOpen, currentStepIndex, isStepDone]);

    if (!isOpen) return null;

    const union = rects.length
        ? (() => {
            const top = Math.min(...rects.map((r) => r.top));
            const left = Math.min(...rects.map((r) => r.left));
            const bottom = Math.max(...rects.map((r) => r.top + r.height));
            const right = Math.max(...rects.map((r) => r.left + r.width));
            return { top, left, width: right - left, height: bottom - top, bottom, right };
        })()
        : null;

    const layout = getLayout({
        rect: union,
        cardH,
        vw: viewport.w,
        vh: viewport.h,
        step,
        stepIndex: currentStepIndex,
        groupIdx,
    });

    const advance = (e) => {
        e?.stopPropagation?.();
        if (!canContinue) return;
        if (isLast) onComplete();
        else onStepChange(currentStepIndex + 1);
    };

    const holes = (rects.length > 1 && !isTry ? rects : union ? [union] : []).map((r) => ({
        x: Math.max(0, r.left - SPOT_PAD),
        y: Math.max(0, r.top - SPOT_PAD),
        w: r.width + SPOT_PAD * 2,
        h: r.height + SPOT_PAD * 2,
    }));
    const ringHoles = isTry && union ? holes.slice(0, 1) : holes;

    return (
        <div
            aria-label="Tutorial Overlay"
            className={`fixed inset-0 z-[100] select-none ${isTry ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'}`}
            onClick={isTry ? undefined : advance}
        >
            {/* Info steps dim everything except the target; try steps stay fully visible */}
            {!isTry && (
                <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ width: '100vw', height: '100vh' }}>
                    <defs>
                        <mask id="tutorial-spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {holes.map((h, i) => (
                                <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} rx="14" ry="14" fill="black" />
                            ))}
                        </mask>
                    </defs>
                    <rect x="0" y="0" width="100%" height="100%" fill="rgba(15, 23, 42, 0.72)" mask="url(#tutorial-spotlight-mask)" />
                </svg>
            )}

            {ringHoles.map((h, i) => (
                <div
                    key={i}
                    className="absolute pointer-events-none rounded-2xl border-2 border-primary ring-4 ring-primary/30 animate-pulse transition-all duration-300"
                    style={{ top: h.y, left: h.x, width: h.w, height: h.h }}
                />
            ))}

            {/* "Click the cake" bubble for the placement step */}
            {isTry && step.pointer === 'cake' && !isStepDone && (
                <motion.div
                    initial={{ opacity: 0, x: '-50%' }}
                    animate={{ opacity: 1, x: '-50%', y: [0, 14, 0] }}
                    transition={{ y: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' } }}
                    className="fixed z-[105] flex flex-col items-center gap-1.5 pointer-events-none drop-shadow-2xl"
                    style={{
                        top: viewport.w >= 768 ? '34%' : '24%',
                        left: viewport.w >= 768 ? 'calc((100vw - 340px) / 2)' : '50%',
                    }}
                >
                    <div className="rounded-full border-2 border-primary-foreground/30 bg-primary px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-xl">
                        Click the cake 👇
                    </div>
                </motion.div>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    ref={cardRef}
                    key={step.id}
                    data-tutorial-card="true"
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`fixed z-[102] pointer-events-auto cursor-default box-border flex flex-col rounded-2xl border bg-card p-3 text-card-foreground sm:p-4 shadow-2xl backdrop-blur-md ${isTry ? 'border-primary ring-2 ring-primary/20' : 'border-border/90'
                        }`}
                    style={layout.style}
                    onClick={(e) => e.stopPropagation()}
                >
                    {layout.arrow === 'right' && (
                        <div
                            className="absolute -right-2.5 -translate-y-1/2 h-0 w-0 border-y-[8px] border-y-transparent border-l-[10px] border-l-border"
                            style={{ top: layout.arrowOffset.top }}
                        >
                            <div className="absolute -left-[11px] -top-[8px] h-0 w-0 border-y-[8px] border-y-transparent border-l-[10px] border-l-card" />
                        </div>
                    )}
                    {layout.arrow === 'top' && (
                        <div
                            className="absolute -top-2.5 -translate-x-1/2 h-0 w-0 border-x-[8px] border-x-transparent border-b-[10px] border-b-border"
                            style={{ left: layout.arrowOffset.left }}
                        >
                            <div className="absolute -left-[8px] top-[1px] h-0 w-0 border-x-[8px] border-x-transparent border-b-[10px] border-b-card" />
                        </div>
                    )}

                    <div className="mb-1.5 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                                {groupIdx + 1}
                            </span>
                            <h3 className="truncate text-sm font-semibold leading-snug tracking-tight text-black dark:text-white sm:text-base">{step.title}</h3>
                        </div>
                        <button
                            type="button"
                            onClick={onSkip}
                            className="shrink-0 rounded-md px-2 py-1 text-xs font-normal text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Skip the tutorial and return to your design"
                        >
                            Skip tutorial
                        </button>
                    </div>

                    <p className="mb-2 text-xs font-normal leading-relaxed text-black dark:text-white sm:mb-2.5 sm:text-[13px]">{step.text}</p>

                    {isTry && (
                        <div
                            className={`mb-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-normal text-black dark:text-white sm:mb-2.5 sm:py-1.5 ${isStepDone ? 'bg-green-500/15' : 'bg-primary/10'
                                }`}
                        >
                            {isStepDone ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" /> : <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />}
                            <span>{isStepDone ? step.doneText || 'Done.' : 'Try it to continue. The rest is locked.'}</span>
                        </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                        <div className="flex items-center gap-1">
                            {groups.map((g, i) => (
                                <span
                                    key={g}
                                    className={`h-1.5 rounded-full transition-all duration-200 ${i === groupIdx ? 'w-4 bg-primary' : i < groupIdx ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted-foreground/30'
                                        }`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                            {isTry && !isStepDone && stuck && !isLast && (
                                <button
                                    type="button"
                                    onClick={() => onStepChange(currentStepIndex + 1)}
                                    className="text-[11px] font-normal text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                >
                                    Can't do this? Skip step
                                </button>
                            )}
                            {currentStepIndex > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); onStepChange(currentStepIndex - 1); }}
                                    className="h-8 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground"
                                    aria-label="Back"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={advance}
                                disabled={!canContinue}
                                className="h-8 shrink-0 gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-sm"
                            >
                                <span>{isLast ? 'Finish' : 'Continue'}</span>
                                {isLast ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                    </div>
                    {!isTry && (
                        <p className="mt-1.5 hidden text-center text-[10px] text-muted-foreground/70 sm:block">or click anywhere</p>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}