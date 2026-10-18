import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TUTORIAL_STEPS = [
    {
        id: '3d-camera-controls',
        target: '[data-tutorial="reset-view"]',
        fallbackSelector: '.cn-designer-canvas-area',
        title: '3D Camera Controls',
        description: (
            <div className="space-y-1.5">
                <p className="text-xs sm:text-sm">Learn to explore your 3D cake before customizing:</p>
                <ul className="text-[11px] sm:text-xs space-y-1 pl-1 text-muted-foreground">
                    <li><strong className="text-foreground">Rotate Angle:</strong> Left-click & drag (or 1-finger swipe on mobile) to orbit around the cake.</li>
                    <li><strong className="text-foreground">Zoom In / Out:</strong> Scroll mouse wheel (or pinch on mobile).</li>
                    <li><strong className="text-foreground">Move View Focus:</strong> Right-click & drag (or 2-finger drag on mobile) to pan camera focus.</li>
                    <li><strong className="text-foreground">Reset Focus Angle:</strong> Click <span className="font-semibold text-primary">Reset view</span> at top-right to return to default view.</li>
                </ul>
            </div>
        ),
        displayStep: 1,
        preferredSide: 'left',
    },
    {
        id: 'price-breakdown-info',
        target: '[data-tutorial="price-breakdown"]',
        fallbackSelector: '.cn-designer-canvas-area',
        title: 'Total Price & Breakdown',
        description: (
            <div className="space-y-1.5 text-xs sm:text-sm">
                <p>
                    Keep track of your cake cost in real time as you design! The <strong className="text-foreground">Total</strong> updates live with every size, flavor, piping, and decor addition.
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Clicking the <strong className="text-foreground">Total price card</strong> (or badge on mobile) opens the itemized breakdown modal, showing individual costs for each ingredient, tier, and topping.
                </p>
            </div>
        ),
        displayStep: 1,
        preferredSide: 'right',
    },
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
        id: 'surface-treatment-deselect-action',
        target: '[data-tutorial="surface-treatment-toggle"]',
        fallbackSelector: '[data-tutorial="section-surface-treatment"]',
        title: "Deselect with 'X'",
        description:
            "Click the 'X' button on SURFACE TREATMENT below to see what happens when you deselect it.",
        actionInstruction: "Click the 'X' button on SURFACE TREATMENT below.",
        requiresAction: true,
        actionType: 'glaze-deselect',
        noSpotlightMask: true,
        displayStep: 4,
        preferredSide: 'left',
    },
    {
        id: 'surface-treatment-deselected-result',
        target: '[data-tutorial="toolpanel"]',
        fallbackSelector: '.cn-designer-tool-panel',
        title: "Deselecting Function",
        description:
            "Notice how clicking the 'X' button immediately removed the glaze from your cake! Any optional decoration, border, or treatment featuring an 'X' can be quickly deselected and toggled off this way.",
        noSpotlightMask: true,
        displayStep: 4,
        preferredSide: 'bottom',
    },
    {
        id: 'side-tab-explore',
        target: '[data-tutorial="tab-side"], [data-tutorial="tab-edge"], [data-tutorial="tab-center"]',
        fallbackSelector: '[data-tutorial="tabs-surface"]',
        title: 'Side, Edge & Center Tabs',
        description:
            'You can simply end your designing here and send it over to the bakery, or explore the Side, Edge, or Center tabs to add more decorations, borders, and piping to your cake!',
        displayStep: 5,
        preferredSide: 'left',
    },
    {
        id: 'surface-sugar-color',
        target: '[data-tutorial="surface-sugar-color"]',
        fallbackSelector: '[data-tutorial="section-surface-treatment"]',
        title: 'Sugar Color Customization',
        description:
            'Sugar Color appears whenever you select any design that supports coloring—not just Surface Treatments, but also Fillings, Exterior Finishes, and Borders. Use Match Flavor to pick from flavor-matched tones (Vanilla, Chocolate, Strawberry, Ube, and more), or Pick Color for custom shades.',
        displayStep: 6,
        preferredSide: 'left',
    },
    {
        id: 'side-checkered-select',
        target: '[data-tutorial="side-checkered-row"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Side Decor: Checkered Pattern',
        description: 'Select a design (1-6) below.',
        actionInstruction: 'Select a design (1-6) below.',
        requiresAction: true,
        actionType: 'side-checkered-select',
        displayStep: 7,
        preferredSide: 'left',
    },
    {
        id: 'edge-toggle-intro',
        target: '[data-tutorial="edge-toggle-row"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Edge Decor: Top & Bottom Toggles',
        description:
            'In the Edge section, Top and Bottom toggles let you design each rim independently. Toggle between them anytime to apply different border piping, trims, or dollops to the top or bottom of your cake.',
        displayStep: 8,
        preferredSide: 'left',
    },
    {
        id: 'edge-top-select',
        target: '[data-tutorial="edge-piping-row"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Edge Decor: Top Border Piping',
        description: 'Select a border piping design for the Top edge below.',
        actionInstruction: 'Select a border piping design for the Top edge below.',
        requiresAction: true,
        actionType: 'edge-top-select',
        displayStep: 8,
        preferredSide: 'left',
    },
    {
        id: 'edge-bottom-toggle',
        target: '[data-tutorial="edge-toggle-bottom"]',
        fallbackSelector: '[data-tutorial="edge-toggle-row"]',
        title: 'Edge Decor: Bottom Toggle',
        description:
            'Now press the Bottom toggle button below to switch your border controls to the bottom edge rim.',
        actionInstruction: 'Click the Bottom toggle button below.',
        requiresAction: true,
        actionType: 'edge-bottom-toggle',
        noSpotlightMask: true,
        displayStep: 8,
        preferredSide: 'left',
    },
    {
        id: 'center-intro',
        target: '[data-tutorial="center-decor-grid"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Center Decor: Drag-and-Drop Placement',
        description:
            'Welcome to the Center section! Here, you can place 3D toppers, fruits, and decorations anywhere on your cake. Pick any item to arm it, preview and rotate it with your controls, and drop it directly onto the 3D cake.',
        displayStep: 9,
        preferredSide: 'left',
    },
    {
        id: 'center-strawberry-pt1',
        target: '[data-tutorial="center-strawberry"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Center Decor: Place a Strawberry (pt1)',
        description: 'Click the Strawberry item below to pick it up.',
        actionInstruction: 'Click the Strawberry item below to pick it up.',
        requiresAction: true,
        actionType: 'strawberry-pick',
        displayStep: 9,
        preferredSide: 'left',
    },
    {
        id: 'center-strawberry-pt2-preview',
        target: '[data-tutorial="center-item-controls"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Center Decor: Rotate, Tilt & Preview',
        description:
            'With the Strawberry armed, check out the controls below! You can adjust its Rotate angle and Left-to-Right or Up-to-Down tilts using the sliders or chevron buttons. The 3D Preview dynamically reflects every adjustment.',
        displayStep: 9,
        preferredSide: 'left',
    },
    {
        id: 'center-strawberry-shortcuts',
        target: '[data-tutorial="center-item-controls"]',
        fallbackSelector: '[data-tutorial="toolpanel"]',
        title: 'Design Controls & Shortcuts',
        description: (
            <span>
                Try rotating and tilting your strawberry! If you are on PC, use keyboard shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">Q</kbd> <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">E</kbd> rotate, <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">W</kbd> <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">S</kbd> tilt up/down, and <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">A</kbd> <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 font-mono text-[10px] font-semibold text-foreground">D</kbd> tilt left/right. If you are on mobile, use the buttons or sliders below.
            </span>
        ),
        displayStep: 9,
        preferredSide: 'left',
    },
    {
        id: 'center-strawberry-drop',
        target: '[data-tutorial="toolpanel"]',
        fallbackSelector: '.cn-designer-tool-panel',
        title: 'Center Decor: Place your Strawberry',
        description:
            'With your Strawberry ready, click anywhere on top of the 3D cake canvas to drop and place your design!',
        actionInstruction: 'Click on top of the 3D cake canvas to drop the Strawberry design!',
        requiresAction: true,
        actionType: 'strawberry-place',
        displayStep: 9,
        preferredSide: 'top',
    },
    {
        id: 'send-bakery',
        target: '[data-tutorial="send-bakery"]',
        title: 'Send to Bakery & Simulated Order',
        description:
            'When your cake is ready, Send to Bakery simulates payment and sends an email notification. Normally it transports you straight into Bakery Chat to talk with the baker!',
        displayStep: 10,
        preferredSide: 'bottom',
    },
];

