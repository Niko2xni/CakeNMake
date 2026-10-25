import { isPetitsFourStructure, isBentoStructure } from '@/lib/cakeConfig';

/**
 * Designer tutorial — one flat, data-driven list.
 *
 * Every step is either:
 *   kind: 'info' → spotlight + short text. Continue button OR a click anywhere advances.
 *   kind: 'try'  → the user must actually do something. Everything on the page except
 *                  `allow` selectors is locked; Continue unlocks once `done` is satisfied.
 *
 * Step fields
 *   group      progress dot (steps sharing a group share one dot)
 *   target     CSS selector(s) to spotlight (union of matches)
 *   allow      selectors that stay clickable on a 'try' step (the card always does)
 *   block      selectors blocked even if inside an allowed region
 *   done       how a 'try' step completes (one of):
 *                { click: selector, count?: n }   n clicks on matching elements
 *                { when: (ctx) => boolean }       state check; ctx = { config, activeTool,
 *                                                  selectedCenterItemId, activeTab, activeEdgeSlot }
 *                { event: 'place' }               workspace event
 *                { gesture: 'rotate'|'zoom'|'pan' } camera gesture on the 3D canvas
 *                { touch: selector, keys?: 'qweasd' } pointer/keyboard use inside a region
 *   doneText   one short line shown once the step is complete
 *   setup      workspace state applied when the step is entered:
 *                tab, mode ('design'|'ai'), expand ('none' | [section keys]), edgeSlot,
 *                tool (null | 'strawberry'), keepSelection, camera ('reset'), scrollTop,
 *                patch: (config, initialConfig) => config
 *   lockCamera top-down placement camera (only while placing)
 *   pointer    'cake' → bouncing "click cake" bubble
 *   scroll     scrollIntoView block for targets inside the tool panel ('nearest' | 'start')
 */

const CANVAS = '[data-tutorial="cake-canvas"]';
const CANVAS_EL = '[data-tutorial="cake-canvas"] canvas';
const TOOL = '[data-tutorial="toolpanel"]';
const keepsStandardCake = (c, init) =>
    (isPetitsFourStructure(c.structure) || isBentoStructure(c.structure))
        ? { ...c, structure: structuredClone(init.structure), place: { ...(c.place || {}), items: [] } }
        : c;

const withSide = (c, mode) => {
    const { layerTreatments, ...base } = { ...(c.side || {}), mode };
    return { ...c, side: { ...base, layerTreatments: Array.from({ length: 4 }, () => ({ ...base })) } };
};

const edgeBase = (c, slot) => ({
    ...c.edge,
    mode: 'topBottomSeparate',
    activeSlot: slot,
});

const glaze = (mode) => (c) => ({
    ...c,
    surfaceTreatment: {
        ...c.surfaceTreatment,
        mode,
        pattern: c.surfaceTreatment?.pattern || 'longGaps',
        layerTreatments: [
            { mode, pattern: c.surfaceTreatment?.pattern || 'longGaps' },
            { mode, pattern: c.surfaceTreatment?.pattern || 'longGaps' },
        ],
    },
});

const fundamentals = (key, id, title, text, count = 1) => ({
    id: `fund-${id}`,
    group: 4,
    kind: 'try',
    title,
    text,
    target: `[data-tutorial="section-${key}"]`,
    allow: [`[data-tutorial="content-${key}"] button`],
    done: { click: `[data-tutorial="content-${key}"] button`, count },
    doneText: 'See the cake change? Continue when ready.',
    setup: { tab: 'fundamentals', expand: [key], tool: null },
    scroll: 'start',
});

