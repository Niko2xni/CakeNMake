import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    CheckCircle2,
    Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TUTORIAL_STEPS = [
    {
        id: 'intro',
        target: '[data-tutorial="toolpanel"]',
        fallbackSelector: '.cn-designer-tool-panel',
        title: 'Freeform Cake Designer',
        description:
            'Welcome to CakeNMake! There is no need for strict step-by-step procedures here—you are free to customize any section in whatever order you want.',
        displayStep: 1,
        preferredSide: 'left',
    },
    {
        id: 'design-mode',
        target: '[data-tutorial="mode-design"]',
        title: 'Manual Design Mode',
        description:
            'This is where you are right now. Here, you have full manual control over every layer, texture, piping, and decor of your cake.',
        displayStep: 2,
        preferredSide: 'left',
    },
    {
        id: 'ai-mode',
        target: '[data-tutorial="mode-ai"]',
        title: 'AI Designer Assistant',
        description:
            'Want quick inspiration or automated adjustments? Switch to AI mode anytime and let AI design or adapt your cake immediately.',
        displayStep: 3,
        preferredSide: 'left',
    },
    {
        id: 'fundamentals-defaulted',
        target: '[data-tutorial="toolpanel"]',
        fallbackSelector: '.cn-designer-tool-panel',
        title: 'Cake Fundamentals & Defaults',
        description:
            'These options are all defaulted and cannot be deselected—they are required fundamentals that can only be replaced with another option.',
        displayStep: 4,
        preferredSide: 'left',
    },
    {
        id: 'surface-treatment-deselection',
        target: '[data-tutorial="section-surface-treatment"]',
        title: 'Deselecting Options',
        description:
            'Notice that none of the fundamental cake options show an "X" when selected. In contrast, optional elements like Surface Treatment show an "X" when active, allowing you to deselect or remove them.',
        displayStep: 4,
        preferredSide: 'left',
    },
    {
        id: 'surface-sugar-color',
        target: '[data-tutorial="surface-sugar-color"]',
        fallbackSelector: '[data-tutorial="section-surface-treatment"]',
        title: 'Sugar Color Customization',
        description:
            'Sugar Color appears whenever you select any design that supports coloring—not just Surface Treatments, but also Fillings, Exterior Finishes, and Borders. Use Match Flavor to pick from flavor-matched tones (Vanilla, Chocolate, Strawberry, Ube, and more), or Pick Color for custom shades.',
        displayStep: 5,
        preferredSide: 'left',
    },
    {
        id: 'surface-treatment',
        target: '[data-tutorial="tabs-surface"]',
        title: 'Surface Treatments (Side & Edge)',
        description:
            'Side and Edge tabs provide rich design presets that instantly wrap intricate borders, pearls, or piping onto the cake. Explore the presets to see changes—presets without an "X" swap directly.',
        displayStep: 6,
        preferredSide: 'left',
    },
    {
        id: 'decor-controls-tip',
        target: '[data-tutorial="center-strawberry"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Design Controls & Shortcuts',
        description: (
            <span>
                Tip: while a design is selected —{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">W</kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">S</kbd>{' '}
                tilt up/down,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">A</kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">D</kbd>{' '}
                tilt left/right,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">Q</kbd>{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">E</kbd>{' '}
                rotate. If you are using a phone, you can just use the toolpanel buttons instead!
            </span>
        ),
        displayStep: 7,
        preferredSide: 'left',
    },
    {
        id: 'center-strawberry',
        target: '[data-tutorial="center-strawberry"]',
        title: 'Center Decor: Place a Strawberry',
        description:
            'First click the Strawberry decor option, then click at the top of the cake to place your design! Once placed, you can rotate, tilt, or fine-tune its position.',
        actionInstruction: 'Click the Strawberry item below to pick it up.',
        actionInstructionPlaced: 'Now click on top of the 3D cake canvas to drop the Strawberry design!',
        requiresAction: true,
        actionType: 'strawberry',
        displayStep: 7,
        preferredSide: 'left',
    },
    {
        id: 'send-bakery',
        target: '[data-tutorial="send-bakery"]',
        title: 'Send to Bakery & Simulated Order',
        description:
            'When your cake is ready, Send to Bakery simulates payment and sends an email notification. Normally it transports you straight into Bakery Chat to talk with the baker!',
        displayStep: 8,
        preferredSide: 'bottom',
    },
];

export default function DesignerTutorial({
    isOpen,
    currentStepIndex,
    isActionActive,
    hasPerformedAction,
    activeTool,
    onStepChange,
    onStartStepAction,
    onComplete,
    onSkip,
}) {
    const [targetRect, setTargetRect] = useState(null);
    const [cardDimensions, setCardDimensions] = useState({ width: 360, height: 260 });
    const cardRef = useRef(null);
    const step = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
    const totalSteps = TUTORIAL_STEPS.length;

    const uniqueDisplaySteps = Array.from(new Set(TUTORIAL_STEPS.map((s) => s.displayStep)));
    const currentDisplayStep = step.displayStep || (currentStepIndex + 1);
    const totalDisplaySteps = uniqueDisplaySteps.length;

    const isStrawberryStep = step.id === 'center-strawberry';
    const isStrawberryArmed = isStrawberryStep && Boolean(activeTool);

    const measureTarget = useCallback(() => {
        let el = null;
        if (step.target) {
            const matches = Array.from(document.querySelectorAll(step.target));
            el = matches.find((m) => {
                const r = m.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            }) || matches[0] || null;
        }
        if (!el && step.fallbackSelector) {
            const matches = Array.from(document.querySelectorAll(step.fallbackSelector));
            el = matches.find((m) => {
                const r = m.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            }) || matches[0] || null;
        }

        if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setTargetRect((prev) => {
                    // Prevent unnecessary state updates if values are identical (rounds to nearest integer to eliminate subpixel jitter)
                    const top = Math.round(rect.top);
                    const left = Math.round(rect.left);
                    const width = Math.round(rect.width);
                    const height = Math.round(rect.height);

                    if (
                        prev &&
                        Math.abs(prev.top - top) < 1 &&
                        Math.abs(prev.left - left) < 1 &&
                        Math.abs(prev.width - width) < 1 &&
                        Math.abs(prev.height - height) < 1
                    ) {
                        return prev;
                    }

                    return {
                        top,
                        left,
                        width,
                        height,
                        bottom: top + height,
                        right: left + width,
                    };
                });
                return;
            }
        }
        setTargetRect(null);
    }, [step]);

    // Scroll target into view smoothly when step changes
    useEffect(() => {
        if (!isOpen) return;

        const scrollTimer = setTimeout(() => {
            const selector = step.target || step.fallbackSelector;
            if (selector) {
                const matches = Array.from(document.querySelectorAll(selector));
                const el = matches.find((m) => {
                    const r = m.getBoundingClientRect();
                    return r.width > 0 && r.height > 0;
                }) || matches[0] || null;
                if (el) {
                    if (step.id === 'surface-treatment-deselection') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else if (step.id === 'surface-sugar-color') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (step.id === 'fundamentals-defaulted') {
                        const viewport = document.querySelector('[data-tutorial="toolpanel"] [data-radix-scroll-area-viewport]');
                        if (viewport) viewport.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            }
        }, 80);

        return () => clearTimeout(scrollTimer);
    }, [isOpen, currentStepIndex, step]);

    // Track target bounding box without rapid polling interval flickering
    useEffect(() => {
        if (!isOpen) return;

        let rafId = null;
        const scheduleMeasure = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(measureTarget);
        };

        scheduleMeasure();
        const timer1 = setTimeout(scheduleMeasure, 120);
        const timer2 = setTimeout(scheduleMeasure, 320);

        window.addEventListener('resize', scheduleMeasure);
        window.addEventListener('scroll', scheduleMeasure, true);

        let observer = null;
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el && typeof ResizeObserver !== 'undefined') {
                observer = new ResizeObserver(scheduleMeasure);
                observer.observe(el);
            }
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            clearTimeout(timer1);
            clearTimeout(timer2);
            window.removeEventListener('resize', scheduleMeasure);
            window.removeEventListener('scroll', scheduleMeasure, true);
            observer?.disconnect();
        };
    }, [isOpen, currentStepIndex, step, measureTarget]);

    // Measure card dimensions dynamically so arrow offset never exceeds or detaches from the card bounds
    useEffect(() => {
        if (!isOpen || !cardRef.current) return;
        const updateDims = () => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                if (rect.height > 0 && rect.width > 0) {
                    setCardDimensions((prev) => {
                        if (prev.height === Math.round(rect.height) && prev.width === Math.round(rect.width)) {
                            return prev;
                        }
                        return { width: Math.round(rect.width), height: Math.round(rect.height) };
                    });
                }
            }
        };
        updateDims();
        const ro = new ResizeObserver(updateDims);
        ro.observe(cardRef.current);
        return () => ro.disconnect();
    }, [currentStepIndex, isOpen, isActionActive]);

    if (!isOpen) return null;

    const isLastStep = currentStepIndex === totalSteps - 1;

    const handleNextClick = (e) => {
        e?.stopPropagation?.();

        if (step.requiresAction && !isActionActive && !hasPerformedAction) {
            onStartStepAction();
            return;
        }

        if (step.requiresAction && isActionActive && !hasPerformedAction) {
            return;
        }

        if (isLastStep) {
            onComplete();
        } else {
            onStepChange(currentStepIndex + 1);
        }
    };

    // Compute positioned box next to target with pointing arrow
    const cardWidth = cardDimensions.width || 360;
    const cardHeight = Math.max(cardDimensions.height || 0, 240);
    const padding = 16;
    const bottomSafePadding = 56; // Generous margin so buttons (Continue, Skip, etc.) are never cut off by viewport edge
    const maxTop = Math.max(padding, window.innerHeight - cardHeight - bottomSafePadding);
    const arrowSize = 12;

    let computedStyle = {};
    let arrowPlacement = 'right'; // which side the arrow on the card points toward
    let arrowOffset = { top: 24, left: '50%' };

    if (targetRect) {
        const isDesktop = window.innerWidth >= 768;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;

        const canFitLeft = targetRect.left - cardWidth - padding - arrowSize > 0;
        const canFitRight = targetRect.right + cardWidth + padding + arrowSize < window.innerWidth;
        const canFitBottom = targetRect.bottom + cardHeight + 40 < window.innerHeight;

        if (step.preferredSide === 'bottom' && canFitBottom) {
            arrowPlacement = 'top';
            const cardLeft = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, targetCenterX - cardWidth / 2));
            computedStyle = {
                top: targetRect.bottom + arrowSize + 8,
                left: cardLeft,
            };
            arrowOffset = {
                left: Math.max(24, Math.min(cardWidth - 24, targetCenterX - cardLeft)),
            };
        } else if (isDesktop && (step.preferredSide === 'left' || canFitLeft) && canFitLeft) {
            // Position card on the LEFT of the target panel
            // Point towards target (right) initially; once strawberry is armed, point to the other side (left towards the cake)
            arrowPlacement = isStrawberryArmed ? 'left' : 'right';

            let desiredTop;
            if (isStrawberryStep) {
                // Keep Step 7 placed comfortably higher in the upper-middle area (around 200px)
                // so it is never pushed down into the floor by expanded sliders/3D preview,
                // and the user can easily see and click the Continue button.
                desiredTop = Math.max(80, Math.min(200, maxTop));
            } else {
                desiredTop = Math.max(padding, Math.min(maxTop, targetCenterY - cardHeight / 2));
            }

            computedStyle = {
                top: desiredTop,
                left: targetRect.left - cardWidth - arrowSize - 8,
            };
            arrowOffset = {
                top: (isStrawberryStep && isStrawberryArmed)
                    ? Math.round(cardHeight / 2)
                    : Math.max(24, Math.min(cardHeight - 24, targetCenterY - desiredTop)),
            };
        } else if (isDesktop && canFitRight) {
            // Position card on the RIGHT of the target panel, arrow points LEFT towards target
            arrowPlacement = 'left';
            const desiredTop = Math.max(padding, Math.min(maxTop, targetCenterY - cardHeight / 2));
            computedStyle = {
                top: desiredTop,
                left: targetRect.right + arrowSize + 8,
            };
            arrowOffset = {
                top: Math.max(24, Math.min(cardHeight - 24, targetCenterY - desiredTop)),
            };
        } else {
            // Mobile / Compact fallback
            arrowPlacement = 'top';
            computedStyle = {
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
            };
            arrowOffset = {
                left: '50%',
            };
        }
    } else {
        arrowPlacement = 'none';
        computedStyle = {
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
        };
    }

    const spotlightPadding = 8;
    const isContinueDisabled = step.requiresAction && isActionActive && !hasPerformedAction;

    return (
        <div
            className={`fixed inset-0 z-[100] select-none ${isActionActive ? 'pointer-events-none' : 'overflow-hidden pointer-events-auto'
                }`}
            aria-label="Tutorial Overlay"
        >
            {/* SVG Mask Cutout — active only during overview phase */}
            {!isActionActive && (
                <>
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
                        style={{ width: '100vw', height: '100vh' }}
                    >
                        <defs>
                            <mask id="tutorial-spotlight-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                {targetRect && (
                                    <rect
                                        x={Math.max(0, targetRect.left - spotlightPadding)}
                                        y={Math.max(0, targetRect.top - spotlightPadding)}
                                        width={targetRect.width + spotlightPadding * 2}
                                        height={targetRect.height + spotlightPadding * 2}
                                        rx="14"
                                        ry="14"
                                        fill="black"
                                    />
                                )}
                            </mask>
                        </defs>
                        <rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            fill="rgba(15, 23, 42, 0.72)"
                            mask="url(#tutorial-spotlight-mask)"
                        />
                    </svg>

                    {/* Pulsing ring around target */}
                    {targetRect && (
                        <div
                            className="absolute pointer-events-none rounded-2xl border-2 border-primary ring-4 ring-primary/30 transition-all duration-300 animate-pulse"
                            style={{
                                top: Math.max(0, targetRect.top - spotlightPadding),
                                left: Math.max(0, targetRect.left - spotlightPadding),
                                width: targetRect.width + spotlightPadding * 2,
                                height: targetRect.height + spotlightPadding * 2,
                            }}
                        />
                    )}
                </>
            )}

            {/* Pointing Arrow Animation Indicator */}
            {isActionActive && !hasPerformedAction && (
                <>
                    {/* Case A: Strawberry is armed — remove panel pointer and point directly at the cake on the other side */}
                    {isStrawberryArmed ? (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{
                                opacity: 1,
                                y: [0, 14, 0],
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                opacity: { duration: 0.25 },
                                y: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                scale: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                            }}
                            className="fixed pointer-events-none z-[105] flex flex-col items-center gap-1.5 drop-shadow-2xl"
                            style={{
                                top: '34%',
                                left: 'calc((100vw - 380px) / 2)',
                                transform: 'translateX(-50%)',
                            }}
                        >
                            <div className="bg-primary text-primary-foreground font-extrabold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl shadow-primary/30 uppercase tracking-wider border-2 border-primary-foreground/30">
                                <span>Click on cake to place</span>
                                <span className="text-base leading-none">👇</span>
                            </div>
                            <div className="w-3 h-3 rotate-45 bg-primary -mt-2 border-r-2 border-b-2 border-primary-foreground/30" />
                        </motion.div>
                    ) : targetRect ? (
                        /* Case B: Selection prompt pointing to the panel item */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                scale: [1, 1.12, 1],
                                x: [0, -8, 0],
                            }}
                            transition={{
                                opacity: { duration: 0.2 },
                                scale: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
                                x: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
                            }}
                            className="fixed pointer-events-none z-[105] flex items-center gap-2 drop-shadow-xl"
                            style={{
                                top: targetRect.top + targetRect.height / 2 - 20,
                                left: Math.max(12, targetRect.left - 54),
                            }}
                        >
                            <div className="bg-primary text-primary-foreground font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-primary/30 uppercase tracking-wider">
                                <span>Select</span>
                                <span className="text-base leading-none">👉</span>
                            </div>
                        </motion.div>
                    ) : null}
                </>
            )}

            {/* Floating Callout Tutorial Card Following Target */}
            <AnimatePresence mode="wait">
                <motion.div
                    ref={cardRef}
                    key={`${step.id}-${isActionActive ? 'action' : 'overview'}`}
                    data-tutorial-card="true"
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`fixed z-[102] pointer-events-auto w-[calc(100vw-32px)] sm:w-[360px] max-w-[380px] max-h-[calc(100vh-64px)] overflow-y-auto bg-card text-card-foreground rounded-2xl shadow-2xl border border-border/90 p-5 backdrop-blur-md transition-all duration-200 ${isActionActive ? 'border-primary ring-2 ring-primary/20 shadow-primary/10' : ''
                        }`}
                    style={computedStyle}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Pointing Arrow on Callout Box */}
                    {arrowPlacement === 'right' && (
                        <div
                            className="absolute -right-2.5 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[10px] border-l-border"
                            style={{ top: arrowOffset.top }}
                        >
                            <div className="absolute -top-[8px] -left-[11px] w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[10px] border-l-card" />
                        </div>
                    )}
                    {arrowPlacement === 'left' && (
                        <div
                            className="absolute -left-2.5 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-border"
                            style={{ top: arrowOffset.top }}
                        >
                            <div className="absolute -top-[8px] left-[1px] w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-card" />
                        </div>
                    )}
                    {arrowPlacement === 'top' && (
                        <div
                            className="absolute -top-2.5 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-border"
                            style={{ left: arrowOffset.left }}
                        >
                            <div className="absolute top-[1px] -left-[8px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-card" />
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                                {currentDisplayStep}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold font-heading text-foreground tracking-tight">
                                {step.title}
                            </h3>
                        </div>
                        <button
                            onClick={onSkip}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2 py-1 rounded-md hover:bg-muted"
                            title="Skip and exit tutorial"
                        >
                            Skip
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3.5">
                        {isActionActive && !hasPerformedAction
                            ? isStrawberryArmed
                                ? step.actionInstructionPlaced || step.actionInstruction
                                : step.actionInstruction || step.description
                            : step.description}
                    </p>



                    {/* Footer Controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        {/* Step progress dots */}
                        <div className="flex items-center gap-1">
                            {uniqueDisplaySteps.map((ds) => (
                                <span
                                    key={ds}
                                    className={`h-1.5 rounded-full transition-all duration-200 ${ds === currentDisplayStep
                                            ? 'w-4 bg-primary'
                                            : ds < currentDisplayStep
                                                ? 'w-1.5 bg-primary/40'
                                                : 'w-1.5 bg-muted-foreground/30'
                                        }`}
                                />
                            ))}
                            <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                                {currentDisplayStep}/{totalDisplaySteps}
                            </span>
                        </div>

                        {/* Next / Finish Button */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleNextClick}
                                disabled={isContinueDisabled}
                                className={`rounded-xl px-3.5 font-semibold text-xs h-8 shadow-sm flex items-center gap-1.5 transition-all ${isContinueDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                <span>{isLastStep ? 'Finish' : 'Continue'}</span>
                                {isLastStep ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}