/**
 * Calculates position, dimensions, and arrow orientation for the tutorial card,
 * guaranteeing that it never overflows or clips outside the available viewport space.
 */
function getConstrainedTutorialLayout({
    targetRect,
    cardDimensions,
    step,
    isStrawberryArmed,
    isStrawberryStep,
    viewportWidth,
    viewportHeight,
}) {
    const isMobile = viewportWidth < 768;
    const padding = isMobile ? 12 : 16;
    const bottomSafePadding = isMobile ? 16 : 40;
    const arrowSize = 10;

    const maxAvailableWidth = Math.max(280, viewportWidth - (padding * 2));
    const maxAvailableHeight = Math.max(200, viewportHeight - (padding + bottomSafePadding));

    // Generous, stable card width that gives text plenty of space to fit naturally
    const defaultCardWidth = isMobile ? Math.min(410, maxAvailableWidth) : 420;
    const cardWidth = Math.min(defaultCardWidth, maxAvailableWidth);

    const cardHeight = cardDimensions.height || 180;
    const minTopAllowed = (isMobile && step.id === 'center-strawberry-drop')
        ? Math.round(viewportHeight * 0.5) + 4
        : padding;
    const maxTop = Math.max(minTopAllowed, viewportHeight - cardHeight - bottomSafePadding);

    let top = padding;
    let left = padding;
    let arrowPlacement = 'none';
    let arrowOffset = { top: 24, left: '50%' };

    if (isMobile) {
        // Center horizontally within safe screen margins
        left = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, Math.round((viewportWidth - cardWidth) / 2)));

        if (step.id === 'center-strawberry-drop') {
            // When dropping Strawberry in mobile view, keep tutorial box strictly in the bottom half
            // (over the toolpanel area) so it NEVER enters or blocks the 3D Render view of the cake.
            top = Math.max(Math.round(viewportHeight * 0.5) + 8, viewportHeight - cardHeight - bottomSafePadding);
            arrowPlacement = 'none';
        } else if (step.id === 'surface-treatment-deselected-result') {
            // Keep tutorial card right below the 3D Render view of the cake on mobile
            top = Math.max(Math.round(viewportHeight * 0.5) + 8, Math.min(maxTop, Math.round(viewportHeight * 0.5) + 12));
            left = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, Math.round((viewportWidth - cardWidth) / 2)));
            arrowPlacement = 'none';
        } else if (step.id === 'surface-treatment-deselect-action') {
            // Place tutorial card at top over 3D render area so the ToolPanel and "X" button are completely unobstructed
            top = 64;
            left = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, Math.round((viewportWidth - cardWidth) / 2)));
            arrowPlacement = 'none';
        } else if (step.id === 'center-strawberry-shortcuts' || step.id === 'decor-controls-tip') {
            // For shortcuts step, move help tutorial box to the top where the 3D render is at
            top = 64;
            left = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, Math.round((viewportWidth - cardWidth) / 2)));
            arrowPlacement = 'none';
        } else if (step.id === 'surface-sugar-color') {
            // For sugar color focus on mobile, keep tutorial card in the upper portion over the 3D render
            // so the entire Sugar Color section (Match Flavor, Vanilla / Chocolate) in the tool panel below is completely visible!
            top = 64;
            left = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, Math.round((viewportWidth - cardWidth) / 2)));
            arrowPlacement = 'none';
        } else if (targetRect) {
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;

            const spaceAbove = targetRect.top - 56 - arrowSize - 10;
            const spaceBelow = viewportHeight - targetRect.bottom - bottomSafePadding - arrowSize - 10;

            const preferAbove = targetCenterY > viewportHeight * 0.45;

            if (preferAbove && spaceAbove >= Math.min(cardHeight, 180)) {
                arrowPlacement = 'bottom';
                top = Math.max(62, targetRect.top - cardHeight - arrowSize - 12);
                arrowOffset = {
                    left: Math.max(24, Math.min(cardWidth - 24, targetCenterX - left)),
                };
            } else if (spaceBelow >= Math.min(cardHeight, 180)) {
                arrowPlacement = 'top';
                top = Math.min(viewportHeight - cardHeight - bottomSafePadding, targetRect.bottom + arrowSize + 8);
                arrowOffset = {
                    left: Math.max(24, Math.min(cardWidth - 24, targetCenterX - left)),
                };
            } else {
                if (spaceAbove >= spaceBelow) {
                    arrowPlacement = 'bottom';
                    top = Math.max(60, targetRect.top - cardHeight - arrowSize - 8);
                    arrowOffset = {
                        left: Math.max(24, Math.min(cardWidth - 24, targetCenterX - left)),
                    };
                } else {
                    arrowPlacement = 'top';
                    top = Math.max(padding, targetRect.bottom + arrowSize + 8);
                    arrowOffset = {
                        left: Math.max(24, Math.min(cardWidth - 24, targetCenterX - left)),
                    };
                }
            }
        } else {
            arrowPlacement = 'none';
            top = Math.max(64, Math.round((viewportHeight - cardHeight) / 2));
        }
    } else {
        // Desktop Layout
        if (step.id === 'surface-treatment-deselected-result') {
            // Card placed just below the 3D Render on desktop
            top = Math.min(maxTop, viewportHeight - cardHeight - 24);
            const renderWidth = Math.max(300, viewportWidth - 380);
            left = Math.max(padding, Math.round((renderWidth - cardWidth) / 2));
            arrowPlacement = 'none';
        } else if (step.id === 'center-strawberry-shortcuts' || step.id === 'decor-controls-tip') {
            // For shortcuts step, move help tutorial box to the top where the 3D render is at
            top = 70;
            const renderWidth = Math.max(300, viewportWidth - 380);
            left = Math.max(padding, Math.round((renderWidth - cardWidth) / 2));
            arrowPlacement = 'none';
        } else if (targetRect) {
            const maxTop = Math.max(padding, viewportHeight - cardHeight - bottomSafePadding);
            const targetCenterY = targetRect.top + targetRect.height / 2;
            const targetCenterX = targetRect.left + targetRect.width / 2;

            const canFitLeft = targetRect.left - cardWidth - padding - arrowSize > 0;
            const canFitRight = targetRect.right + cardWidth + padding + arrowSize < viewportWidth;
            const canFitBottom = targetRect.bottom + cardHeight + 40 < viewportHeight;

            if (step.preferredSide === 'bottom' && canFitBottom) {
                arrowPlacement = 'top';
                left = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, targetCenterX - cardWidth / 2));
                top = targetRect.bottom + arrowSize + 8;
                arrowOffset = {
                    left: Math.max(24, Math.min(cardWidth - 24, targetCenterX - left)),
                };
            } else if ((step.preferredSide === 'left' || canFitLeft) && canFitLeft) {
                arrowPlacement = isStrawberryArmed ? 'left' : 'right';
                let desiredTop;
                if (isStrawberryStep) {
                    desiredTop = Math.max(80, Math.min(200, maxTop));
                } else {
                    desiredTop = Math.max(padding, Math.min(maxTop, targetCenterY - cardHeight / 2));
                }
                top = desiredTop;
                left = targetRect.left - cardWidth - arrowSize - 8;
                arrowOffset = {
                    top: (isStrawberryStep && isStrawberryArmed)
                        ? Math.round(cardHeight / 2)
                        : Math.max(24, Math.min(cardHeight - 24, targetCenterY - desiredTop)),
                };
            } else if (canFitRight) {
                arrowPlacement = 'left';
                top = Math.max(padding, Math.min(maxTop, targetCenterY - cardHeight / 2));
                left = targetRect.right + arrowSize + 8;
                arrowOffset = {
                    top: Math.max(24, Math.min(cardHeight - 24, targetCenterY - top)),
                };
            } else {
                top = Math.max(padding, Math.min(maxTop, viewportHeight - cardHeight - 24));
                left = Math.max(padding, Math.round((viewportWidth - cardWidth) / 2));
                arrowPlacement = 'top';
            }
        } else {
            arrowPlacement = 'none';
            top = Math.max(padding, Math.min(maxTop, viewportHeight - cardHeight - 24));
            left = Math.max(padding, Math.round((viewportWidth - cardWidth) / 2));
        }
    }

    // Absolute viewport constraint guarantee: never overflows available space
    const clampedTop = Math.max(minTopAllowed, Math.min(maxTop, Math.round(top)));
    const clampedLeft = Math.max(padding, Math.min(viewportWidth - cardWidth - padding, Math.round(left)));

    return {
        computedStyle: {
            top: `${clampedTop}px`,
            left: `${clampedLeft}px`,
            width: `${cardWidth}px`,
            maxWidth: `${maxAvailableWidth}px`,
            height: 'auto',
        },
        arrowPlacement,
        arrowOffset,
    };
}