export const TUTORIAL_STEPS = [
    // ── 1 · Camera ────────────────────────────────────────────────
    {
        id: 'cam-rotate', group: 1, kind: 'try', title: 'Rotate the cake',
        text: 'Left-click and drag on the cake (one-finger swipe on mobile).',
        target: CANVAS, allow: [CANVAS_EL],
        done: { gesture: 'rotate' }, doneText: 'Nice.',
        setup: { tab: 'fundamentals', mode: 'design', expand: 'none', camera: 'reset', scrollTop: true, patch: (_, init) => structuredClone(init) },
    },
    {
        id: 'cam-zoom', group: 1, kind: 'try', title: 'Zoom',
        text: 'Scroll the mouse wheel (pinch on mobile).',
        target: CANVAS, allow: [CANVAS_EL],
        done: { gesture: 'zoom' }, doneText: 'Nice.',
    },
    {
        id: 'cam-pan', group: 1, kind: 'try', title: 'Pan the view',
        text: 'Right-click and drag (two-finger drag on mobile) to slide the view.',
        target: CANVAS, allow: [CANVAS_EL],
        done: { gesture: 'pan' }, doneText: 'Nice.',
    },
    {
        id: 'cam-reset', group: 1, kind: 'try', title: 'Reset view',
        text: 'Lost the cake? Click Reset view to return to the default angle.',
        target: '[data-tutorial="reset-view"]', allow: ['[data-tutorial="reset-view"]'],
        done: { click: '[data-tutorial="reset-view"]' }, doneText: 'Back to default.',
    },

    // ── 2 · Price ─────────────────────────────────────────────────
    {
        id: 'price', group: 2, kind: 'info', title: 'Live price',
        text: 'The estimate updates with every choice. Open it anytime for the full breakdown.',
        target: '[data-tutorial="price-breakdown"]',
    },

    // ── 3 · Panel & modes ─────────────────────────────────────────
    {
        id: 'panel', group: 3, kind: 'info', title: 'Design panel',
        text: 'Everything you can change lives here. No step-by-step wizard: open only the sections you want.',
        target: TOOL, setup: { tab: 'fundamentals', mode: 'design', expand: 'none', scrollTop: true },
    },
    {
        id: 'mode-design', group: 3, kind: 'info', title: 'Design mode',
        text: 'You are here: build the cake by hand, layer by layer.',
        target: '[data-tutorial="mode-design"]',
    },
    {
        id: 'mode-ai', group: 3, kind: 'info', title: 'AI mode',
        text: 'Or just describe the cake and let AI design or adjust it for you.',
        target: '[data-tutorial="mode-ai"]', setup: { mode: 'ai', expand: 'none' },
    },

    // ── 4 · Fundamentals ──────────────────────────────────────────
    fundamentals('structure', 'structure', 'Cake Structure',
        'Tap two different options. A selected button with no ✕ is required: you can only swap it, never remove it.', 2),
    fundamentals('sponge', 'sponge', 'Sponge Flavor', 'Pick a flavor. Same rule: no ✕, swap only.'),
    fundamentals('filling', 'filling', 'Filling', 'Pick a filling.'),
    fundamentals('exteriorFinish', 'exterior', 'Exterior Finish', 'Pick a finish. Frosted finishes cover the sponge.'),
    {
        id: 'fund-glaze', group: 4, kind: 'try', title: 'Surface Treatment',
        text: 'This one is optional, so its selected button shows ✕. Click ✕ to remove the glaze.',
        target: '[data-tutorial="section-surfaceTreatment"]',
        allow: ['[data-tutorial="surface-treatment-toggle"]'],
        done: { when: ({ config }) => !config.surfaceTreatment?.mode },
        doneText: 'Gone. Any button with ✕ toggles off like this.',
        setup: { tab: 'fundamentals', expand: ['surfaceTreatment'], tool: null, patch: glaze('glaze') },
        scroll: 'start',
    },

    // ── 5 · Stop early ────────────────────────────────────────────
    {
        id: 'tabs', group: 5, kind: 'info', title: 'Or stop here',
        text: 'The fundamentals already make a complete cake: send it as is. Side, Edge and Center are optional extras.',
        target: '[data-tutorial="tabs-surface"]',
        setup: { tab: 'fundamentals', expand: 'none', scrollTop: true, patch: keepsStandardCake },
    },

    // ── 6 · Side ──────────────────────────────────────────────────
    {
        id: 'side-tab', group: 6, kind: 'try', title: 'Side',
        text: 'Open the Side tab.',
        target: '[data-tutorial="tab-side"]', allow: ['[data-tutorial="tab-side"]'],
        done: { when: ({ activeTab }) => activeTab === 'side' },
        setup: { tab: 'fundamentals', patch: (c, i) => withSide(keepsStandardCake(c, i), null) },
    },
    {
        id: 'side-pick', group: 6, kind: 'try', title: 'Side presets',
        text: 'Side designs are presets drawn onto the cake. Pick one.',
        target: '[data-tutorial="side-options"]', allow: ['[data-tutorial="side-options"] button'],
        done: { when: ({ config }) => Boolean(config.side?.mode) },
        doneText: 'Applied. Some designs reveal a Sugar Color picker below.',
        setup: { tab: 'side', patch: (c) => withSide(c, null) },
    },
    {
        id: 'side-remove', group: 6, kind: 'try', title: 'Remove it',
        text: 'The selected preset shows ✕. Click it to remove the design.',
        target: '[data-tutorial="side-options"]', allow: ['[data-tutorial="side-options"] button'],
        done: { when: ({ config }) => !config.side?.mode },
        doneText: 'Removed. Re-pick any design to keep one.',
        setup: { tab: 'side', patch: (c) => (c.side?.mode ? c : withSide(c, 'checkeredPattern')) },
    },

    // ── 7 · Edge ──────────────────────────────────────────────────
    {
        id: 'edge-tab', group: 7, kind: 'try', title: 'Edge',
        text: 'Open the Edge tab.',
        target: '[data-tutorial="tab-edge"]', allow: ['[data-tutorial="tab-edge"]'],
        done: { when: ({ activeTab }) => activeTab === 'edge' },
        setup: { tab: 'side', patch: (c, i) => keepsStandardCake(c, i) },
    },
    {
        id: 'edge-top', group: 7, kind: 'try', title: 'Top edge',
        text: 'Top and Bottom rims are designed separately. Pick a Border Piping for the Top.',
        target: '[data-tutorial="edge-piping-row"]',
        allow: ['[data-tutorial="edge-piping-row"] [data-edge-design="true"]'],
        done: { when: ({ config }) => Boolean(config.edge?.top?.piping?.tip) },
        doneText: 'Top rim done.',
        setup: {
            tab: 'edge', edgeSlot: 'top',
            patch: (c) => ({ ...c, edge: { ...edgeBase(c, 'top'), top: { ...(c.edge?.top || {}), piping: { tip: null, colorId: 'vanilla' } } } }),
        },
    },
    {
        id: 'edge-bottom', group: 7, kind: 'try', title: 'Switch rim',
        text: 'Now switch to Bottom.',
        target: '[data-tutorial="edge-toggle-row"]', allow: ['[data-tutorial="edge-toggle-bottom"]'],
        done: { when: ({ activeEdgeSlot, config }) => activeEdgeSlot === 'bottom' || config.edge?.activeSlot === 'bottom' },
        setup: { tab: 'edge', edgeSlot: 'top', patch: (c) => ({ ...c, edge: edgeBase(c, 'top') }) },
    },
    {
        id: 'edge-bottom-pick', group: 7, kind: 'try', title: 'Bottom edge',
        text: 'Pick a Border Piping for the Bottom.',
        target: '[data-tutorial="edge-piping-row"]',
        allow: ['[data-tutorial="edge-piping-row"] [data-edge-design="true"]'],
        done: { when: ({ config }) => Boolean(config.edge?.bottom?.piping?.tip) },
        doneText: 'Both rims styled.',
        setup: {
            tab: 'edge', edgeSlot: 'bottom',
            patch: (c) => ({ ...c, edge: { ...edgeBase(c, 'bottom'), bottom: { ...(c.edge?.bottom || {}), piping: { tip: null, colorId: 'vanilla' } } } }),
        },
    },

    // ── 8 · Center ────────────────────────────────────────────────
    {
        id: 'center-tab', group: 8, kind: 'try', title: 'Center',
        text: 'Center holds 3D toppers and text you place anywhere on the cake. Open it.',
        target: '[data-tutorial="tab-center"]', allow: ['[data-tutorial="tab-center"]'],
        done: { when: ({ activeTab }) => activeTab === 'center' },
        setup: { tab: 'edge', patch: (c, i) => keepsStandardCake(c, i) },
    },
    {
        id: 'center-pick', group: 8, kind: 'try', title: 'Pick a topper',
        text: 'Click the Strawberry to arm it. A selected topper shows ✕ and can be cancelled.',
        target: '[data-tutorial="center-strawberry"]', allow: ['[data-tutorial="center-strawberry"]'],
        done: { when: ({ activeTool }) => Boolean(activeTool) },
        setup: { tab: 'center', tool: null, patch: (c) => ({ ...c, center: { ...(c.center || {}), mode: 'decorations' } }) },
    },
    {
        id: 'center-controls', group: 8, kind: 'try', title: 'Rotate & tilt',
        text: 'The preview shows exactly how it will sit. Use the sliders or arrows, or keys: Q/E rotate · W/S tilt · A/D lean.',
        target: '[data-tutorial="center-item-controls"]', fallback: TOOL,
        allow: ['[data-tutorial="center-item-controls"]'],
        block: ['[data-tutorial="center-item-controls"] button[title*="Cancel"]', '[data-tutorial="center-item-controls"] button[title*="Delete"]'],
        done: { touch: '[data-tutorial="center-item-controls"]', keys: 'qweasd' },
        doneText: 'Good. Next, drop it on the cake.',
        setup: { tab: 'center', tool: 'strawberry' },
    },
    {
        id: 'center-place', group: 8, kind: 'try', title: 'Place it',
        text: 'Click anywhere on top of the cake to drop the strawberry.',
        target: CANVAS, allow: [CANVAS_EL],
        done: { event: 'place' }, doneText: 'Placed.',
        setup: { tab: 'center', tool: 'strawberry' }, lockCamera: true, pointer: 'cake',
    },
    {
        id: 'center-select', group: 8, kind: 'try', title: 'Select an item',
        text: 'Click the strawberry on the cake to select it. Selected items can be re-tilted or deleted. Right-click empty space to deselect.',
        target: CANVAS, allow: [CANVAS, 'canvas', '[data-tutorial="center-item-controls"]'],
        block: ['[data-tutorial="center-item-controls"] button[title*="Delete"]'],
        done: { when: ({ selectedCenterItemId }) => Boolean(selectedCenterItemId) },
        doneText: 'Selected.',
        setup: { tab: 'center', tool: null }, lockCamera: true,
    },
    {
        id: 'center-text', group: 8, kind: 'try', title: 'Text',
        text: 'Open the Text tab to spell a message in letters.',
        target: '[data-tutorial="center-tab-text"]', allow: ['[data-tutorial="center-tab-text"]'],
        done: { when: ({ config }) => config.center?.mode === 'text' },
        setup: { tab: 'center', tool: null, keepSelection: true, patch: (c) => ({ ...c, center: { ...(c.center || {}), mode: 'decorations' } }) },
    },
    {
        id: 'center-variations', group: 8, kind: 'try', title: 'Variations',
        text: 'Variations are ready-made decoration sets. Open that tab.',
        target: '[data-tutorial="center-tab-variations"]', allow: ['[data-tutorial="center-tab-variations"]'],
        done: { when: ({ config }) => config.center?.mode === 'variations' },
        setup: { tab: 'center', tool: null, keepSelection: true, patch: (c) => ({ ...c, center: { ...(c.center || {}), mode: 'text' } }) },
    },

    // ── 9 · Interior Preview ──────────────────────────────────────
    {
        id: 'interior-preview-toggle', group: 9, kind: 'try', title: 'Interior Preview',
        text: "Now that your cake is customized, let's see what's inside. Click the Eye icon in the panel header to turn on Interior Preview.",
        target: '[data-tutorial="interior-preview"]', allow: ['[data-tutorial="interior-preview"]'],
        done: { when: ({ config }) => Boolean(config.interiorPreview) },
        doneText: '3D cutaway active! Look inside the cake.',
        setup: { tab: 'fundamentals', expand: 'none', tool: null },
    },
    {
        id: 'interior-preview-explain', group: 9, kind: 'info', title: 'How & Why It Works',
        text: "Interior Preview cuts a real-time 3D geometric cross-section into your cake. It works this way because a custom cake is more than just frosting — both you and the baker need to inspect internal sponge crumb, filling flavor, and layer thickness to verify structure and taste pairings before baking. Rotate the cake to view the cross-section.",
        target: CANVAS,
        setup: { tab: 'fundamentals', expand: 'none', tool: null, patch: (c) => ({ ...c, interiorPreview: true }) },
    },
    {
        id: 'interior-preview-close', group: 9, kind: 'try', title: 'Close Preview',
        text: 'Click the Eye icon again to close the cutaway and return to the complete cake exterior.',
        target: '[data-tutorial="interior-preview"]', allow: ['[data-tutorial="interior-preview"]'],
        done: { when: ({ config }) => !config.interiorPreview },
        doneText: 'Closed! Your complete custom cake is back in view.',
        setup: { tab: 'fundamentals', expand: 'none', tool: null, patch: (c) => ({ ...c, interiorPreview: true }) },
    },

    // ── 10 · Reset Cake ───────────────────────────────────────────
    {
        id: 'reset-cake-open', group: 10, kind: 'try', title: 'Reset Cake',
        text: 'Made a mistake or want to start fresh? Click the Reset icon (circular arrow next to the Eye) to open the reset options.',
        target: '[data-tutorial="reset-cake"]', allow: ['[data-tutorial="reset-cake"]'],
        done: { click: '[data-tutorial="reset-cake"]' },
        doneText: 'Reset options opened.',
        setup: { tab: 'fundamentals', expand: 'none', tool: null },
    },
    {
        id: 'reset-cake-explain', group: 10, kind: 'info', title: 'How & Why Reset Works',
        text: 'Reset gives you a safe escape hatch. When starting from a bakery template, you can choose "Reset to Template" (reverts only your edits while preserving the template base) or "Blank Reset" (cleans the canvas to a default cake). It works this way to protect your intricate 3D design work from accidental loss while letting you experiment freely.',
        target: '[data-tutorial="reset-dialog"]', fallback: TOOL,
    },
    {
        id: 'reset-cake-dismiss', group: 10, kind: 'try', title: 'Dismissing Reset',
        text: 'Click Cancel to close the reset dialog and preserve your design.',
        target: '[data-tutorial="reset-cancel"]', allow: ['[data-tutorial="reset-cancel"]', 'button'],
        done: { click: '[data-tutorial="reset-cancel"]' },
        doneText: 'Cancelled. Your design is preserved.',
    },

    // ── 11 · Send ─────────────────────────────────────────────────
    {
        id: 'send-bakery', group: 11, kind: 'info', title: 'Send Bakery',
        text: 'When your cake is ready, Send Bakery opens a simulated payment and emails you a confirmation. Nothing is actually sent in this tutorial.',
        target: '[data-tutorial="send-bakery"]', setup: { tool: null },
    },
    {
        id: 'chat-bakery', group: 11, kind: 'info', title: 'Bakery Chat',
        text: 'After sending, you land in Bakery Chat to talk with your baker. Finishing now resets the designer: your tutorial cake disappears and your own design returns.',
        target: null,
    },
];