export default function DesignerTutorial({
    isOpen,
    currentStepIndex,
    isActionActive,
    hasPerformedAction,
    activeTool,
    hasControlsInteracted = false,
    onStepChange,
    onStartStepAction,
    onComplete,
    onSkip,
}) {
    const [targetRect, setTargetRect] = useState(null);
    const [targetRects, setTargetRects] = useState([]);
    const [cardDimensions, setCardDimensions] = useState({ width: 360, height: 260 });
    const [viewport, setViewport] = useState(() => ({
        width: typeof window !== 'undefined' ? window.innerWidth : 390,
        height: typeof window !== 'undefined' ? window.innerHeight : 844,
    }));

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cardRef = useRef(null);
    const step = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
    const totalSteps = TUTORIAL_STEPS.length;

    const uniqueDisplaySteps = Array.from(new Set(TUTORIAL_STEPS.map((s) => s.displayStep)));
    const currentDisplayStep = step.displayStep || (currentStepIndex + 1);
    const totalDisplaySteps = uniqueDisplaySteps.length;

    const isStrawberryStep = typeof step.id === 'string' && (step.id.startsWith('center-strawberry') || step.id === 'decor-controls-tip');
    const isStrawberryArmed = (step.id === 'center-strawberry-drop') || (Boolean(activeTool) && isStrawberryStep);

    const measureTarget = useCallback(() => {
        let els = [];
        if (step.target) {
            const matches = Array.from(document.querySelectorAll(step.target));
            els = matches.filter((m) => {
                const r = m.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });
        }
        if (els.length === 0 && step.fallbackSelector) {
            const matches = Array.from(document.querySelectorAll(step.fallbackSelector));
            els = matches.filter((m) => {
                const r = m.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });
        }

        if (els.length > 0) {
            const rects = els.map((el) => {
                const r = el.getBoundingClientRect();
                return {
                    top: Math.round(r.top),
                    left: Math.round(r.left),
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    bottom: Math.round(r.bottom),
                    right: Math.round(r.right),
                };
            });

            const minTop = Math.min(...rects.map((r) => r.top));
            const minLeft = Math.min(...rects.map((r) => r.left));
            const maxBottom = Math.max(...rects.map((r) => r.bottom));
            const maxRight = Math.max(...rects.map((r) => r.right));

            const unionRect = {
                top: minTop,
                left: minLeft,
                width: maxRight - minLeft,
                height: maxBottom - minTop,
                bottom: maxBottom,
                right: maxRight,
            };

            setTargetRects(rects);
            setTargetRect((prev) => {
                if (
                    prev &&
                    Math.abs(prev.top - unionRect.top) < 1 &&
                    Math.abs(prev.left - unionRect.left) < 1 &&
                    Math.abs(prev.width - unionRect.width) < 1 &&
                    Math.abs(prev.height - unionRect.height) < 1
                ) {
                    return prev;
                }
                return unionRect;
            });
            return;
        }

        setTargetRects([]);
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
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else if (step.id === 'side-checkered-select') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else if (step.id === 'edge-toggle-intro' || step.id === 'edge-top-select' || step.id === 'edge-bottom-toggle') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    } else if (step.id === 'center-intro') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    } else if (step.id === 'side-tab-explore') {
                        const viewport = document.querySelector('[data-tutorial="toolpanel"] [data-radix-scroll-area-viewport]');
                        if (viewport) viewport.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Measure card height dynamically so arrow offset and positioning never detaches or overflows
    useEffect(() => {
        if (!isOpen || !cardRef.current) return;
        const updateDims = () => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                if (rect.height > 0) {
                    setCardDimensions((prev) => {
                        const newH = Math.round(rect.height);
                        if (prev.height === newH) {
                            return prev;
                        }
                        return { height: newH };
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
            onStepChange(currentStepIndex + 1);
            return;
        }

        if (isLastStep) {
            onComplete();
        } else {
            onStepChange(currentStepIndex + 1);
        }
    };

    const { computedStyle, arrowPlacement, arrowOffset } = getConstrainedTutorialLayout({
        targetRect,
        cardDimensions,
        step,
        isStrawberryArmed,
        isStrawberryStep,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
    });

    const spotlightPadding = 8;
    const isGlazeDeselectStep = step.id === 'surface-treatment-deselect-action';
    const isStrawberryPickStep = step.id === 'center-strawberry-pt1';
    const isControlsInteractionStep = step.id === 'center-strawberry-shortcuts' || step.id === 'decor-controls-tip';
    const isSideCheckeredStep = step.id === 'side-checkered-select';
    const isEdgeTopStep = step.id === 'edge-top-select';
    const isEdgeBottomToggleStep = step.id === 'edge-bottom-toggle';
    const isEdgeDesignStep = isEdgeTopStep;
    const isStrawberryDropStep = step.id === 'center-strawberry-drop';

    const isContinueDisabled =
        isGlazeDeselectStep ||
        (isStrawberryPickStep && !isStrawberryArmed) ||
        (isControlsInteractionStep && !hasControlsInteracted) ||
        isSideCheckeredStep ||
        isEdgeTopStep ||
        isEdgeBottomToggleStep ||
        isStrawberryDropStep;
    const isInteractivePhase =
        isActionActive ||
        isGlazeDeselectStep ||
        isStrawberryPickStep ||
        isControlsInteractionStep ||
        isSideCheckeredStep ||
        isEdgeTopStep ||
        isEdgeBottomToggleStep ||
        isStrawberryDropStep;

    const isStep5Tabs = step.id === 'side-tab-explore' && targetRects && targetRects.length >= 3;
    let step5Path = '';
    if (isStep5Tabs) {
        const sortedByTop = [...targetRects].sort((a, b) => a.top - b.top);
        const sideRect = sortedByTop[0]; // top row (Side)
        const bottomRow = sortedByTop.slice(1).sort((a, b) => a.left - b.left);
        const centerRect = bottomRow[0]; // bottom row, left (Center)
        const edgeRect = bottomRow[1];   // bottom row, right (Edge)

        const pad = 4;
        const r = 12;

        const x1 = centerRect.left - pad;
        const x2 = sideRect.left - pad;
        const x3 = Math.max(sideRect.right, edgeRect.right) + pad;
        const y1 = sideRect.top - pad;
        const y2 = Math.min(centerRect.top, edgeRect.top) - pad;
        const y3 = Math.max(centerRect.bottom, edgeRect.bottom) + pad;

        step5Path = `M ${x1 + r} ${y2} ` +
            `L ${x2 - r} ${y2} Q ${x2} ${y2} ${x2} ${y2 - r} ` +
            `L ${x2} ${y1 + r} Q ${x2} ${y1} ${x2 + r} ${y1} ` +
            `L ${x3 - r} ${y1} Q ${x3} ${y1} ${x3} ${y1 + r} ` +
            `L ${x3} ${y3 - r} Q ${x3} ${y3} ${x3 - r} ${y3} ` +
            `L ${x1 + r} ${y3} Q ${x1} ${y3} ${x1} ${y3 - r} ` +
            `L ${x1} ${y2 + r} Q ${x1} ${y2} ${x1 + r} ${y2} Z`;
    }

    return (
        <div
            className={`fixed inset-0 z-[100] select-none ${isInteractivePhase ? 'pointer-events-none' : 'overflow-hidden pointer-events-auto'
                }`}
            aria-label="Tutorial Overlay"
        >
            {/* SVG Mask Cutout — active only during overview phase */}
            {!isInteractivePhase && !step.noSpotlightMask && (
                <>
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
                        style={{ width: '100vw', height: '100vh' }}
                    >
                        <defs>
                            <mask id="tutorial-spotlight-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                {isStep5Tabs && step5Path ? (
                                    <path d={step5Path} fill="black" />
                                ) : targetRects && targetRects.length > 1 ? (
                                    targetRects.map((rect, idx) => (
                                        <rect
                                            key={idx}
                                            x={Math.max(0, rect.left - spotlightPadding)}
                                            y={Math.max(0, rect.top - spotlightPadding)}
                                            width={rect.width + spotlightPadding * 2}
                                            height={rect.height + spotlightPadding * 2}
                                            rx="12"
                                            ry="12"
                                            fill="black"
                                        />
                                    ))
                                ) : targetRect ? (
                                    <rect
                                        x={Math.max(0, targetRect.left - spotlightPadding)}
                                        y={Math.max(0, targetRect.top - spotlightPadding)}
                                        width={targetRect.width + spotlightPadding * 2}
                                        height={targetRect.height + spotlightPadding * 2}
                                        rx="14"
                                        ry="14"
                                        fill="black"
                                    />
                                ) : null}
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

                    {/* Pulsing ring around target(s) */}
                    {isStep5Tabs && step5Path ? (
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
                            style={{ width: '100vw', height: '100vh' }}
                        >
                            {/* Outer translucent glow border */}
                            <path
                                d={step5Path}
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeOpacity="0.35"
                                strokeWidth="8"
                                strokeLinejoin="round"
                                className="animate-pulse"
                            />
                            {/* Inner solid border */}
                            <path
                                d={step5Path}
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                                className="animate-pulse"
                            />
                        </svg>
                    ) : targetRects && targetRects.length > 1 ? (
                        targetRects.map((rect, idx) => (
                            <div
                                key={idx}
                                className="absolute pointer-events-none rounded-xl border-2 border-primary ring-4 ring-primary/30 transition-all duration-300 animate-pulse"
                                style={{
                                    top: Math.max(0, rect.top - spotlightPadding),
                                    left: Math.max(0, rect.left - spotlightPadding),
                                    width: rect.width + spotlightPadding * 2,
                                    height: rect.height + spotlightPadding * 2,
                                }}
                            />
                        ))
                    ) : targetRect ? (
                        <div
                            className="absolute pointer-events-none rounded-2xl border-2 border-primary ring-4 ring-primary/30 transition-all duration-300 animate-pulse"
                            style={{
                                top: Math.max(0, targetRect.top - spotlightPadding),
                                left: Math.max(0, targetRect.left - spotlightPadding),
                                width: targetRect.width + spotlightPadding * 2,
                                height: targetRect.height + spotlightPadding * 2,
                            }}
                        />
                    ) : null}
                </>
            )}

            {/* Pointing Arrow Animation Indicator */}
            {isInteractivePhase && !hasPerformedAction && (
                <>
                    {/* Case A: Strawberry is armed and ready to drop — point directly at the cake on the canvas */}
                    {isStrawberryArmed && step.id === 'center-strawberry-drop' ? (
                        <motion.div
                            initial={{ opacity: 0, x: '-50%', y: -20, scale: 0.9 }}
                            animate={{
                                opacity: 1,
                                x: '-50%',
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
                                top: viewport.width >= 768 ? '34%' : '24%',
                                left: viewport.width >= 768 ? 'calc((100vw - 380px) / 2)' : '50%',
                            }}
                        >
                            <div className="bg-primary text-primary-foreground font-extrabold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl shadow-primary/30 uppercase tracking-wider border-2 border-primary-foreground/30">
                                <span>Click on cake to place</span>
                                <span className="text-base leading-none">👇</span>
                            </div>
                            <div className="w-3 h-3 rotate-45 bg-primary -mt-2 border-r-2 border-b-2 border-primary-foreground/30" />
                        </motion.div>
                    ) : isGlazeDeselectStep && targetRect ? (
                        /* Case B: Glaze Deselect Action — animated moving arrow pointing directly at the 'X' button of SURFACE TREATMENT */
                        viewport.width >= 768 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    opacity: 1,
                                    scale: [1, 1.1, 1],
                                    x: [0, 8, 0],
                                }}
                                transition={{
                                    opacity: { duration: 0.2 },
                                    scale: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                    x: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                }}
                                className="fixed pointer-events-none z-[105] flex items-center gap-2 drop-shadow-xl"
                                style={{
                                    top: targetRect.top + targetRect.height / 2 - 16,
                                    left: Math.max(12, targetRect.left - 76),
                                }}
                            >
                                <div className="bg-primary text-primary-foreground font-extrabold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl shadow-primary/30 uppercase tracking-wider border-2 border-primary-foreground/30">
                                    <span>Click X</span>
                                    <span className="text-base leading-none">👉</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: '-50%' }}
                                animate={{
                                    opacity: 1,
                                    scale: [1, 1.1, 1],
                                    x: '-50%',
                                    y: [0, 6, 0],
                                }}
                                transition={{
                                    opacity: { duration: 0.2 },
                                    scale: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                    y: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                }}
                                className="fixed pointer-events-none z-[105] flex flex-col items-center gap-1 drop-shadow-xl"
                                style={{
                                    top: Math.max(12, targetRect.top - 38),
                                    left: targetRect.left + targetRect.width / 2,
                                }}
                            >
                                <div className="bg-primary text-primary-foreground font-extrabold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl shadow-primary/30 uppercase tracking-wider border-2 border-primary-foreground/30">
                                    <span>Click X</span>
                                    <span className="text-base leading-none">👇</span>
                                </div>
                            </motion.div>
                        )
                    ) : isEdgeBottomToggleStep && targetRect ? (
                        /* Case C: Bottom Toggle Action — animated moving arrow pointing directly at the Bottom toggle button */
                        viewport.width >= 768 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    opacity: 1,
                                    scale: [1, 1.1, 1],
                                    x: [0, 8, 0],
                                }}
                                transition={{
                                    opacity: { duration: 0.2 },
                                    scale: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                    x: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                }}
                                className="fixed pointer-events-none z-[105] flex items-center gap-2 drop-shadow-xl"
                                style={{
                                    top: targetRect.top + targetRect.height / 2 - 16,
                                    left: Math.max(12, targetRect.left - 110),
                                }}
                            >
                                <div className="bg-primary text-primary-foreground font-extrabold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl shadow-primary/30 uppercase tracking-wider border-2 border-primary-foreground/30">
                                    <span>Click Bottom</span>
                                    <span className="text-base leading-none">👉</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: '-50%' }}
                                animate={{
                                    opacity: 1,
                                    scale: [1, 1.1, 1],
                                    x: '-50%',
                                    y: [0, 6, 0],
                                }}
                                transition={{
                                    opacity: { duration: 0.2 },
                                    scale: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                    y: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' },
                                }}
                                className="fixed pointer-events-none z-[105] flex flex-col items-center gap-1 drop-shadow-xl"
                                style={{
                                    top: Math.max(12, targetRect.top - 38),
                                    left: targetRect.left + targetRect.width / 2,
                                }}
                            >
                                <div className="bg-primary text-primary-foreground font-extrabold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl shadow-primary/30 uppercase tracking-wider border-2 border-primary-foreground/30">
                                    <span>Click Bottom</span>
                                    <span className="text-base leading-none">👇</span>
                                </div>
                            </motion.div>
                        )
                    ) : isStrawberryPickStep && targetRect ? (
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
                    className={`fixed z-[102] pointer-events-auto bg-card text-card-foreground rounded-2xl shadow-2xl border border-border/90 p-4 sm:p-5 backdrop-blur-md transition-all duration-200 box-border flex flex-col ${isActionActive ? 'border-primary ring-2 ring-primary/20 shadow-primary/10' : ''
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
                    {arrowPlacement === 'bottom' && (
                        <div
                            className="absolute -bottom-2.5 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-border"
                            style={{ left: arrowOffset.left }}
                        >
                            <div className="absolute -top-[11px] -left-[8px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-card" />
                        </div>
                    )}

                    {/* Header */}
                    <div className="shrink-0 flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                                {currentDisplayStep}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold font-heading text-foreground tracking-tight leading-snug">
                                {step.title}
                            </h3>
                        </div>
                        <button
                            onClick={onSkip}
                            className="shrink-0 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2 py-1 rounded-md hover:bg-muted"
                            title="Skip and exit tutorial"
                        >
                            Skip
                        </button>
                    </div>

                    {/* Description */}
                    <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3.5 select-none">
                        {isActionActive && !hasPerformedAction
                            ? isStrawberryArmed
                                ? step.actionInstructionPlaced || step.actionInstruction || step.description
                                : step.actionInstruction || step.description
                            : step.description}
                    </div>

                    {/* Footer Controls */}
                    <div className="shrink-0 mt-auto pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                        {/* Step progress dots */}
                        <div className="flex items-center gap-1 shrink-0">
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
                        <div className="flex items-center gap-2 shrink-0">
                            {currentStepIndex > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStepChange(currentStepIndex - 1);
                                    }}
                                    className="rounded-xl px-3 font-semibold text-xs h-8 flex items-center gap-1 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>Back</span>
                                </Button>
                            )}

                            <Button
                                size="sm"
                                onClick={handleNextClick}
                                disabled={isContinueDisabled}
                                className={`rounded-xl px-4 font-semibold text-xs h-8 shadow-sm flex items-center gap-1.5 shrink-0 transition-all ${
                                    isContinueDisabled ? 'opacity-40 cursor-not-allowed' : ''
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