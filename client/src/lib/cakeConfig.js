// Bakery-style cake configuration structure
// This reorganizes the cake from a "coloring" model to a "physical components" model
// Following the fixed rendering pipeline architecture
//
// NAV STRUCTURE (see CAKE_SETS_REWORK_SPEC.md for full rationale):
//   Fundamentals (structure, sponge, filling, exteriorFinish, sugarColor,
//                 surfaceTreatment)
//   Center   — top surface: Decorations OR Text (mutually exclusive)
//   Edge     — top/bottom edge trim: Top+Bottom-separate OR Both (mutually exclusive)
//   Side     — vertical wall treatments: exactly one of Checkered Pattern,
//              Triangle Pattern, Scatter Pearls, Sunshine Play, Whipped
//              Skirt, or Drip is active at a time (`mode`), plus
//              independent Piping
//   Place    — empty bucket for now, future manual-placement experiments
//
// The standalone "Surface" tab has been removed — it never behaved like a
// region the way Center/Edge/Side do (a person doesn't go "add something to
// the Surface," they're answering "what does the whole coating look like,"
// which is a continuation of Fundamentals' Exterior Finish question). Its
// color content (Match Flavor / Pick Color) lives under Fundamentals as
// `sugarColor`. Glaze and Textured Buttercream started out folded into
// `sugarColor.mode` alongside those two, and briefly had their own
// `surfaceTreatment` field/section once Textured Buttercream got real
// geometry — but Textured Buttercream turned out to answer "what base coat
// is on the cake," the same question `exteriorFinish.style` (Naked/Fully
// Frosted) already answers, not "what technique finishes it off," so it
// moved there as a third style option instead (see that field's comment
// in DEFAULT_CONFIG). `surfaceTreatment` still exists for Glaze, which
// genuinely is the latter — an overlay that can combine with any of the
// three Exterior Finish styles rather than being an alternative to them.
// Checkered Pattern and the old "No Name" (Whipped Skirt/Drip)
// never actually lived in the Surface UI — they've always been Side, and
// stay there, now each its own field under `side.mode` instead of nested
// "sets" lists.
//
// Deprecated and removed by this rework: exteriorOverlay, borders,
// sideDecorations, topDecorations, cakeTopper, collection, manualPlacement
// (old click-and-drop tool). See spec §10 for the full migration mapping.

import { FLAVORS } from './cakeFlavors';

export const DEFAULT_CONFIG = {
  // 1. Cake Structure
  structure: {
    cakeFormat: 'standard', // 'standard' | 'bento' | 'petitsFour'
    format: 'standard',
    size: '8x8', // Includes Standard, Bento, square Bento, and Petit Four size ids.
    layers: 1, // 1 or 2
    shape: 'round', // 'round' | 'rectangle' | 'square'
    layerDesign: 'uniform', // 'uniform' | 'individual'
  },
  realSize: {
    diameter: 8,
    height: 6
  },

  // 2. Interior
  sponge: {
    flavor: 'vanilla', // Default required
    layerFlavors: ['vanilla', 'vanilla'],
  },

  filling: {
    enabled: false, // Optional - begins disabled
    layers: 1, // 1, 2, or 3
    flavor: 'vanilla',
    layerFlavors: ['vanilla', 'vanilla'],
    layerEnabled: [false, false],
    layerLayers: [1, 1],
    layerPipings: [
      { tip: null, colorId: 'vanilla' },
      { tip: null, colorId: 'vanilla' },
    ],
    // Piping is separate from the filling's own eating flavor above — this
    // is a decorative border piped onto the exposed filling edge.
    // Only visible on Naked cakes / with Interior Preview on (Full Frosting
    // covers it), but the choice is preserved, never deleted, when hidden.
    piping: {
      tip: null,          // one of PIPING_TIPS ids below, or null for none
      colorId: 'vanilla', // references SUGAR_COLORS below, NOT a flavor —
                          // color is purely decorative here, doesn't affect taste
    },
  },

  // 3. Exterior — base coating (is there frosting, and what technique was
  // it applied with) plus eating flavor. `flavor` here is TASTE ONLY and
  // stays limited to the six real cake flavors — anything purely visual (a
  // color or a Glaze) belongs in `sugarColor`/`surfaceTreatment` below,
  // never here.
  //
  // `style` is exclusive: 'naked' | 'fullyFrosted' | 'texturedButtercream'.
  // Textured Buttercream lives here, not in `surfaceTreatment`, because
  // it's a different way of applying the SAME base coat Fully Frosted
  // applies — CakeScene.jsx already only ever builds its geometry inside
  // the same "is there frosting at all" gate Fully Frosted uses
  // (frostColor && style !== 'naked'), so this just makes the UI match
  // what the renderer already treats as true. Glaze stays in
  // `surfaceTreatment` instead, since — unlike Textured Buttercream — it's
  // not an alternate base coat, it's a layer that can go over any of the
  // three styles here (Naked+Glaze, Fully Frosted+Glaze, Textured
  // Buttercream+Glaze are all valid combinations).
  //
  // `buttercreamTexture` only matters when style === 'texturedButtercream'
  // — see BUTTERCREAM_TEXTURES below for the three variants. Mirrors
  // `layerStyles`/`layerFlavors`' "prepared for per-layer individual
  // design, not yet rendered per-tier" status below — CakeScene, like
  // `style` itself, only ever reads the single flat `buttercreamTexture`
  // value today, never per-layer.
  exteriorFinish: {
    style: 'naked',
    flavor: 'vanilla', // 'vanilla' | 'chocolate' | 'strawberry' | 'cheese' | 'ube' | 'mocha' — taste only
    buttercreamTexture: 'ridged', // one of BUTTERCREAM_TEXTURES ids — only relevant when style === 'texturedButtercream'
    customization: {
      size: 'medium',
    },
    layerStyles: ['naked', 'naked'],
    layerFlavors: ['vanilla', 'vanilla'],
    layerButtercreamTextures: ['ridged', 'ridged'],
  },

  // 4. Sugar Color — "what does the coating look like," independent of
  // `exteriorFinish.style` ("is there a coating at all") and `.flavor`
  // ("what does it taste like"). `mode` is exclusive (see Center/Edge below
  // for the same pattern):
  //   'default'       — no override, uses the flavor's natural color
  //                      (shown in the UI as a read-only swatch pulled
  //                      from Fundamentals' Exterior Finish flavor, so a
  //                      person can see what color they're getting even
  //                      though there's nothing to pick here)
  //   'colorOverride' — flat color from SUGAR_COLORS, via `colorId`
  // Glaze and Textured Buttercream used to be two more modes here, but
  // they're a coating TECHNIQUE, not a color — see `surfaceTreatment`
  // below, which now owns them.
  sugarColor: {
    mode: 'default',
    colorId: null,
  },
  // Each contextual Sugar Color picker owns its own selection so changing
  // one decorated region does not recolor the rest of the cake.
  sugarColorOverrides: {},

  // 4b. Surface Treatment — Glaze. Sits apart from both Sugar Color (a
  // color choice) and Exterior Finish's `style` (the base coat itself),
  // because it's neither — it's an optional layer that can go over any of
  // the three Exterior Finish styles (see the comment on `exteriorFinish`
  // above). `mode` kept as an exclusive-choice shape, same as
  // `sugarColor.mode`/`center.mode`/etc, even though Glaze is the only
  // entry today — this "genre" of combinable overlay treatments is
  // expected to grow, and re-flattening to a plain boolean now would just
  // mean undoing it later.
  //   null      — no treatment
  //   'glaze'   — poured glaze, uses `colorId` and `pattern`
  surfaceTreatment: {
    mode: null,
    colorId: null,
    pattern: 'longGaps', // one of GLAZE_PATTERNS ids — only relevant when mode === 'glaze'
    layerTreatments: [
      { mode: null, pattern: 'longGaps' },
      { mode: null, pattern: 'longGaps' },
    ],
  },

  // 5. Center — top surface. Decorations, Text, and Variations are
  // separate tabs. `mode` tracks which tab is currently active.
  center: {
    mode: 'decorations', // 'decorations' | 'text' | 'variations' | null -- starts on Decorations
    decorations: { colorId: 'vanilla' },
    text: { top: '', middle: '', bottom: '', font: 'script' },
    variations: {},
  },

  // 6. Edge — top edge / bottom edge trim. Top+Bottom-separate and Both are
  // mutually EXCLUSIVE (genuine delete — see spec §4b): picking a Set in
  // Both clears Top/Bottom individually, and vice versa. `mode` tracks
  // which is currently active; the other's stored values are cleared, not
  // just hidden.
  edge: {
    mode: 'topBottomSeparate', // 'topBottomSeparate' | 'both' — changed to 'topBottomSeparate' for 1-tier independent Top/Bottom
    activeSlot: 'top', // 'top' | 'bottom' | 'both' | null — single source of truth for which edge slot is currently active
    topEnabled: false, // For 1-tier cakes, allows independent Top/Bottom configuration — starts disabled
    bottomEnabled: false, // For 1-tier cakes, allows independent Top/Bottom configuration — starts disabled
    top:    { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red', secondaryColorMode: 'colorOverride' } },
    bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red', secondaryColorMode: 'colorOverride' } },
    both:   { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red', secondaryColorMode: 'colorOverride' } },
    // Layer 1 shelf ring — only active on 2-layer cakes
    middle: { piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red' } },
  },

  // 7. Side — vertical walls. Exactly one of the seven treatments below is
  // active at a time (`mode`, same exclusive-choice pattern as `center.mode`
  // and `edge.mode`). Each treatment keeps its own dedicated field so
  // switching between them never loses a person's settings — picking
  // Victorian Lambeth after Piping Scrolls was active doesn't erase the
  // Piping Scrolls color, it's just not the active one anymore.
  // Fondant Swag, Stripes, and Tuxedo were retired and replaced by Sunshine
  // Play (see SUNSHINE_PLAY_SETS) — a single accent piece stuck to the side
  // rather than a treatment that wraps the whole wall.
  side: {
    mode: null, // 'checkeredPattern' | 'trianglePattern' | 'scatterPearls' | 'whippedSkirt' | 'drip' | null
    checkeredPattern: { setId: null, colorId: 'vanilla' }, // setId from CHECKERED_PATTERN_SETS (4 variants)
    trianglePattern: { setId: null, colorId: 'vanilla' }, // setId from TRIANGLE_PATTERN_SETS — duplicate of checkeredPattern's shape, triangles instead of boxes
    scatterPearls: { setId: 'randomScatter', colorId: 'vanilla' },
    whippedSkirt: { colorId: 'vanilla' },
    drip: { colorId: 'vanilla' },
    pipingScrolls: { setId: 'waveRope', colorId: 'vanilla' },
    sunshinePlay: { setId: 'rainbowArc', colorId: 'vanilla', flavorId: 'vanilla' }, // setId from SUNSHINE_PLAY_SETS, flavorId for rainbow arc customization
    victorianLambeth: { setId: 'classic', colorId: 'vanilla' }, // setId from VICTORIAN_LAMBETH_SETS (4 variants)
    chevronPattern: { setId: 'singleColor', colorId: 'vanilla' },
  },

  // 8. Place — empty bucket for now. Old manualPlacement click-and-drop
  // tool is NOT carried forward as-is; this is a fresh start for future
  // "see where you're placing it" experiments.
  place: {
    items: [],
  },

  // Interior Preview Mode — real geometric clipping cutaway, see CakeScene.jsx
  interiorPreview: false,

  // Legacy support (for backward compatibility with existing saved designs)
  toppings: [],
  plateVisible: true,
  placedItems: [],
  designMode: 'uniform',
  layerColors: [],
  layerFrostings: [],
  layerFillings: [],
  activeSet: null,
  activeSetLayers: [],
};

// Finish styles
export const FINISH_STYLES = [
  { id: 'naked', label: 'Naked', description: 'No exterior frosting' },
  { id: 'fullyFrosted', label: 'Frosted', description: 'Entire cake covered' },
  { id: 'texturedButtercream', label: 'Textured', description: 'Ridged, hand-applied coat' },
];

// ─── Buttercream Texture variants — only meaningful when
// exteriorFinish.style === 'texturedButtercream'; picked before Frosting
// Flavor in ExteriorFinishSection, since it changes which geometry gets
// built (see CakeScene.jsx's buildTexturedButtercreamGeometry /
// buildRibbonWrapButtercreamGeometry / buildVerticalPipingButtercreamGeometry),
// not just its color. Exclusive choice, same pattern as FINISH_STYLES
// itself.
export const BUTTERCREAM_TEXTURES = [
  { id: 'ridged', label: 'Ridged Comb', description: 'Horizontal spatula-dragged ridges' },
  { id: 'ribbonWrap', label: 'Ribbon Wrap', description: 'Stacked horizontal ribbon bands' },
];

// Size options
export const STANDARD_SIZE_OPTIONS = [
  { id: '6x6', label: '6×6', dimensions: { diameter: 6, height: 6 } },
  { id: '8x8', label: '8×8', dimensions: { diameter: 8, height: 8 } },
  { id: '10x10', label: '10×10', dimensions: { diameter: 10, height: 10 } },
  { id: '12x12', label: '12×12', dimensions: { diameter: 12, height: 12 } },
];

// Bento size options (single tier only)
export const BENTO_SIZE_OPTIONS = [
  { id: 'miniBento', label: '3.5x2', dimensions: { diameter: 3.5, height: 2 } },
  { id: 'standardBento', label: '4x2', dimensions: { diameter: 4, height: 2 } },
  { id: 'largeBento', label: '5x3', dimensions: { diameter: 5, height: 3 } },
];

// Bento Square size options (single tier only)
export const BENTO_SQUARE_SIZE_OPTIONS = [
  { id: 'squareBento2x2', label: '2x2', dimensions: { diameter: 2, height: 2 } },
  { id: 'squareBento3x3', label: '3x3', dimensions: { diameter: 3, height: 3 } },
];

// Petits Four size options (single tier 4-pack)
export const PETITS_FOUR_SIZE_OPTIONS = [
  { id: 'classicCube', label: '1x1', dimensions: { diameter: 1, height: 1, width: 1, length: 1 } },
  { id: 'largeCube', label: '2x2', dimensions: { diameter: 2, height: 2, width: 2, length: 2 } },
];

export const SIZE_OPTIONS = [
  ...STANDARD_SIZE_OPTIONS,
  ...BENTO_SIZE_OPTIONS,
  ...BENTO_SQUARE_SIZE_OPTIONS,
  ...PETITS_FOUR_SIZE_OPTIONS,
];

// Cake Format / Cake Type options (top-level structure selection)
export const CAKE_FORMAT_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'bento', label: 'Bento' },
  { id: 'petitsFour', label: 'Petit Fours' },
];

export const CAKE_TYPE_OPTIONS = CAKE_FORMAT_OPTIONS;

// Layer options
export const LAYER_OPTIONS = [
  { id: 1, label: '1 Tier' },
  { id: 2, label: '2 Tiers' },
];

// Shape options
export const SHAPE_OPTIONS = [
  { id: 'round', label: 'Round' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'square', label: 'Square' },
];

const PETITS_FOUR_SIZE_IDS = PETITS_FOUR_SIZE_OPTIONS.map((option) => option.id);
const BENTO_SIZE_IDS = [...BENTO_SIZE_OPTIONS.map((option) => option.id), ...BENTO_SQUARE_SIZE_OPTIONS.map((option) => option.id)];

export function getCakeFormat(structure = {}) {
  const explicit = structure.cakeFormat || structure.format;
  if (explicit === 'standard' || explicit === 'bento' || explicit === 'petitsFour') {
    return explicit;
  }
  if (structure.shape === 'petitsFour' || PETITS_FOUR_SIZE_IDS.includes(structure.size)) {
    return 'petitsFour';
  }
  if (structure.shape === 'bento' || BENTO_SIZE_IDS.includes(structure.size)) {
    return 'bento';
  }
  return 'standard';
}

export function isPetitsFourStructure(structure) {
  return getCakeFormat(structure) === 'petitsFour';
}

export function isBentoStructure(structure) {
  return getCakeFormat(structure) === 'bento';
}

export function resolveStructureShape(structure = {}) {
  if (structure.shape === 'rectangle' || structure.shape === 'petitsFour') return 'rectangle';
  if (structure.shape === 'square') return 'square';
  return 'round';
}

// Filling layer options
export const FILLING_LAYER_OPTIONS = [
  { id: 1, label: '1' },
  { id: 2, label: '2' },
  { id: 3, label: '3' },
];

// Piping tips — used everywhere "Piping" appears on Edge and Side. All 14
// are standalone, equally-weighted choices — Star/Shell/Rope happen to share
// underlying geometry math (see pipingTips.js) but are not nested or grouped
// in the data model or the UI. Filling no longer draws from this list — see
// FILLING_PIPING_DESIGNS below for why it got its own.
export const PIPING_TIPS = [
  { id: 'shell', label: 'Shell Border' },
  { id: 'reverseShell', label: 'Reverse Shell' },
  { id: 'bead', label: 'Bead Piping' },
  { id: 'zigzag', label: 'Zigzag Piping' },
  { id: 'wavePiping', label: 'Wave Piping' },
  { id: 'star', label: 'Star' },
  { id: 'rope', label: 'Rope' },
  { id: 'ropeTwist', label: 'Rope Twist' },
  { id: 'ropeTwistClassic', label: 'Rope Twist Classic' },
  { id: 'round', label: 'Round' },
  { id: 'petal', label: 'Petal' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'dropFlower', label: 'Drop Flower' },
  { id: 'lambeth', label: 'Lambeth Method' },
  { id: 'starDollop', label: 'Star Dollop' },
  { id: 'starDollopSparse', label: 'Sparse Star Dollop' },
  { id: 'starDollopContinuous', label: 'Continuous Star Dollop' },
  { id: 'starScallop', label: 'Star Scallop' },
  { id: 'starScallopSoft', label: 'Soft Star Scallop' },
  { id: 'starScallopDollops', label: 'Scallop with Dollops' },
  { id: 'starScallopLayered', label: 'Layered Star Scallop' },
];

// ─── Filling Piping Designs — Filling's own piping vocabulary, split out
// from the shared PIPING_TIPS list above. This isn't a cake-decorating
// nozzle tip applied around the cake's exterior (Edge/Side's use case) —
// it's how the exposed filling edge itself gets piped between two sponge
// layers, a different physical situation with its own look-and-feel. First
// entry, Mashed Circles, takes the Round tip's real-world idea (piped
// dollops = squeezed domes, see pipingTips.js's buildRoundUnitGeometry) and
// packs them tight enough that neighboring domes overlap and fuse into one
// continuous row instead of staying spaced-apart beads — the repeated,
// pressed-together circles look between naked-cake layers. Second entry,
// Mashed Swirls, is the exact same bump body as Mashed Circles (same
// geometry function, see buildMashedCircleFillingGeometry's `pattern`
// option in CakeScene.jsx) with a diagonal slash groove pattern etched
// repeatedly across each bump's surface — a textured piping-tip look
// layered on top of the same base shape, not a different body. A short
// list today, expected to keep growing the same way SURFACE_TREATMENT_MODES
// started as a single-item list. Still referenced through
// filling.piping.tip (same field name/shape SetPicker already wires up) —
// only the id namespace differs, and FILLING_PIPING_DESIGNS ids never
// overlap with PIPING_TIPS ids since the two lists are never shown
// together.
export const FILLING_PIPING_DESIGNS = [
  { id: 'mashedCircles', label: 'Mashed Circles', description: 'Piped rounds pressed edge-to-edge, mashed together between layers' },
  { id: 'mashedSwirls', label: 'Mashed Swirls', description: 'Mashed Circles with a diagonal slash pattern piped across each bump' },
];

// Size customization options
export const SIZE_OPTIONS_CUSTOM = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

// ─── Sugar Color palette (23) ──────────────────────────────────────────────
// Shared by every color-picking control in the app: Fundamentals' Sugar
// Color, Filling Piping, Center, Edge, and every Side treatment. Formerly
// two separate lists (DECORATIVE_COLORS + FROSTING_COLOR_PALETTE) — merged
// into one, since both were answering the same question ("what color,
// independent of taste") and there was no real reason a person picking a
// color for Piping should see a different palette than one picking a color
// for the Side wall. No id collisions between the two source lists.
//
// Every entry has a price now — even the ones that were historically free
// (flavor-mirror hues, plain accents) carry a nonzero price by design
// (pricing UI/total calculation lives in PricingPanel.jsx, which hasn't
// been shared, so these are wired as data only for now).
//
// Groups, in list order:
//   1. Flavor-mirror (6)  — same name as a real flavor, zero taste effect,
//      kept for visual familiarity (e.g. piping that "looks vanilla")
//   2. Plain accents (4)  — basic non-flavor accents
//   3. Designer palette (8) — richer tones, previously Frosting Color only
//   4. Pattern/multi-tone (6) — whole-surface patterns, not flat colors;
//      `implemented: false` means not rendered yet, not "can't be" — same
//      cake mesh, just no code reads these ids yet (see `swatchCss`/
//      `metallic` for how the picker itself still shows something distinct).
//      All six are also tagged `isPattern: true` (Red-White Gradient
//      included, despite being `implemented: true`) so SugarColorSection.jsx
//      can hide just this group for a context that only wants flat colors
//      — Surface Treatment's Glaze does this via `excludePatternColors`,
//      leaving it with the 12 flat colors from groups 2-3 only.
export const SUGAR_COLORS = [
  // Flavor-mirror — tagged isFlavorMirror so SugarColorSection.jsx can
  // exclude them from Pick Color's own palette (picking "Pick Color →
  // Vanilla" is redundant with what Match Flavor mode already gives
  // you from Exterior Finish's flavor) without duplicating this id list in
  // a second file. Everything else that reads SUGAR_COLORS — Match
  // Flavor's own preview swatch, SetPicker/Center/Place's decoration and
  // piping color grids, and every `colorId: 'vanilla'` default elsewhere
  // in this file — is unaffected and still sees these six normally.
  { id: 'vanilla', label: 'Vanilla', hex: FLAVORS.vanilla.colors.crumbBase, price: 0, implemented: true, isFlavorMirror: true },
  { id: 'chocolate', label: 'Chocolate', hex: FLAVORS.chocolate.colors.crumbBase, price: 0, implemented: true, isFlavorMirror: true },
  { id: 'strawberry', label: 'Strawberry', hex: FLAVORS.strawberry.colors.crumbBase, price: 0, implemented: true, isFlavorMirror: true },
  { id: 'cheese', label: 'Cheese', hex: FLAVORS.cheese.colors.crumbBase, price: 0, implemented: true, isFlavorMirror: true },
  { id: 'ube', label: 'Ube', hex: FLAVORS.ube.colors.crumbBase, price: 0, implemented: true, isFlavorMirror: true },
  { id: 'mocha', label: 'Mocha', hex: FLAVORS.mocha.colors.crumbBase, price: 0, implemented: true, isFlavorMirror: true },
  // Plain accents
  { id: 'red', label: 'Red', hex: '#D6293E', price: 0, implemented: true },
  { id: 'black', label: 'Black', hex: '#2B2B2B', price: 0, implemented: true },
  { id: 'pink', label: 'Pink', hex: '#F5A9C0', price: 0, implemented: true },
  { id: 'white', label: 'White', hex: '#FBFBF8', price: 0, implemented: true },
  // Designer palette (formerly FROSTING_COLOR_PALETTE)
  { id: 'ivory', label: 'Ivory', hex: '#F4EEE1', price: 50, implemented: true },
  { id: 'blush', label: 'Blush', hex: '#E8C4C4', price: 50, implemented: true },
  { id: 'sage', label: 'Sage', hex: '#A8B79A', price: 50, implemented: true },
  { id: 'navy', label: 'Navy', hex: '#2C3E5C', price: 60, implemented: true },
  { id: 'terracotta', label: 'Terracotta', hex: '#C1694F', price: 60, implemented: true },
  { id: 'lavenderGrey', label: 'Lavender Grey', hex: '#B8AFC0', price: 50, implemented: true },
  { id: 'charcoal', label: 'Charcoal', hex: '#3A3A3A', price: 60, implemented: true },
  { id: 'gold', label: 'Gold', hex: '#C9A24B', price: 80, implemented: true },
  // Pattern/multi-tone — not flat colors, implemented: false
  {
    id: 'marble', label: 'Marble', hex: '#D8D8D8', price: 100, implemented: false, isPattern: true,
    // One continuous black -> gray -> gray -> white sweep (180deg, matching
    // Ombré/Red-White Gradient's vertical convention), not the old
    // dark-light-dark-light repeat. That repeat looked marbled as a tiny
    // 2D swatch icon, but applyVerticalGradientUV/getFrostingMaterial map
    // these same stops straight onto the cake's actual height — a repeat
    // reappears there as a hard light->dark seam partway up the piece
    // instead of one smooth wash. Same "evenly-stepped, no reversal"
    // shape as redWhiteGradient below, with 35%-55% held at the same gray
    // to read as a deliberate marbled plateau rather than a flat ramp.
    swatchCss: 'linear-gradient(180deg, #1A1A1A 0%, #8C8C8C 35%, #8C8C8C 55%, #FBFBF8 85%, #FBFBF8 100%)',
  },
  {
    id: 'ombre', label: 'Ombré', hex: '#C7B7EA', price: 100, implemented: false, isPattern: true,
    swatchCss: 'linear-gradient(180deg, #F5A9C0 0%, #C7B7EA 50%, #A6D8EA 100%)',
  },
  {
    id: 'rainbowSwirl', label: 'Rainbow Swirl', hex: '#E8A9D8', price: 100, implemented: false, isPattern: true,
    swatchCss: 'conic-gradient(from 0deg, #E24B4A, #EF9F27, #97C459, #378ADD, #7F77DD, #E24B4A)',
  },
  {
    id: 'goldShimmer', label: 'Gold Shimmer', hex: '#D4AF37', price: 100, implemented: false, isPattern: true,
    metallic: true, // needs metalness/roughness tuning, not just a flat/gradient color
  },
  {
    id: 'watercolorPastel', label: 'Watercolor Pastel Mix', hex: '#EAD9EA', price: 100, implemented: false, isPattern: true,
    swatchCss: 'linear-gradient(120deg, #F5A9C0 0%, #A6D8EA 35%, #FAEEDA 70%, #C7EAD8 100%)',
  },
  {
    id: 'redWhiteGradient', label: 'Red-White Gradient', hex: '#FF8080', price: 100, implemented: true, isPattern: true,
    swatchCss: 'linear-gradient(180deg, #FAFAFA 0%, #E2D2D4 20%, #D4A1A7 40%, #CD6974 60%, #C92E40 80%, #A01828 100%)', // evenly-stepped luminance (~L28-42 per 20%) so the wash reads as one continuous fade instead of a white->pink jump, a flat plateau, then pink->red jump
  },
];

// ─── Sugar Color modes — Fundamentals' "what does the coating look like" ──
// Exclusive choice (see sugarColor.mode in DEFAULT_CONFIG). Both modes are
// rendered: 'default' shows a read-only swatch of the Exterior Finish
// flavor's natural color (nothing to pick, just a preview), 'colorOverride'
// shows the full editable palette. Glaze and Textured Buttercream used to
// be two more entries in this list — see SURFACE_TREATMENT_MODES below for
// where they live now.
export const SUGAR_COLOR_MODES = [
  // Labels only — ids stay 'default'/'colorOverride' so nothing
  // downstream (SugarColorSection's mode checks, configAdapter.js's
  // resolveSugarColorHex, etc.) needs to change. "Match Flavor" is the
  // derived-from-taste mode (Vanilla flavor -> vanilla-colored coating);
  // "Pick Color" is the free, taste-independent color choice.
  { id: 'default', label: 'Match Flavor', implemented: true },
  { id: 'colorOverride', label: 'Pick Color', implemented: true },
];

// ─── Surface Treatment modes — combinable overlay layers, independent of
// both Sugar Color (a color choice) and Exterior Finish's `style` (the
// base coat itself). Textured Buttercream used to live here too, but it
// turned out to be an alternate base coat, not an overlay — it moved to
// FINISH_STYLES/exteriorFinish.style instead (see that field's comment in
// DEFAULT_CONFIG). Kept as a list (not a single flag) since more
// combinable overlays are expected to join Glaze eventually.
export const SURFACE_TREATMENT_MODES = [
  { id: 'glaze', label: 'Drip', implemented: true },
];

// ─── Glaze Patterns — variants of the poured-and-dripping silhouette
// (surfaceTreatment.pattern, only relevant when mode === 'glaze'), the
// same "pick a variant" shape BUTTERCREAM_TEXTURES already uses for
// Textured Buttercream. All six share the same underlying mechanism (see
// CakeScene.jsx's buildGlazeGeometry/`carve` option) — they just tune how
// far the coating reaches down and how much that reach varies around the
// circumference:
//
//   longGaps     — long dripping fingers with clear gaps of exposed
//                  frosting between them (deep peaks, very shallow valleys).
//   longShortAlt — the same long fingers, alternating with noticeably
//                  shorter ones instead of a bare gap between every pair.
//   shortDrips   — a uniform ring of short, shallow drips — same "fingers
//                  with valleys" shape as the two above, just far less
//                  pronounced.
//   longWave     — coverage reaches nearly to the base all the way around,
//                  with only a gentle small ripple decorating the edge
//                  instead of individual fingers.
//   midWave      — the same gentle ripple edge, at roughly half coverage.
//   shortWave    — the same gentle ripple edge, retreating to a shallow
//                  coat near the top.
export const GLAZE_PATTERNS = [
  { id: 'longGaps', label: 'Long Drips', description: 'Tall dripping fingers with clear gaps between them', implemented: true },
  { id: 'longShortAlt', label: 'Long & Short Drips', description: 'Tall fingers alternating with shorter ones', implemented: true },
  { id: 'shortDrips', label: 'Short Drips', description: 'A uniform ring of short, shallow drips', implemented: true },
  { id: 'longWave', label: 'Full Coverage', description: 'Reaches almost to the base, with a soft rippled edge', implemented: true },
  { id: 'midWave', label: 'Mid Coverage', description: 'Reaches about halfway down, with a soft rippled edge', implemented: true },
  { id: 'shortWave', label: 'Short Coverage', description: 'A shallow coat near the top, with a soft rippled edge', implemented: true },
];

// ─── Petit Fours Glaze Patterns — Drips & Coverage with uneven distribution ──
// These patterns copy the format of Drips and Coverage designs from Standard,
// combined into an organic uneven distribution tailored for mini-cake cubes,
// featuring the signature poured ganache "Tear Fall" design.
export const PETIT_FOURS_GLAZE_PATTERNS = [
  { id: 'unevenCombo', label: 'Tear Fall', description: 'Organic ganache coverage with flowing, varied teardrop drips', implemented: true, petitsFoursOnly: true },
  { id: 'longGaps', label: 'Natural Tear', description: 'Long, hand-poured drips with an uneven, natural flow', implemented: true, petitsFoursOnly: true },
  { id: 'tinyTip', label: 'Wave Curve', description: 'A smooth glaze cap with a softly undulating edge', implemented: true, petitsFoursOnly: true },
  { id: 'longWave', label: 'Full Coverage', description: 'Reaches almost to the base, with soft rippled edge', implemented: true, petitsFoursOnly: true },
  { id: 'midWave', label: 'Mid Coverage', description: 'Reaches about halfway down, with soft rippled edge', implemented: true, petitsFoursOnly: true },
  { id: 'shortWave', label: 'Short Coverage', description: 'A shallow coat near the top, with soft rippled edge', implemented: true, petitsFoursOnly: true },
];

export function getSurfaceTreatmentPattern(treatment = {}, structure = {}) {
  const patternSet = isPetitsFourStructure(structure) ? 'petitsFour' : 'standard';
  const availablePatterns = patternSet === 'petitsFour' ? PETIT_FOURS_GLAZE_PATTERNS : GLAZE_PATTERNS;
  const availableIds = new Set(availablePatterns.map(({ id }) => id));
  const formatPattern = treatment.patternsByFormat?.[patternSet];
  if (availableIds.has(formatPattern)) return formatPattern;
  if (availableIds.has(treatment.pattern)) return treatment.pattern;
  return patternSet === 'petitsFour' ? 'longGaps' : 'longGaps';
}


// ─── Checkered Pattern — numbered coverage variants, classic black+white ──
// One of Side's seven treatments (side.mode === 'checkeredPattern'). Now
// tintable via SUGAR_COLORS like every other Side treatment — this used to
// be flagged as a deliberate, unconfirmed black+white-only choice; resolved
// by the Side merge into one consistent set of tintable treatments.
//
// The first four (Full/Left Diagonal/X/Right Diagonal) all start from the
// same checkerboard and thin its diagonals. parallelOuter/parallelInner
// are a different family — not checkerboard-derived at all, just two full
// horizontal bands (every column filled, no alternation) at specific row
// positions counted from the top and bottom:
//   parallelOuter — 1st row from the top, 4th row from the bottom
//   parallelInner — 2nd row from the top, 3rd row from the bottom
// See buildCheckerSideSquares in DecorationSets.jsx for the row selection.
export const CHECKERED_PATTERN_SETS = [
  { id: 'wholeCake', label: 'Full Pattern', price: 150 },
  { id: 'sidesOnly', label: 'Left Diagonal', price: 100 },
  { id: 'xPattern', label: 'X Pattern', price: 110 },
  { id: 'rightDiagonal', label: 'Right Diagonal', price: 100 },
  { id: 'parallelOuter', label: 'Parallel Lines — Outer', price: 100, bentoLabel: 'Bottom Pattern' },
  { id: 'parallelInner', label: 'Parallel Lines — Inner', price: 100, bentoLabel: 'Top Pattern' },
];

// ─── Triangle Pattern — numbered coverage variants, duplicate of Checkered
// Pattern's exact architecture (same 6 variants, same shape, same
// tintable-via-SUGAR_COLORS treatment) but rendered as triangles instead
// of boxes. One of Side's seven treatments (side.mode === 'trianglePattern').
// See buildTriangleSideShapes in DecorationSets.jsx for the geometry —
// itself a duplicate of buildCheckerSideSquares with a triangle unit shape
// in place of a box.
export const TRIANGLE_PATTERN_SETS = [
  { id: 'wholeCake', label: 'Full Pattern', price: 150 },
  { id: 'sidesOnly', label: 'Left Diagonal', price: 100 },
  { id: 'xPattern', label: 'X Pattern', price: 110 },
  { id: 'rightDiagonal', label: 'Right Diagonal', price: 100 },
  { id: 'parallelOuter', label: 'Parallel Lines — Outer', price: 100, bentoLabel: 'Bottom Pattern' },
  { id: 'parallelInner', label: 'Parallel Lines — Inner', price: 100, bentoLabel: 'Top Pattern' },
];

// Click-and-drop palette for the Center tab: each entry is one physically
// placeable item. Most designs only sit one way; Oreo has two (Standing,
// Lying Flat), so it contributes two separate palette entries rather than
// one design with a pose picker -- every entry here is a single click-to-arm
// button, full stop. toolId is what gets armed via onSelectTool and is the
// exact 'center-{designId}-{orientation}' format CakeScene.jsx's placedItems
// loop parses back apart when rendering (see buildAndAddDecoration call
// there) -- designId itself must never contain '-'.
export const CENTER_ITEM_LIMITS = {
  strawberry: 10,
  cherry: 10,
  blueberry: 10,
  mangoCube: 12,
  mango: 12,
  ferreroRocher: 8,
  oreo: 8,
  hersheysKisses: 9,
  basketball: 8,
  soccerball: 8,
  chocolateBear: 4,
  buttercreamText: 50,
  fondantText: 50,
};

export function isLetterDesignId(designId) {
  if (!designId || typeof designId !== 'string') return false;
  return designId.startsWith('letterUpper')
    || designId.startsWith('letterLower')
    || designId.startsWith('letter')
    || designId === 'buttercreamText'
    || designId === 'fondantText';
}

export function getCenterItemLimit(designId, structureOrFormat) {
  if (!designId) return null;
  if (isLetterDesignId(designId)) return 50;
  const isPetitsFour = typeof structureOrFormat === 'string'
    ? structureOrFormat === 'petitsFour'
    : isPetitsFourStructure(structureOrFormat || {});
  if (isPetitsFour) {
    if (designId === 'strawberry' || designId === 'blueberry' || designId === 'mangoCube' || designId === 'mango') {
      return 4;
    }
    return 4;
  }
  const isBento = typeof structureOrFormat === 'string'
    ? structureOrFormat === 'bento'
    : isBentoStructure(structureOrFormat || {});
  if (isBento) {
    if (designId === 'strawberry' || designId === 'blueberry' || designId === 'mangoCube' || designId === 'mango') {
      return 4;
    }
  }
  return CENTER_ITEM_LIMITS[designId] ?? null;
}

export function getCenterItemCount(placedItems = [], designId) {
  if (!designId || !Array.isArray(placedItems)) return 0;
  if (isLetterDesignId(designId)) {
    return placedItems.filter((item) => {
      if (!item?.type || typeof item.type !== 'string') return false;
      return item.type.startsWith('center-letter') || item.type.startsWith('letter');
    }).length;
  }
  return placedItems.filter((item) => {
    if (!item?.type || typeof item.type !== 'string') return false;
    if (item.type.startsWith('center-')) {
      const parts = item.type.split('-');
      return parts[1] === designId;
    }
    return item.type === designId;
  }).length;
}

export function isCenterItemAtLimit(placedItems = [], designId, structureOrFormat) {
  const limit = getCenterItemLimit(designId, structureOrFormat);
  if (limit === null) return false;
  return getCenterItemCount(placedItems, designId) >= limit;
}

// ── Smart Detector: Physical Collision Footprints for Center Items ─────
// Calibrated to the exact visual 3D mesh dimensions so that items only clash
// when their actual 3D geometries would collide. Oriented items (such as
// standing Oreos and letters) use an Oriented Bounding Box (OBB) rather than
// an oversized circle, acknowledging all available free distance.
export const CENTER_ITEM_RADII = {
  strawberry: 0.30,       // mesh diameter ~0.60
  cherry: 0.34,           // mesh diameter ~0.68
  blueberry: 0.25,        // mesh diameter ~0.50
  mangoCube: 0.24,        // mesh diameter ~0.48 bounding circle
  mango: 0.24,
  ferreroRocher: 0.62,    // mesh diameter ~1.24 across textured hazelnut sphere
  oreo: 0.875,            // mesh diameter 1.75in (radius 0.875, half-thickness 0.23)
  hersheysKisses: 0.40,   // mesh diameter ~0.80 base
  chocolateBear: 0.56,    // mesh diameter ~1.12 across seated body + paws
  basketball: 0.54,       // mesh diameter ~1.08 across ball + collar
  soccerball: 0.54,       // mesh diameter ~1.08 across ball + collar
  floralCluster: 0.50,
  fruitRing: 0.55,
};

/**
 * Returns the effective collision footprint radius for a Center design.
 * Delicately sized edible items stay at true 1:1 scale; scalable items scale with centerDecorScale.
 */
export function getCenterItemRadius(designId, centerDecorScale = 1) {
  if (!designId) return 0.5;
  const isFixedScale = [
    'strawberry',
    'cherry',
    'blueberry',
    'mangoCube',
    'mango',
    'ferreroRocher',
    'hersheysKisses',
    'basketball',
    'soccerball',
  ].includes(designId);

  let baseRadius = CENTER_ITEM_RADII[designId];
  if (baseRadius === undefined) {
    if (designId.startsWith('letterUpper')) {
      baseRadius = 0.28;
    } else if (designId.startsWith('letterLower')) {
      baseRadius = 0.20;
    } else {
      baseRadius = 0.50;
    }
  }

  const scale = isFixedScale ? 1.0 : (centerDecorScale ?? 1.0);
  return baseRadius * scale;
}

/**
 * Computes the 2D geometric footprint (circle or rotated OBB) for an item
 */
export function getItemFootprint(item, centerDecorScale = 1) {
  if (!item) return { x: 0, z: 0, type: 'circle', radius: 0.5 };
  const x = item.x || 0;
  const z = item.z || 0;
  const rotation = item.rotation || 0;
  const tiltX = item.tiltX || 0;
  const tiltZ = item.tiltZ || 0;
  const toolType = typeof item === 'object' && item.type ? item.type : (typeof item === 'string' ? item : '');

  let designId = item.designId;
  let orientation = item.orientation || 'default';

  if (toolType.startsWith('center-')) {
    const parts = toolType.split('-');
    designId = parts[1];
    orientation = parts[2] || item.orientation || 'default';
  }

  if (designId) {
    // Oreo: detects standing (OBB) vs lying flat (circle) based on orientation and tilt angles
    if (designId === 'oreo') {
      const scale = centerDecorScale ?? 1;
      const isFlat = orientation === 'flat' ||
        Math.abs(Math.sin(tiltX)) > 0.6 ||
        Math.abs(Math.sin(tiltZ)) > 0.6 ||
        (Math.abs(Math.cos(tiltX)) < 0.4 && Math.abs(Math.cos(tiltZ)) < 0.4);

      if (isFlat) {
        return {
          x,
          z,
          type: 'circle',
          radius: 0.875 * scale,
        };
      }
      return {
        x,
        z,
        type: 'obb',
        halfLength: 0.875 * scale,
        halfWidth: 0.23 * scale,
        angle: rotation,
      };
    }

    if (designId.startsWith('letterUpper')) {
      const scale = centerDecorScale ?? 1;
      return {
        x,
        z,
        type: 'obb',
        halfLength: 0.24 * scale,
        halfWidth: 0.12 * scale,
        angle: rotation,
      };
    }
    if (designId.startsWith('letterLower')) {
      const scale = centerDecorScale ?? 1;
      return {
        x,
        z,
        type: 'obb',
        halfLength: 0.18 * scale,
        halfWidth: 0.12 * scale,
        angle: rotation,
      };
    }

    const radius = getCenterItemRadius(designId, centerDecorScale);
    return {
      x,
      z,
      type: 'circle',
      radius,
    };
  }

  if (PLACE_ITEM_RADII[toolType]) {
    return {
      x,
      z,
      type: 'circle',
      radius: PLACE_ITEM_RADII[toolType] * 0.75,
    };
  }

  return {
    x,
    z,
    type: 'circle',
    radius: 0.5,
  };
}

/**
 * Accurately determines if two geometric footprints clash or overlap.
 * Supports Circle-Circle, Circle-OBB, and OBB-OBB (SAT).
 */
export function doFootprintsClash(fp1, fp2, gap = 0.02) {
  if (!fp1 || !fp2) return false;

  // Circle vs Circle
  if (fp1.type === 'circle' && fp2.type === 'circle') {
    const dx = fp1.x - fp2.x;
    const dz = fp1.z - fp2.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < fp1.radius + fp2.radius + gap;
  }

  // Circle vs OBB
  const checkCircleVsObb = (circle, obb) => {
    const dx = circle.x - obb.x;
    const dz = circle.z - obb.z;
    const cos = Math.cos(-obb.angle);
    const sin = Math.sin(-obb.angle);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    const clampedX = Math.max(-obb.halfLength, Math.min(obb.halfLength, localX));
    const clampedZ = Math.max(-obb.halfWidth, Math.min(obb.halfWidth, localZ));
    const distX = localX - clampedX;
    const distZ = localZ - clampedZ;
    const distSq = distX * distX + distZ * distZ;
    const threshold = circle.radius + gap;
    return distSq < threshold * threshold;
  };

  if (fp1.type === 'circle' && fp2.type === 'obb') {
    return checkCircleVsObb(fp1, fp2);
  }
  if (fp1.type === 'obb' && fp2.type === 'circle') {
    return checkCircleVsObb(fp2, fp1);
  }

  // OBB vs OBB (Separating Axis Theorem)
  if (fp1.type === 'obb' && fp2.type === 'obb') {
    const getCorners = (b, extraGap = 0) => {
      const hl = b.halfLength + extraGap;
      const hw = b.halfWidth + extraGap;
      const cos = Math.cos(b.angle);
      const sin = Math.sin(b.angle);
      return [
        { x: b.x + (-hl * cos - -hw * sin), z: b.z + (-hl * sin + -hw * cos) },
        { x: b.x + ( hl * cos - -hw * sin), z: b.z + ( hl * sin + -hw * cos) },
        { x: b.x + ( hl * cos -  hw * sin), z: b.z + ( hl * sin +  hw * cos) },
        { x: b.x + (-hl * cos -  hw * sin), z: b.z + (-hl * sin +  hw * cos) },
      ];
    };

    const corners1 = getCorners(fp1, gap / 2);
    const corners2 = getCorners(fp2, gap / 2);

    const axes = [
      { x: Math.cos(fp1.angle), z: Math.sin(fp1.angle) },
      { x: -Math.sin(fp1.angle), z: Math.cos(fp1.angle) },
      { x: Math.cos(fp2.angle), z: Math.sin(fp2.angle) },
      { x: -Math.sin(fp2.angle), z: Math.cos(fp2.angle) },
    ];

    for (const axis of axes) {
      let min1 = Infinity, max1 = -Infinity;
      for (const c of corners1) {
        const proj = c.x * axis.x + c.z * axis.z;
        if (proj < min1) min1 = proj;
        if (proj > max1) max1 = proj;
      }
      let min2 = Infinity, max2 = -Infinity;
      for (const c of corners2) {
        const proj = c.x * axis.x + c.z * axis.z;
        if (proj < min2) min2 = proj;
        if (proj > max2) max2 = proj;
      }
      if (max1 < min2 || max2 < min1) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Checks whether an item's footprint stays within the Center placement boundary
 * (fine line boundary at topRadius * 0.88), ensuring items can be placed across the full
 * available surface of the cake without spilling over the cake's physical top rim.
 */
export function isFootprintInBoundary(fp, boundaryR, cakeRadius) {
  if (!fp) return true;
  const dist = Math.sqrt(fp.x * fp.x + fp.z * fp.z);
  // Item drop center must stay within the Center placement boundary
  if (dist > boundaryR) return false;

  // Physical outer bounds must stay solidly on the cake top surface
  const maxRim = cakeRadius || (boundaryR > 0 ? boundaryR / 0.88 : 0);
  if (maxRim <= 0) return true;
  const outerLimit = maxRim * 0.98;

  if (fp.type === 'circle') {
    return dist + fp.radius * 0.70 <= outerLimit;
  }
  if (fp.type === 'obb') {
    const hl = fp.halfLength;
    const hw = fp.halfWidth;
    const cos = Math.cos(fp.angle);
    const sin = Math.sin(fp.angle);
    const corners = [
      { x: fp.x + (-hl * cos - -hw * sin), z: fp.z + (-hl * sin + -hw * cos) },
      { x: fp.x + ( hl * cos - -hw * sin), z: fp.z + ( hl * sin + -hw * cos) },
      { x: fp.x + ( hl * cos -  hw * sin), z: fp.z + ( hl * sin +  hw * cos) },
      { x: fp.x + (-hl * cos -  hw * sin), z: fp.z + (-hl * sin +  hw * cos) },
    ];
    return corners.every((c) => Math.sqrt(c.x * c.x + c.z * c.z) <= outerLimit);
  }
  return true;
}

/**
 * Checks whether two items on the top surface clash or overlay.
 * Uses exact physical footprints and reads true distance across orientations.
 */
export function doItemsClash(item1, item2, centerDecorScale = 1, minGap = 0.02) {
  if (!item1 || !item2) return false;
  const fp1 = item1.type && (item1.type === 'circle' || item1.type === 'obb')
    ? item1
    : getItemFootprint(item1, centerDecorScale);
  const fp2 = item2.type && (item2.type === 'circle' || item2.type === 'obb')
    ? item2
    : getItemFootprint(item2, centerDecorScale);
  return doFootprintsClash(fp1, fp2, minGap);
}

// Single constant fine-line boundary reserve for Center designs (local units).
// Reserves the outer margin of the cake top for Edge designs (at topRadius * 0.88),
// guaranteeing that Edge designs will never conflict while maximizing available space.
export const CENTER_BOUNDARY_RATIO = 0.88;
export const CENTER_BOUNDARY_RESERVE = 0.48;

export function getCenterPlacementBoundaryRadius(topRadius) {
  return Math.max(0, (topRadius || 0) * CENTER_BOUNDARY_RATIO);
}

/**
 * Computes obstacle footprints for Edge Ferrero Rocher truffles when the Edge tab
 * has Ferrero Rocher Rim selected on the top tier.
 * Because Ferrero Rocher is large (~1.24 units wide, radius 0.62), its physical size
 * actively defines forbidden placement areas for Center decorations and text.
 */
export const EDIBLE_DELICATES_RIM_SPECS = {
  ferreroRocherRim: {
    inset: 0.65,
    radius: CENTER_ITEM_RADII.ferreroRocher || 0.62,
    countFn: (ringRadius) => Math.max(6, Math.round((ringRadius * Math.PI * 2) / 2.8)),
    designId: 'ferreroRocher',
  },
  ferreroRocherRimSparse: {
    inset: 0.65,
    radius: CENTER_ITEM_RADII.ferreroRocher || 0.62,
    countFn: (ringRadius) => {
      const ferreros = Math.max(3, Math.round((ringRadius * Math.PI * 2) / 4.8)) + 1;
      return ferreros * 2;
    },
    itemAt: (i) => (i % 2 === 0
      ? { radius: CENTER_ITEM_RADII.ferreroRocher || 0.62, designId: 'ferreroRocher' }
      : { radius: CENTER_ITEM_RADII.cherry || 0.34, designId: 'cherry' }),
    designId: 'ferreroRocher',
  },
  hersheysKissRim: {
    inset: 0.48,
    radius: CENTER_ITEM_RADII.hersheysKisses || 0.40,
    countFn: (ringRadius) => Math.max(10, Math.round((ringRadius * Math.PI * 2) / 1.7)),
    designId: 'hersheysKisses',
  },
  hersheysKissRimSparse: {
    inset: 0.65,
    radius: CENTER_ITEM_RADII.ferreroRocher || 0.62,
    countFn: (ringRadius) => {
      const kisses = Math.max(3, Math.round((ringRadius * Math.PI * 2) / 3.4));
      return kisses * 2;
    },
    itemAt: (i) => (i % 2 === 0
      ? { radius: CENTER_ITEM_RADII.hersheysKisses || 0.40, designId: 'hersheysKisses' }
      : { radius: CENTER_ITEM_RADII.ferreroRocher || 0.62, designId: 'ferreroRocher' }),
    designId: 'hersheysKisses',
  },
  cherryRim: {
    inset: 0.36,
    radius: CENTER_ITEM_RADII.cherry || 0.34,
    countFn: () => 10,
    designId: 'cherry',
  },
  cherryRimSparse: {
    inset: 0.48,
    radius: CENTER_ITEM_RADII.hersheysKisses || 0.40,
    countFn: (ringRadius) => {
      const cherries = Math.max(3, Math.round((ringRadius * Math.PI * 2) / 4.2));
      return cherries * 2;
    },
    itemAt: (i) => (i % 2 === 0
      ? { radius: CENTER_ITEM_RADII.cherry || 0.34, designId: 'cherry' }
      : { radius: CENTER_ITEM_RADII.hersheysKisses || 0.40, designId: 'hersheysKisses' }),
    designId: 'cherry',
  },
};

export function getActiveEdgeDelicateTip(edgeConfig) {
  if (!edgeConfig) return null;
  const mode = edgeConfig.mode || 'both';
  const top = edgeConfig.top || null;
  const both = edgeConfig.both || null;
  const tip = mode === 'both'
    ? (both?.pipingTip || both?.piping?.tip)
    : (top?.pipingTip || top?.piping?.tip);
  return EDIBLE_DELICATES_RIM_SPECS[tip] ? tip : null;
}

/**
 * Computes obstacle footprints for Edible Delicates rim designs (Ferrero Rocher,
 * Hershey's Kisses, Cherry) when selected on the top tier.
 * Their physical geometry defines forbidden placement areas for Center decorations and text.
 */
export function getEdgeDelicatesObstacles(edgeConfig, topRadius = 4, exteriorFinishStyle = 'fullyFrosted') {
  const tip = getActiveEdgeDelicateTip(edgeConfig);
  if (!tip) return [];

  const spec = EDIBLE_DELICATES_RIM_SPECS[tip];
  if (!spec) return [];

  const surfaceRadius = exteriorFinishStyle === 'naked'
    ? topRadius - 0.02
    : topRadius + (exteriorFinishStyle === 'texturedButtercream' ? 0.08 : 0.06);
  const ringRadius = Math.max(0.15, surfaceRadius - spec.inset);
  const count = typeof spec.countFn === 'function' ? spec.countFn(ringRadius) : 12;
  const obstacles = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cx = Math.sin(angle) * ringRadius;
    const cz = Math.cos(angle) * ringRadius;
    const itemInfo = typeof spec.itemAt === 'function' ? spec.itemAt(i) : null;
    obstacles.push({
      type: 'circle',
      x: cx,
      z: cz,
      radius: itemInfo?.radius || spec.radius,
      designId: itemInfo?.designId || spec.designId,
      source: 'edge',
    });
  }
  return obstacles;
}

export function getEdgeFerreroObstacles(edgeConfig, topRadius = 4, exteriorFinishStyle = 'fullyFrosted') {
  return getEdgeDelicatesObstacles(edgeConfig, topRadius, exteriorFinishStyle);
}

/**
 * Computes the effective boundary radius for Center placement, reducing it when
 * an Edible Delicates rim design (Ferrero Rocher, Hershey's Kisses, Cherry) is present.
 */
export function getDelicatesAwareBoundaryRadius(topRadius = 4, edgeConfig = null, exteriorFinishStyle = 'fullyFrosted') {
  const defaultBoundary = getCenterPlacementBoundaryRadius(topRadius);
  const tip = getActiveEdgeDelicateTip(edgeConfig);
  if (!tip) return defaultBoundary;

  const spec = EDIBLE_DELICATES_RIM_SPECS[tip];
  if (!spec) return defaultBoundary;

  const surfaceRadius = exteriorFinishStyle === 'naked'
    ? topRadius - 0.02
    : topRadius + (exteriorFinishStyle === 'texturedButtercream' ? 0.08 : 0.06);
  const ringRadius = Math.max(0.15, surfaceRadius - spec.inset);
  return Math.max(0, ringRadius - spec.radius);
}

export function getFerreroAwareBoundaryRadius(topRadius = 4, edgeConfig = null, exteriorFinishStyle = 'fullyFrosted') {
  return getDelicatesAwareBoundaryRadius(topRadius, edgeConfig, exteriorFinishStyle);
}

/**
 * Derives the topmost tier's radius directly from cake configuration.
 */
export function getTopTierRadiusFromConfig(config) {
  const size = config?.structure?.size || '8x8';
  const layers = config?.structure?.layers || 1;
  if (size === 'classicCube') return 0.5;
  if (size === 'largeCube') return 1.0;
  if (size === 'miniBento') return 1.75;
  if (size === 'standardBento') return 2.0;
  if (size === 'largeBento') return 2.5;
  if (size === 'squareBento2x2') return 1.0;
  if (size === 'squareBento3x3') return 1.5;
  if (size === '12x12') {
    return layers >= 2 ? 5.0 : 6.0;
  }
  if (size === '10x10') {
    return layers >= 2 ? 4.0 : 5.0;
  }
  if (size === '6x6' || size === 'small') {
    return layers >= 2 ? 2.0 : 3.0;
  }
  // '8x8' or 'big' or default
  return layers >= 2 ? 3.0 : 4.0;
}

/**
 * Prunes/removes ONLY the placed center items that collide with Edible Delicates rim designs
 * (Ferrero Rocher, Hershey's Kisses, Cherry) or violate the adjusted boundary clearance.
 * Exception rule: removes whatever it hits and leaves all other placed items completely intact.
 */
export function pruneItemsCollidingWithEdgeDelicates(
  placedItems = [],
  edgeConfig = null,
  topRadius = 4,
  centerDecorScale = 1,
  exteriorFinishStyle = 'fullyFrosted'
) {
  if (!placedItems || placedItems.length === 0 || !edgeConfig) return placedItems;

  const obstacles = getEdgeDelicatesObstacles(edgeConfig, topRadius, exteriorFinishStyle);
  if (!obstacles || obstacles.length === 0) return placedItems;

  const boundaryR = getDelicatesAwareBoundaryRadius(topRadius, edgeConfig, exteriorFinishStyle);

  return placedItems.filter((item) => {
    if (!item) return false;
    const itemFp = getItemFootprint(item, centerDecorScale);
    if (!itemFp) return true;

    // Check if item footprint is outside the Delicates-aware boundary
    if (!isFootprintInBoundary(itemFp, boundaryR, topRadius)) {
      return false; // Collides with Edge Delicates clearance -> remove
    }

    // Check if item footprint clashes directly with any Edge Delicates obstacle
    const hitsObstacle = obstacles.some((obs) => doFootprintsClash(itemFp, obs, 0.02));
    if (hitsObstacle) {
      return false; // Hit by Edible Delicates rim item -> remove
    }

    return true; // Free and untouched -> keep
  });
}

export function pruneItemsCollidingWithEdgeFerrero(
  placedItems = [],
  edgeConfig = null,
  topRadius = 4,
  centerDecorScale = 1,
  exteriorFinishStyle = 'fullyFrosted'
) {
  return pruneItemsCollidingWithEdgeDelicates(
    placedItems,
    edgeConfig,
    topRadius,
    centerDecorScale,
    exteriorFinishStyle
  );
}

export const CENTER_PLACEABLE_DESIGNS = [
  { designId: 'strawberry', orientation: null, label: 'Strawberry', toolId: 'center-strawberry-default', maxLimit: 10 },
  { designId: 'cherry', orientation: null, label: 'Cherry', toolId: 'center-cherry-default', maxLimit: 10 },
  { designId: 'blueberry', orientation: null, label: 'Blueberry', toolId: 'center-blueberry-default', maxLimit: 10 },
  { designId: 'mangoCube', orientation: null, label: 'Mango Cube', toolId: 'center-mangoCube-default', maxLimit: 12 },
  { designId: 'ferreroRocher', orientation: null, label: 'Ferrero Rocher', toolId: 'center-ferreroRocher-default', maxLimit: 8 },
  { designId: 'hersheysKisses', orientation: null, label: 'Hershey Kisses', toolId: 'center-hersheysKisses-default', maxLimit: 9 },
  { designId: 'oreo', orientation: 'standing', label: 'Oreo', toolId: 'center-oreo-standing', maxLimit: 8 },
  { designId: 'chocolateBear', orientation: null, label: 'Bear', toolId: 'center-chocolateBear-default', maxLimit: 4 },
  { designId: 'basketball', orientation: null, label: 'Fondant Basketball', toolId: 'center-basketball-default', maxLimit: 8 },
  { designId: 'soccerball', orientation: null, label: 'Fondant Soccer Ball', toolId: 'center-soccerball-default', maxLimit: 8 },
];

// ─── Center Variations ──────────────────────────────────────────────────────
// Preset multi-item arrangements for center decorations. Numbered choices
// give distinct placements across the cake top surface, mirroring the Side
// tab's numbered variation architecture.
export const STRAWBERRY_VARIATION_SETS = [
  {
    id: 'singleCenter',
    label: 'Single Center',
    placements: [
      { x: 0, z: 0, rotation: 0 },
      { x: 0, z: -0.65, rotation: 0 },
      { x: 0.65, z: 0, rotation: 1.571 },
      { x: 0, z: 0.65, rotation: 3.142 },
      { x: -0.65, z: 0, rotation: 4.712 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0.85, z: -0.85, rotation: -0.4 },
      { x: 0.35, z: -1.35, rotation: -0.8 },
      { x: 1.35, z: -0.35, rotation: 0.3 },
      { x: 0.25, z: -0.75, rotation: -0.2 },
      { x: 1.05, z: -1.45, rotation: -0.6 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: 0, rotation: 0 },
      { x: 0, z: -0.68, rotation: 0 },
      { x: 0.589, z: -0.34, rotation: 1.047 },
      { x: 0.589, z: 0.34, rotation: 2.094 },
      { x: 0, z: 0.68, rotation: 3.142 },
      { x: -0.589, z: 0.34, rotation: 4.189 },
      { x: -0.589, z: -0.34, rotation: 5.236 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -1.40, z: -0.95, rotation: -1.0 },
      { x: -0.75, z: -1.52, rotation: -0.5 },
      { x: 0, z: -1.70, rotation: 0 },
      { x: 0.75, z: -1.52, rotation: 0.5 },
      { x: 1.40, z: -0.95, rotation: 1.0 },
      { x: -0.55, z: -0.95, rotation: -0.6 },
      { x: 0.55, z: -0.95, rotation: 0.6 },
    ],
  },
  {
    id: 'blossomRadial',
    label: 'Blossom Radial',
    placements: [
      { x: -1.25, z: -1.25, rotation: -0.785 },
      { x: -0.75, z: -0.75, rotation: -0.785 },
      { x: -1.30, z: -0.45, rotation: -1.2 },
      { x: 0, z: 0, rotation: 0 },
      { x: 0.45, z: 1.30, rotation: 2.1 },
      { x: 0.75, z: 0.75, rotation: 2.356 },
      { x: 1.25, z: 1.25, rotation: 2.356 },
    ],
  },
  {
    id: 'circleRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -1.75, rotation: 0 },
      { x: 1.029, z: -1.416, rotation: 0.628 },
      { x: 1.664, z: -0.541, rotation: 1.257 },
      { x: 1.664, z: 0.541, rotation: 1.885 },
      { x: 1.029, z: 1.416, rotation: 2.513 },
      { x: 0, z: 1.75, rotation: 3.142 },
      { x: -1.029, z: 1.416, rotation: 3.77 },
      { x: -1.664, z: 0.541, rotation: 4.398 },
      { x: -1.664, z: -0.541, rotation: 5.027 },
      { x: -1.029, z: -1.416, rotation: 5.655 },
    ],
  },
];

// Bento Cake variations (strict limit of 4 strawberries max, 6 variations)
export const BENTO_STRAWBERRY_VARIATION_SETS = [
  {
    id: 'singleCenter',
    label: 'Single Center',
    placements: [
      { x: 0, z: 0, rotation: 0 },
    ],
  },
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: -0.35, z: 0, rotation: -0.2 },
      { x: 0.35, z: 0, rotation: 0.2 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: -0.38, rotation: 0 },
      { x: 0.33, z: 0.19, rotation: 2.094 },
      { x: -0.33, z: 0.19, rotation: 4.189 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -0.75, z: -0.35, rotation: -0.5 },
      { x: -0.45, z: -0.75, rotation: 0 },
      { x: 0.1, z: -0.85, rotation: 0.5 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: -0.45, rotation: 0 },
      { x: 0.45, z: 0, rotation: 1.571 },
      { x: 0, z: 0.45, rotation: 3.142 },
      { x: -0.45, z: 0, rotation: 4.712 },
    ],
  },
  {
    id: 'fourCorners',
    label: '4 Corners Ring',
    placements: [
      { x: 0, z: -0.85, rotation: 0 },
      { x: 0.85, z: 0, rotation: 1.571 },
      { x: 0, z: 0.85, rotation: 3.142 },
      { x: -0.85, z: 0, rotation: 4.712 },
    ],
  },
];

export const BLUEBERRY_VARIATION_SETS = [
  {
    id: 'singleCenter',
    label: 'Single Center',
    placements: [
      { x: 0, z: 0, rotation: 0 },
      { x: 0, z: -0.55, rotation: 0 },
      { x: 0.55, z: 0, rotation: 1.571 },
      { x: 0, z: 0.55, rotation: 3.142 },
      { x: -0.55, z: 0, rotation: 4.712 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: 0, rotation: 0 },
      { x: 0, z: -0.55, rotation: 0 },
      { x: 0.476, z: -0.275, rotation: 1.047 },
      { x: 0.476, z: 0.275, rotation: 2.094 },
      { x: 0, z: 0.55, rotation: 3.142 },
      { x: -0.476, z: 0.275, rotation: 4.189 },
      { x: -0.476, z: -0.275, rotation: 5.236 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0.75, z: -0.75, rotation: 0 },
      { x: 0.30, z: -1.15, rotation: 0 },
      { x: 1.15, z: -0.30, rotation: 0 },
      { x: 0.25, z: -0.65, rotation: 0 },
      { x: 0.95, z: -1.25, rotation: 0 },
      { x: 1.25, z: -0.85, rotation: 0 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -1.40, z: -0.85, rotation: -0.7 },
      { x: -0.75, z: -1.45, rotation: -0.4 },
      { x: 0, z: -1.65, rotation: 0 },
      { x: 0.75, z: -1.45, rotation: 0.4 },
      { x: 1.40, z: -0.85, rotation: 0.7 },
      { x: -0.65, z: -0.95, rotation: -0.5 },
      { x: 0, z: -1.15, rotation: 0 },
      { x: 0.65, z: -0.95, rotation: 0.5 },
    ],
  },
  {
    id: 'blossomRadial',
    label: 'Blossom Radial',
    placements: [
      { x: -1.15, z: -1.15, rotation: 0 },
      { x: -1.40, z: -0.65, rotation: 0 },
      { x: -0.65, z: -1.40, rotation: 0 },
      { x: -0.30, z: -0.30, rotation: 0 },
      { x: 0.30, z: 0.30, rotation: 0 },
      { x: 1.15, z: 1.15, rotation: 0 },
      { x: 1.40, z: 0.65, rotation: 0 },
      { x: 0.65, z: 1.40, rotation: 0 },
    ],
  },
  {
    id: 'crownRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -1.65, rotation: 0 },
      { x: 0.97, z: -1.335, rotation: 0.628 },
      { x: 1.569, z: -0.51, rotation: 1.257 },
      { x: 1.569, z: 0.51, rotation: 1.885 },
      { x: 0.97, z: 1.335, rotation: 2.513 },
      { x: 0, z: 1.65, rotation: 3.142 },
      { x: -0.97, z: 1.335, rotation: 3.77 },
      { x: -1.569, z: 0.51, rotation: 4.398 },
      { x: -1.569, z: -0.51, rotation: 5.027 },
      { x: -0.97, z: -1.335, rotation: 5.655 },
    ],
  },
];

export const BENTO_BLUEBERRY_VARIATION_SETS = [
  {
    id: 'singleCenter',
    label: 'Single Center',
    placements: [
      { x: 0, z: 0, rotation: 0 },
    ],
  },
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: -0.26, z: 0, rotation: -0.2 },
      { x: 0.26, z: 0, rotation: 0.2 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: -0.28, rotation: 0 },
      { x: 0.24, z: 0.14, rotation: 2.094 },
      { x: -0.24, z: 0.14, rotation: 4.189 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -0.65, z: -0.35, rotation: -0.5 },
      { x: -0.35, z: -0.65, rotation: 0 },
      { x: 0.1, z: -0.75, rotation: 0.5 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: -0.35, rotation: 0 },
      { x: 0.35, z: 0, rotation: 1.571 },
      { x: 0, z: 0.35, rotation: 3.142 },
      { x: -0.35, z: 0, rotation: 4.712 },
    ],
  },
  {
    id: 'fourCorners',
    label: '4 Corners Ring',
    placements: [
      { x: 0, z: -0.75, rotation: 0 },
      { x: 0.75, z: 0, rotation: 1.571 },
      { x: 0, z: 0.75, rotation: 3.142 },
      { x: -0.75, z: 0, rotation: 4.712 },
    ],
  },
];

export const MANGO_VARIATION_SETS = [
  {
    id: 'singleCenter',
    label: 'Single Center',
    placements: [
      { x: 0, z: 0, rotation: 0 },
      { x: 0, z: -0.52, rotation: 0 },
      { x: 0.52, z: 0, rotation: 1.571 },
      { x: 0, z: 0.52, rotation: 3.142 },
      { x: -0.52, z: 0, rotation: 4.712 },
    ],
  },
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: 0.80, z: -0.80, rotation: 0 },
      { x: 0.35, z: -1.15, rotation: 0 },
      { x: 1.15, z: -0.35, rotation: 0 },
      { x: 0.30, z: -0.65, rotation: 0 },
      { x: 0.95, z: -1.30, rotation: 0 },
      { x: 1.30, z: -0.85, rotation: 0 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: 0, rotation: 0 },
      { x: 0, z: -0.55, rotation: 0 },
      { x: 0.476, z: -0.275, rotation: 1.047 },
      { x: 0.476, z: 0.275, rotation: 2.094 },
      { x: 0, z: 0.55, rotation: 3.142 },
      { x: -0.476, z: 0.275, rotation: 4.189 },
      { x: -0.476, z: -0.275, rotation: 5.236 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: -1.40, z: -0.85, rotation: -0.7 },
      { x: -0.75, z: -1.45, rotation: -0.4 },
      { x: 0, z: -1.65, rotation: 0 },
      { x: 0.75, z: -1.45, rotation: 0.4 },
      { x: 1.40, z: -0.85, rotation: 0.7 },
      { x: -0.65, z: -0.95, rotation: -0.5 },
      { x: 0, z: -1.15, rotation: 0 },
      { x: 0.65, z: -0.95, rotation: 0.5 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -1.15, z: -1.15, rotation: 0 },
      { x: -1.40, z: -0.65, rotation: 0 },
      { x: -0.65, z: -1.40, rotation: 0 },
      { x: -0.30, z: -0.30, rotation: 0 },
      { x: 0.30, z: 0.30, rotation: 0 },
      { x: 1.15, z: 1.15, rotation: 0 },
      { x: 1.40, z: 0.65, rotation: 0 },
      { x: 0.65, z: 1.40, rotation: 0 },
    ],
  },
  {
    id: 'blossomRadial',
    label: 'Blossom Radial',
    placements: [
      { x: 0, z: -1.75, rotation: 0 },
      { x: 0.875, z: -1.516, rotation: 0.524 },
      { x: 1.516, z: -0.875, rotation: 1.047 },
      { x: 1.75, z: 0, rotation: 1.571 },
      { x: 1.516, z: 0.875, rotation: 2.094 },
      { x: 0.875, z: 1.516, rotation: 2.618 },
      { x: 0, z: 1.75, rotation: 3.142 },
      { x: -0.875, z: 1.516, rotation: 3.665 },
      { x: -1.516, z: 0.875, rotation: 4.189 },
      { x: -1.75, z: 0, rotation: 4.712 },
      { x: -1.516, z: -0.875, rotation: 5.236 },
      { x: -0.875, z: -1.516, rotation: 5.76 },
    ],
  },
];

export const BENTO_MANGO_VARIATION_SETS = [
  {
    id: 'singleCenter',
    label: 'Single Center',
    placements: [
      { x: 0, z: 0, rotation: 0 },
    ],
  },
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: -0.28, z: 0, rotation: 0.35 },
      { x: 0.28, z: 0, rotation: -0.35 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: -0.32, rotation: 0.2 },
      { x: 0.28, z: 0.17, rotation: 2.1 },
      { x: -0.28, z: 0.17, rotation: 4.2 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -0.65, z: -0.35, rotation: -0.4 },
      { x: -0.35, z: -0.68, rotation: 0.1 },
      { x: 0.12, z: -0.78, rotation: 0.5 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: -0.38, rotation: 0 },
      { x: 0.38, z: 0, rotation: 1.571 },
      { x: 0, z: 0.38, rotation: 3.142 },
      { x: -0.38, z: 0, rotation: 4.712 },
    ],
  },
  {
    id: 'fourCorners',
    label: '4 Corners Ring',
    placements: [
      { x: 0, z: -0.78, rotation: 0 },
      { x: 0.78, z: 0, rotation: 1.571 },
      { x: 0, z: 0.78, rotation: 3.142 },
      { x: -0.78, z: 0, rotation: 4.712 },
    ],
  },
];

// Petits Fours variations (strictly 1 variation since each petit cake can only fit 1 decoration)
export function getPetitsFourVariationSets(offset = 0.75) {
  return [
    {
      id: 'singlePerCake',
      label: 'One Per Cake',
      placements: [
        { x: -offset, z: -offset, rotation: 0 },
        { x: offset, z: -offset, rotation: 0 },
        { x: -offset, z: offset, rotation: 0 },
        { x: offset, z: offset, rotation: 0 },
      ],
    },
  ];
}

export const PETITS_FOUR_STRAWBERRY_VARIATION_SETS = getPetitsFourVariationSets(0.75);
export const PETITS_FOUR_BLUEBERRY_VARIATION_SETS = getPetitsFourVariationSets(0.75);
export const PETITS_FOUR_MANGO_VARIATION_SETS = getPetitsFourVariationSets(0.75);

// ─── Center Combination Variations (Standard & Bento only) ───────────────────
export const STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS = [
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: 0, z: -0.40, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.35, z: 0.20, type: 'center-strawberry-default', rotation: 2.094 },
      { x: -0.35, z: 0.20, type: 'center-strawberry-default', rotation: -2.094 },
      { x: 0, z: 0.78, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: -0.98, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.88, z: 0.44, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.88, z: 0.44, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0.85, z: -0.85, type: 'center-strawberry-default', rotation: -0.4 },
      { x: 0.35, z: -1.35, type: 'center-strawberry-default', rotation: -0.8 },
      { x: 1.45, z: -0.60, type: 'center-strawberry-default', rotation: 0.3 },
      { x: 1.05, z: -1.55, type: 'center-strawberry-default', rotation: -0.6 },
      { x: 0.30, z: -0.80, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.95, z: -0.28, type: 'center-blueberry-default', rotation: 0 },
      { x: 1.50, z: -1.15, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.20, z: -1.40, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'bouquetCluster',
    label: 'Bouquet Cluster',
    placements: [
      { x: 0, z: -0.40, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.35, z: 0.20, type: 'center-strawberry-default', rotation: 2.094 },
      { x: -0.35, z: 0.20, type: 'center-strawberry-default', rotation: -2.094 },
      { x: 0, z: -0.98, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.85, z: -0.49, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.85, z: 0.49, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: 0.98, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.85, z: 0.49, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.85, z: -0.49, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -1.40, z: -0.95, type: 'center-strawberry-default', rotation: -1.0 },
      { x: -0.75, z: -1.52, type: 'center-strawberry-default', rotation: -0.5 },
      { x: 0, z: -1.70, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.75, z: -1.52, type: 'center-strawberry-default', rotation: 0.5 },
      { x: 1.40, z: -0.95, type: 'center-strawberry-default', rotation: 1.0 },
      { x: -1.05, z: -0.50, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.60, z: -0.98, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: -1.15, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.60, z: -0.98, type: 'center-blueberry-default', rotation: 0 },
      { x: 1.05, z: -0.50, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'blossomRadial',
    label: 'Blossom Radial',
    placements: [
      { x: -1.25, z: -1.25, type: 'center-strawberry-default', rotation: -0.785 },
      { x: -0.65, z: -1.35, type: 'center-strawberry-default', rotation: -0.4 },
      { x: 0, z: 0, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.65, z: 1.35, type: 'center-strawberry-default', rotation: 2.5 },
      { x: 1.25, z: 1.25, type: 'center-strawberry-default', rotation: 2.356 },
      { x: -1.35, z: -0.65, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.75, z: -0.75, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.50, z: -0.40, type: 'center-blueberry-default', rotation: 0 },
      { x: 1.35, z: 0.65, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.75, z: 0.75, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'outerRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -1.75, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.67, z: -1.617, type: 'center-blueberry-default', rotation: 0.393 },
      { x: 1.237, z: -1.237, type: 'center-strawberry-default', rotation: 0.785 },
      { x: 1.617, z: -0.67, type: 'center-blueberry-default', rotation: 1.178 },
      { x: 1.75, z: 0, type: 'center-strawberry-default', rotation: 1.571 },
      { x: 1.617, z: 0.67, type: 'center-blueberry-default', rotation: 1.963 },
      { x: 1.237, z: 1.237, type: 'center-strawberry-default', rotation: 2.356 },
      { x: 0.67, z: 1.617, type: 'center-blueberry-default', rotation: 2.749 },
      { x: 0, z: 1.75, type: 'center-strawberry-default', rotation: 3.142 },
      { x: -0.67, z: 1.617, type: 'center-blueberry-default', rotation: 3.534 },
      { x: -1.237, z: 1.237, type: 'center-strawberry-default', rotation: 3.927 },
      { x: -1.617, z: 0.67, type: 'center-blueberry-default', rotation: 4.32 },
      { x: -1.75, z: 0, type: 'center-strawberry-default', rotation: 4.712 },
      { x: -1.617, z: -0.67, type: 'center-blueberry-default', rotation: 5.105 },
      { x: -1.237, z: -1.237, type: 'center-strawberry-default', rotation: 5.498 },
      { x: -0.67, z: -1.617, type: 'center-blueberry-default', rotation: 5.89 },
    ],
  },
];

export const BENTO_STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS = [
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: -0.28, z: 0, type: 'center-strawberry-default', rotation: -0.2 },
      { x: 0.28, z: 0, type: 'center-blueberry-default', rotation: 0.2 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: -0.22, type: 'center-strawberry-default', rotation: 0 },
      { x: -0.28, z: 0.24, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.28, z: 0.24, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: -0.42, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.42, z: 0, type: 'center-blueberry-default', rotation: 1.571 },
      { x: 0, z: 0.42, type: 'center-strawberry-default', rotation: 3.142 },
      { x: -0.42, z: 0, type: 'center-blueberry-default', rotation: 4.712 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -0.65, z: -0.32, type: 'center-blueberry-default', rotation: -0.5 },
      { x: -0.25, z: -0.62, type: 'center-strawberry-default', rotation: -0.2 },
      { x: 0.25, z: -0.62, type: 'center-blueberry-default', rotation: 0.2 },
      { x: 0.65, z: -0.32, type: 'center-strawberry-default', rotation: 0.5 },
    ],
  },
  {
    id: 'berryCrown',
    label: 'Berry Crown',
    placements: [
      { x: -0.32, z: -0.20, type: 'center-strawberry-default', rotation: -0.2 },
      { x: 0.32, z: -0.20, type: 'center-strawberry-default', rotation: 0.2 },
      { x: -0.50, z: 0.28, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: 0.38, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.50, z: 0.28, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'outerRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -0.65, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.56, z: -0.325, type: 'center-blueberry-default', rotation: 1.047 },
      { x: 0.56, z: 0.325, type: 'center-strawberry-default', rotation: 2.094 },
      { x: 0, z: 0.65, type: 'center-blueberry-default', rotation: 3.142 },
      { x: -0.56, z: 0.325, type: 'center-strawberry-default', rotation: 4.189 },
      { x: -0.56, z: -0.325, type: 'center-blueberry-default', rotation: 5.236 },
    ],
  },
];

export const BLUEBERRY_AND_MANGO_VARIATION_SETS = [
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: 0, z: -0.40, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.40, z: 0, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: 0.40, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.40, z: 0, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.60, z: -0.60, type: 'center-mangoCube-default', rotation: 0.785 },
      { x: 0.60, z: 0.60, type: 'center-mangoCube-default', rotation: 2.356 },
      { x: -0.60, z: 0.60, type: 'center-mangoCube-default', rotation: 3.927 },
      { x: -0.60, z: -0.60, type: 'center-mangoCube-default', rotation: 5.498 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0.85, z: -0.85, type: 'center-mangoCube-default', rotation: 0.4 },
      { x: 0.35, z: -1.35, type: 'center-mangoCube-default', rotation: -0.4 },
      { x: 1.35, z: -0.35, type: 'center-mangoCube-default', rotation: 0.8 },
      { x: 1.45, z: -1.05, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.35, z: -0.80, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.80, z: -0.35, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.95, z: -1.45, type: 'center-blueberry-default', rotation: 0 },
      { x: 1.65, z: 0.05, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'clusterFive',
    label: 'Center Cluster',
    placements: [
      { x: 0, z: 0, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0, z: -0.65, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.563, z: 0.325, type: 'center-mangoCube-default', rotation: 2.094 },
      { x: -0.563, z: 0.325, type: 'center-mangoCube-default', rotation: 4.189 },
      { x: 0, z: -1.15, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.996, z: -0.575, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.996, z: 0.575, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: 1.15, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.996, z: 0.575, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.996, z: -0.575, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -1.40, z: -0.85, type: 'center-mangoCube-default', rotation: -0.7 },
      { x: -0.75, z: -1.45, type: 'center-mangoCube-default', rotation: -0.4 },
      { x: 0, z: -1.65, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.75, z: -1.45, type: 'center-mangoCube-default', rotation: 0.4 },
      { x: 1.40, z: -0.85, type: 'center-mangoCube-default', rotation: 0.7 },
      { x: -1.10, z: -0.35, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.75, z: -0.85, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.28, z: -1.12, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.28, z: -1.12, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.75, z: -0.85, type: 'center-blueberry-default', rotation: 0 },
      { x: 1.10, z: -0.35, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'blossomRadial',
    label: 'Blossom Radial',
    placements: [
      { x: -1.25, z: -1.25, type: 'center-mangoCube-default', rotation: 0.785 },
      { x: -0.65, z: -1.35, type: 'center-mangoCube-default', rotation: 0.2 },
      { x: 0, z: 0, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.65, z: 1.35, type: 'center-mangoCube-default', rotation: 2.2 },
      { x: 1.25, z: 1.25, type: 'center-mangoCube-default', rotation: 2.356 },
      { x: -1.35, z: -0.65, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.75, z: -0.75, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.45, z: -0.40, type: 'center-blueberry-default', rotation: 0 },
      { x: 1.35, z: 0.65, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.75, z: 0.75, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'outerRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -1.75, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.67, z: -1.617, type: 'center-blueberry-default', rotation: 0.393 },
      { x: 1.237, z: -1.237, type: 'center-mangoCube-default', rotation: 0.785 },
      { x: 1.617, z: -0.67, type: 'center-blueberry-default', rotation: 1.178 },
      { x: 1.75, z: 0, type: 'center-mangoCube-default', rotation: 1.571 },
      { x: 1.617, z: 0.67, type: 'center-blueberry-default', rotation: 1.963 },
      { x: 1.237, z: 1.237, type: 'center-mangoCube-default', rotation: 2.356 },
      { x: 0.67, z: 1.617, type: 'center-blueberry-default', rotation: 2.749 },
      { x: 0, z: 1.75, type: 'center-mangoCube-default', rotation: 3.142 },
      { x: -0.67, z: 1.617, type: 'center-blueberry-default', rotation: 3.534 },
      { x: -1.237, z: 1.237, type: 'center-mangoCube-default', rotation: 3.927 },
      { x: -1.617, z: 0.67, type: 'center-blueberry-default', rotation: 4.32 },
      { x: -1.75, z: 0, type: 'center-mangoCube-default', rotation: 4.712 },
      { x: -1.617, z: -0.67, type: 'center-blueberry-default', rotation: 5.105 },
      { x: -1.237, z: -1.237, type: 'center-mangoCube-default', rotation: 5.498 },
      { x: -0.67, z: -1.617, type: 'center-blueberry-default', rotation: 5.89 },
    ],
  },
];

export const BENTO_BLUEBERRY_AND_MANGO_VARIATION_SETS = [
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: -0.26, z: 0, type: 'center-blueberry-default', rotation: 0.2 },
      { x: 0.26, z: 0, type: 'center-mangoCube-default', rotation: -0.2 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: -0.20, type: 'center-mangoCube-default', rotation: 0.3 },
      { x: -0.26, z: 0.22, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.26, z: 0.22, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: -0.38, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.38, z: 0, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: 0.38, type: 'center-mangoCube-default', rotation: 0 },
      { x: -0.38, z: 0, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -0.65, z: -0.30, type: 'center-blueberry-default', rotation: -0.5 },
      { x: -0.25, z: -0.60, type: 'center-mangoCube-default', rotation: -0.2 },
      { x: 0.25, z: -0.60, type: 'center-blueberry-default', rotation: 0.2 },
      { x: 0.65, z: -0.30, type: 'center-mangoCube-default', rotation: 0.5 },
    ],
  },
  {
    id: 'blossomCluster',
    label: 'Blossom Cluster',
    placements: [
      { x: 0, z: 0, type: 'center-mangoCube-default', rotation: 0.4 },
      { x: 0, z: -0.48, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.48, z: 0, type: 'center-blueberry-default', rotation: 0 },
      { x: 0, z: 0.48, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.48, z: 0, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'outerRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -0.62, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.54, z: -0.31, type: 'center-mangoCube-default', rotation: 1.047 },
      { x: 0.54, z: 0.31, type: 'center-blueberry-default', rotation: 2.094 },
      { x: 0, z: 0.62, type: 'center-mangoCube-default', rotation: 3.142 },
      { x: -0.54, z: 0.31, type: 'center-blueberry-default', rotation: 4.189 },
      { x: -0.54, z: -0.31, type: 'center-mangoCube-default', rotation: 5.236 },
    ],
  },
];

export const STRAWBERRY_AND_MANGO_VARIATION_SETS = [
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: 0, z: -0.40, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.35, z: 0.20, type: 'center-strawberry-default', rotation: 2.094 },
      { x: -0.35, z: 0.20, type: 'center-strawberry-default', rotation: -2.094 },
      { x: 0, z: 0.78, type: 'center-mangoCube-default', rotation: 1.571 },
      { x: 0, z: -0.98, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.90, z: 0.45, type: 'center-mangoCube-default', rotation: 0 },
      { x: -0.90, z: 0.45, type: 'center-mangoCube-default', rotation: 0 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0.85, z: -0.85, type: 'center-strawberry-default', rotation: -0.4 },
      { x: 0.35, z: -1.35, type: 'center-strawberry-default', rotation: -0.8 },
      { x: 1.45, z: -0.60, type: 'center-strawberry-default', rotation: 0.3 },
      { x: 1.05, z: -1.55, type: 'center-strawberry-default', rotation: -0.6 },
      { x: 0.30, z: -0.80, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.95, z: -0.28, type: 'center-mangoCube-default', rotation: 0 },
      { x: 1.50, z: -1.15, type: 'center-mangoCube-default', rotation: 0 },
      { x: -0.20, z: -1.40, type: 'center-mangoCube-default', rotation: 0 },
    ],
  },
  {
    id: 'bouquetCluster',
    label: 'Bouquet Cluster',
    placements: [
      { x: 0, z: 0, type: 'center-strawberry-default', rotation: 0 },
      { x: 0, z: -1.25, type: 'center-strawberry-default', rotation: 0 },
      { x: 1.08, z: 0.625, type: 'center-strawberry-default', rotation: 2.094 },
      { x: -1.08, z: 0.625, type: 'center-strawberry-default', rotation: 4.189 },
      { x: 0, z: -0.65, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.62, z: -0.20, type: 'center-mangoCube-default', rotation: 1.2 },
      { x: 0.38, z: 0.55, type: 'center-mangoCube-default', rotation: 2.4 },
      { x: -0.38, z: 0.55, type: 'center-mangoCube-default', rotation: 3.8 },
      { x: -0.62, z: -0.20, type: 'center-mangoCube-default', rotation: 5.0 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -1.40, z: -0.95, type: 'center-strawberry-default', rotation: -1.0 },
      { x: -0.75, z: -1.52, type: 'center-strawberry-default', rotation: -0.5 },
      { x: 0, z: -1.70, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.75, z: -1.52, type: 'center-strawberry-default', rotation: 0.5 },
      { x: 1.40, z: -0.95, type: 'center-strawberry-default', rotation: 1.0 },
      { x: -1.05, z: -0.50, type: 'center-mangoCube-default', rotation: 0 },
      { x: -0.60, z: -0.98, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0, z: -1.15, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.60, z: -0.98, type: 'center-mangoCube-default', rotation: 0 },
      { x: 1.05, z: -0.50, type: 'center-mangoCube-default', rotation: 0 },
    ],
  },
  {
    id: 'blossomRadial',
    label: 'Blossom Radial',
    placements: [
      { x: -1.25, z: -1.25, type: 'center-strawberry-default', rotation: -0.785 },
      { x: -0.65, z: -1.35, type: 'center-strawberry-default', rotation: -0.4 },
      { x: 0, z: 0, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.65, z: 1.35, type: 'center-strawberry-default', rotation: 2.5 },
      { x: 1.25, z: 1.25, type: 'center-strawberry-default', rotation: 2.356 },
      { x: -1.35, z: -0.65, type: 'center-mangoCube-default', rotation: 0 },
      { x: -0.75, z: -0.75, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.50, z: -0.40, type: 'center-mangoCube-default', rotation: 0 },
      { x: 1.35, z: 0.65, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.75, z: 0.75, type: 'center-mangoCube-default', rotation: 0 },
    ],
  },
  {
    id: 'outerRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -1.75, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.67, z: -1.617, type: 'center-mangoCube-default', rotation: 0.393 },
      { x: 1.237, z: -1.237, type: 'center-strawberry-default', rotation: 0.785 },
      { x: 1.617, z: -0.67, type: 'center-mangoCube-default', rotation: 1.178 },
      { x: 1.75, z: 0, type: 'center-strawberry-default', rotation: 1.571 },
      { x: 1.617, z: 0.67, type: 'center-mangoCube-default', rotation: 1.963 },
      { x: 1.237, z: 1.237, type: 'center-strawberry-default', rotation: 2.356 },
      { x: 0.67, z: 1.617, type: 'center-mangoCube-default', rotation: 2.749 },
      { x: 0, z: 1.75, type: 'center-strawberry-default', rotation: 3.142 },
      { x: -0.67, z: 1.617, type: 'center-mangoCube-default', rotation: 3.534 },
      { x: -1.237, z: 1.237, type: 'center-strawberry-default', rotation: 3.927 },
      { x: -1.617, z: 0.67, type: 'center-mangoCube-default', rotation: 4.32 },
      { x: -1.75, z: 0, type: 'center-strawberry-default', rotation: 4.712 },
      { x: -1.617, z: -0.67, type: 'center-mangoCube-default', rotation: 5.105 },
      { x: -1.237, z: -1.237, type: 'center-strawberry-default', rotation: 5.498 },
      { x: -0.67, z: -1.617, type: 'center-mangoCube-default', rotation: 5.89 },
    ],
  },
];

export const BENTO_STRAWBERRY_AND_MANGO_VARIATION_SETS = [
  {
    id: 'duoCenter',
    label: 'Center Duo',
    placements: [
      { x: -0.28, z: 0, type: 'center-strawberry-default', rotation: -0.2 },
      { x: 0.28, z: 0, type: 'center-mangoCube-default', rotation: 0.2 },
    ],
  },
  {
    id: 'trioCluster',
    label: 'Center Trio',
    placements: [
      { x: 0, z: -0.22, type: 'center-strawberry-default', rotation: 0 },
      { x: -0.26, z: 0.22, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.26, z: 0.22, type: 'center-mangoCube-default', rotation: 0 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: -0.42, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.42, z: 0, type: 'center-mangoCube-default', rotation: 1.571 },
      { x: 0, z: 0.42, type: 'center-strawberry-default', rotation: 3.142 },
      { x: -0.42, z: 0, type: 'center-mangoCube-default', rotation: 4.712 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Crescent Arc',
    placements: [
      { x: -0.65, z: -0.32, type: 'center-mangoCube-default', rotation: -0.5 },
      { x: -0.25, z: -0.62, type: 'center-strawberry-default', rotation: -0.2 },
      { x: 0.25, z: -0.62, type: 'center-mangoCube-default', rotation: 0.2 },
      { x: 0.65, z: -0.32, type: 'center-strawberry-default', rotation: 0.5 },
    ],
  },
  {
    id: 'tropicalCrown',
    label: 'Tropical Crown',
    placements: [
      { x: -0.32, z: -0.20, type: 'center-strawberry-default', rotation: -0.2 },
      { x: 0.32, z: -0.20, type: 'center-strawberry-default', rotation: 0.2 },
      { x: -0.48, z: 0.28, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0, z: 0.38, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.48, z: 0.28, type: 'center-mangoCube-default', rotation: 0 },
    ],
  },
  {
    id: 'outerRing',
    label: 'Outer Ring',
    placements: [
      { x: 0, z: -0.65, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.56, z: -0.325, type: 'center-mangoCube-default', rotation: 1.047 },
      { x: 0.56, z: 0.325, type: 'center-strawberry-default', rotation: 2.094 },
      { x: 0, z: 0.65, type: 'center-mangoCube-default', rotation: 3.142 },
      { x: -0.56, z: 0.325, type: 'center-strawberry-default', rotation: 4.189 },
      { x: -0.56, z: -0.325, type: 'center-mangoCube-default', rotation: 5.236 },
    ],
  },
];

export const STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS = [
  {
    id: 'trioCenter',
    label: 'Centerpiece Medley',
    placements: [
      { x: 0, z: -0.40, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.35, z: 0.20, type: 'center-strawberry-default', rotation: 2.094 },
      { x: -0.35, z: 0.20, type: 'center-strawberry-default', rotation: -2.094 },
      { x: 0, z: 0.78, type: 'center-mangoCube-default', rotation: 1.571 },
      { x: 0.68, z: -0.39, type: 'center-mangoCube-default', rotation: 0.5 },
      { x: -0.68, z: -0.39, type: 'center-mangoCube-default', rotation: -0.5 },
      { x: 0, z: -0.98, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.85, z: 0.49, type: 'center-blueberry-default', rotation: 1.8 },
      { x: -0.85, z: 0.49, type: 'center-blueberry-default', rotation: -1.8 },
      { x: 0, z: 1.30, type: 'center-mangoCube-default', rotation: 3.142 },
      { x: 1.12, z: -0.65, type: 'center-mangoCube-default', rotation: 0.8 },
      { x: -1.12, z: -0.65, type: 'center-mangoCube-default', rotation: -0.8 },
    ],
  },
  {
    id: 'quattroCluster',
    label: 'Corner Bouquet',
    placements: [
      { x: 0.85, z: -0.85, type: 'center-strawberry-default', rotation: -0.4 },
      { x: 0.35, z: -1.35, type: 'center-strawberry-default', rotation: -0.8 },
      { x: 1.45, z: -0.60, type: 'center-strawberry-default', rotation: 0.3 },
      { x: 0.30, z: -0.80, type: 'center-blueberry-default', rotation: 0.2 },
      { x: 0.95, z: -1.45, type: 'center-blueberry-default', rotation: 0.8 },
      { x: 1.45, z: -1.20, type: 'center-blueberry-default', rotation: -0.5 },
      { x: 0.90, z: -0.28, type: 'center-mangoCube-default', rotation: 0.6 },
      { x: -0.20, z: -1.40, type: 'center-mangoCube-default', rotation: -0.2 },
      { x: 1.55, z: 0.00, type: 'center-mangoCube-default', rotation: 1.1 },
      { x: 0.95, z: -2.00, type: 'center-mangoCube-default', rotation: 0.4 },
    ],
  },
  {
    id: 'hexCluster',
    label: 'Fruit Blossom',
    placements: [
      { x: 0, z: 0, type: 'center-strawberry-default', rotation: 0 },
      { x: 0, z: -0.60, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.52, z: -0.30, type: 'center-blueberry-default', rotation: 1.047 },
      { x: 0.52, z: 0.30, type: 'center-mangoCube-default', rotation: 2.094 },
      { x: 0, z: 0.60, type: 'center-blueberry-default', rotation: 3.142 },
      { x: -0.52, z: 0.30, type: 'center-mangoCube-default', rotation: 4.189 },
      { x: -0.52, z: -0.30, type: 'center-blueberry-default', rotation: 5.236 },
      { x: 0, z: -1.25, type: 'center-strawberry-default', rotation: 0 },
      { x: 1.08, z: 0.625, type: 'center-strawberry-default', rotation: 2.094 },
      { x: -1.08, z: 0.625, type: 'center-strawberry-default', rotation: 4.189 },
    ],
  },
  {
    id: 'crescentArc',
    label: 'Lush Crescent Crown',
    placements: [
      { x: -0.55, z: -1.55, type: 'center-strawberry-default', rotation: -0.3 },
      { x: 0.55, z: -1.55, type: 'center-strawberry-default', rotation: 0.3 },
      { x: 0, z: -1.65, type: 'center-mangoCube-default', rotation: 0 },
      { x: -1.15, z: -1.20, type: 'center-blueberry-default', rotation: -0.8 },
      { x: 1.15, z: -1.20, type: 'center-blueberry-default', rotation: 0.8 },
      { x: -1.60, z: -0.65, type: 'center-mangoCube-default', rotation: -1.2 },
      { x: 1.60, z: -0.65, type: 'center-mangoCube-default', rotation: 1.2 },
      { x: 0, z: -1.10, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.70, z: -0.85, type: 'center-strawberry-default', rotation: -0.6 },
      { x: 0.70, z: -0.85, type: 'center-strawberry-default', rotation: 0.6 },
      { x: -1.15, z: -0.30, type: 'center-mangoCube-default', rotation: -1.1 },
      { x: 1.15, z: -0.30, type: 'center-mangoCube-default', rotation: 1.1 },
    ],
  },
  {
    id: 'blossomRadial',
    label: 'Cascade Sweep',
    placements: [
      { x: -1.15, z: -1.15, type: 'center-strawberry-default', rotation: -0.785 },
      { x: -1.45, z: -0.65, type: 'center-blueberry-default', rotation: -1.2 },
      { x: -0.65, z: -1.45, type: 'center-mangoCube-default', rotation: -0.4 },
      { x: -0.45, z: -0.45, type: 'center-strawberry-default', rotation: -0.785 },
      { x: -0.80, z: 0.05, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.05, z: -0.80, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.35, z: 0.35, type: 'center-strawberry-default', rotation: 2.356 },
      { x: 0.75, z: -0.15, type: 'center-blueberry-default', rotation: 0.6 },
      { x: -0.15, z: 0.75, type: 'center-mangoCube-default', rotation: 2.1 },
      { x: 1.15, z: 1.15, type: 'center-strawberry-default', rotation: 2.356 },
      { x: 1.45, z: 0.65, type: 'center-blueberry-default', rotation: 1.2 },
      { x: 0.65, z: 1.45, type: 'center-mangoCube-default', rotation: 2.5 },
    ],
  },
  {
    id: 'outerRing',
    label: 'Berry & Mango Crown',
    placements: [
      { x: 0, z: -1.65, type: 'center-strawberry-default', rotation: 0 },
      { x: 1.65, z: 0, type: 'center-strawberry-default', rotation: 1.571 },
      { x: 0, z: 1.65, type: 'center-strawberry-default', rotation: 3.142 },
      { x: -1.65, z: 0, type: 'center-strawberry-default', rotation: 4.712 },
      { x: -0.55, z: -1.55, type: 'center-blueberry-default', rotation: -0.3 },
      { x: 0.55, z: -1.55, type: 'center-blueberry-default', rotation: 0.3 },
      { x: 1.55, z: -0.55, type: 'center-blueberry-default', rotation: 1.2 },
      { x: 1.55, z: 0.55, type: 'center-blueberry-default', rotation: 1.8 },
      { x: 0.55, z: 1.55, type: 'center-blueberry-default', rotation: 2.8 },
      { x: -0.55, z: 1.55, type: 'center-blueberry-default', rotation: 3.4 },
      { x: -1.55, z: 0.55, type: 'center-blueberry-default', rotation: 4.4 },
      { x: -1.55, z: -0.55, type: 'center-blueberry-default', rotation: 5.0 },
      { x: 1.15, z: -1.15, type: 'center-mangoCube-default', rotation: 0.785 },
      { x: 1.15, z: 1.15, type: 'center-mangoCube-default', rotation: 2.356 },
      { x: -1.15, z: 1.15, type: 'center-mangoCube-default', rotation: 3.927 },
      { x: -1.15, z: -1.15, type: 'center-mangoCube-default', rotation: 5.498 },
    ],
  },
];

export const BENTO_STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS = [
  {
    id: 'trioCenter',
    label: 'Center Trio',
    placements: [
      { x: 0, z: -0.24, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.28, z: 0.20, type: 'center-blueberry-default', rotation: 0 },
      { x: -0.28, z: 0.20, type: 'center-mangoCube-default', rotation: 0 },
    ],
  },
  {
    id: 'petiteArc',
    label: 'Crescent Arc',
    placements: [
      { x: -0.65, z: -0.32, type: 'center-mangoCube-default', rotation: -0.5 },
      { x: -0.25, z: -0.62, type: 'center-blueberry-default', rotation: -0.2 },
      { x: 0.25, z: -0.62, type: 'center-strawberry-default', rotation: 0.2 },
      { x: 0.65, z: -0.32, type: 'center-blueberry-default', rotation: 0.5 },
    ],
  },
  {
    id: 'centerDiamond',
    label: 'Center Diamond',
    placements: [
      { x: 0, z: -0.42, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.42, z: 0, type: 'center-mangoCube-default', rotation: 1.571 },
      { x: 0, z: 0.42, type: 'center-blueberry-default', rotation: 3.142 },
      { x: -0.42, z: 0, type: 'center-mangoCube-default', rotation: 4.712 },
    ],
  },
  {
    id: 'berryCrown',
    label: 'Berry Crown',
    placements: [
      { x: -0.32, z: -0.22, type: 'center-strawberry-default', rotation: -0.2 },
      { x: 0.32, z: -0.22, type: 'center-strawberry-default', rotation: 0.2 },
      { x: -0.28, z: 0.30, type: 'center-mangoCube-default', rotation: 0 },
      { x: 0.28, z: 0.30, type: 'center-blueberry-default', rotation: 0 },
    ],
  },
  {
    id: 'petiteBlossom',
    label: 'Petite Blossom',
    placements: [
      { x: 0, z: 0, type: 'center-strawberry-default', rotation: 0 },
      { x: 0, z: -0.52, type: 'center-blueberry-default', rotation: 0 },
      { x: 0.50, z: 0, type: 'center-mangoCube-default', rotation: 1.571 },
      { x: 0, z: 0.52, type: 'center-blueberry-default', rotation: 3.142 },
      { x: -0.50, z: 0, type: 'center-mangoCube-default', rotation: 4.712 },
    ],
  },
  {
    id: 'harvestRing',
    label: 'Harvest Ring',
    placements: [
      { x: 0, z: -0.65, type: 'center-strawberry-default', rotation: 0 },
      { x: 0.56, z: -0.325, type: 'center-mangoCube-default', rotation: 1.047 },
      { x: 0.56, z: 0.325, type: 'center-blueberry-default', rotation: 2.094 },
      { x: 0, z: 0.65, type: 'center-strawberry-default', rotation: 3.142 },
      { x: -0.56, z: 0.325, type: 'center-mangoCube-default', rotation: 4.189 },
      { x: -0.56, z: -0.325, type: 'center-blueberry-default', rotation: 5.236 },
    ],
  },
];

export function getCenterVariations(structure = {}) {
  const isPetitsFour = isPetitsFourStructure(structure);
  const isBento = isBentoStructure(structure);

  if (isPetitsFour) {
    const isLarge = structure?.size === 'largeCube';
    const offset = isLarge ? 1.35 : 0.75;
    const pfSets = getPetitsFourVariationSets(offset);
    return [
      {
        id: 'strawberry',
        designId: 'strawberry',
        label: 'Strawberry',
        toolId: 'center-strawberry-default',
        sets: pfSets,
      },
      {
        id: 'blueberry',
        designId: 'blueberry',
        label: 'Blueberry',
        toolId: 'center-blueberry-default',
        sets: pfSets,
      },
      {
        id: 'mangoCube',
        designId: 'mangoCube',
        label: 'Mango Cube',
        toolId: 'center-mangoCube-default',
        sets: pfSets,
      },
    ];
  }

  return [
    {
      id: 'strawberry',
      designId: 'strawberry',
      label: 'Strawberry',
      toolId: 'center-strawberry-default',
      sets: isBento ? BENTO_STRAWBERRY_VARIATION_SETS : STRAWBERRY_VARIATION_SETS,
    },
    {
      id: 'blueberry',
      designId: 'blueberry',
      label: 'Blueberry',
      toolId: 'center-blueberry-default',
      sets: isBento ? BENTO_BLUEBERRY_VARIATION_SETS : BLUEBERRY_VARIATION_SETS,
    },
    {
      id: 'mangoCube',
      designId: 'mangoCube',
      label: 'Mango Cube',
      toolId: 'center-mangoCube-default',
      sets: isBento ? BENTO_MANGO_VARIATION_SETS : MANGO_VARIATION_SETS,
    },
    {
      id: 'strawberryAndBlueberry',
      label: 'Strawberry and Blueberry',
      toolId: 'center-strawberry-default',
      sets: isBento ? BENTO_STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS : STRAWBERRY_AND_BLUEBERRY_VARIATION_SETS,
    },
    {
      id: 'blueberryAndMango',
      label: 'Blueberry and Mango Cube',
      toolId: 'center-blueberry-default',
      sets: isBento ? BENTO_BLUEBERRY_AND_MANGO_VARIATION_SETS : BLUEBERRY_AND_MANGO_VARIATION_SETS,
    },
    {
      id: 'strawberryAndMango',
      label: 'Strawberry and Mango Cube',
      toolId: 'center-strawberry-default',
      sets: isBento ? BENTO_STRAWBERRY_AND_MANGO_VARIATION_SETS : STRAWBERRY_AND_MANGO_VARIATION_SETS,
    },
    {
      id: 'strawberryBlueberryAndMango',
      label: 'Strawberry, Blueberry, and Mango Cube',
      toolId: 'center-strawberry-default',
      sets: isBento ? BENTO_STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS : STRAWBERRY_BLUEBERRY_AND_MANGO_VARIATION_SETS,
    },
  ];
}

export const CENTER_VARIATIONS = getCenterVariations();

// Buttercream Text: individual hardened-buttercream letters, placed one at
// a time exactly like any other Center design above (same 'center-{id}-
// default' toolId format, same click-to-arm flow, same freeform placement
// + collision system in CakeScene.jsx). This is deliberately a *different*
// feature from Piping Text (center.text's Top/Middle/Bottom fixed lines,
// still built with TextGeometry curved to follow the dome) -- Piping Text
// stays fast to type but confined to three curved lines; Buttercream Text
// trades that speed for full freeform placement, letter by letter, mixed
// in with any other decoration since it's on the same collision map.
//
// Uppercase and Lowercase are two separate, explicitly-labeled design
// lists rather than one 'letter' set relying on the font's own glyph for
// whichever case gets typed -- Pacifico (the script font these are built
// with, see buildAndAddDecoration's letter branch in CakeScene.jsx) draws
// some capitals as essentially the same shape as their lowercase form
// (A, N, Z) while others are clearly distinct block capitals (B, D), so a
// single set mixing both cases looked like a random jumble of
// upper/lowercase rather than a deliberate choice. Splitting them lets the
// person explicitly pick "the capital B" vs "the lowercase b" instead of
// getting whatever the font happens to draw for a bare "B".
//
// designId is `letterUpper`/`letterLower` + the base letter (e.g.
// 'letterUpperA', 'letterLowerA') -- never contains a '-', same
// constraint as every other designId here. `char` is what's actually
// passed into TextGeometry (see CakeScene.jsx), so it carries the real
// case; `label` mirrors it for the button text.
function makeLetterEntry(baseChar, isUpper) {
  const designId = isUpper ? `letterUpper${baseChar}` : `letterLower${baseChar}`;
  const char = isUpper ? baseChar : baseChar.toLowerCase();
  return { designId, char, label: char, toolId: `center-${designId}-default` };
}
export const BUTTERCREAM_LETTERS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => makeLetterEntry(ch, true));
export const BUTTERCREAM_LETTERS_LOWER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => makeLetterEntry(ch, false));
// Combined list -- convenient for lookups that don't care which case a
// toolId belongs to (e.g. CenterSection.jsx resolving whatever's
// currently armed back to its design entry for the preview/label).
export const BUTTERCREAM_LETTERS = [...BUTTERCREAM_LETTERS_UPPER, ...BUTTERCREAM_LETTERS_LOWER];

export const BRACELET_BEADS_VARIATIONS = [
  { id: 'beadedTrim', label: 'Beaded Trim' },
  // Same underlying geometry as Beaded Trim (buildBeadedTrimRing in
  // DecorationSets.jsx), just a different bead-size rhythm per design —
  // see BEADED_TRIM_PATTERNS_DELUXE in CakeScene.jsx for how each id
  // maps to a pattern. Trio cycles Small → Big → Medium around the ring
  // rather than a straight Small → Medium → Big ramp — a repeating
  // ascending-size sequence reads as a lopsided gradient once it wraps
  // all the way around a circle, not a balanced pattern; breaking the
  // order keeps the eye from settling into "biggest bead is always three
  // spots after the smallest."
  // Kept here (not deleted with the rest of the Classic-only roster)
  // because BEADED_TRIM_VARIATIONS_DELUXE below spreads this in as its
  // own base set — Deluxe's own Beaded Trim options genuinely depend on
  // it, even though EdgeSection.jsx no longer imports it directly.
  { id: 'beadedTrimTrio', label: 'Trio Beaded Trim' },
  { id: 'beadedTrimPetite', label: 'Petite Beaded Trim' },
];

export const SCALLOPS_VARIATIONS = [
  { id: 'starScallop', label: 'Star Scallop' },
  { id: 'starScallopSoft', label: 'Soft Star Scallop' },
  { id: 'starScallopDollops', label: 'Scallop with Dollops' },
  { id: 'starScallopLayered', label: 'Layered Star Scallop' },
];

export const EDGE_DECORATION_SETS = [
  { id: 'curtain', label: 'Curtain' },
  ...BRACELET_BEADS_VARIATIONS,
];

// ─── Edge Design roster ────────────────────────────────────────────────
// This used to be labeled "Deluxe" and coexist with a separate Classic
// roster behind a toggle — Classic (SHELL_VARIATIONS, the old
// DOLLOPS_VARIATIONS, ROPE_TWIST_VARIATIONS, STANDALONE_EDGE_PIPING_
// OPTIONS, and the edge.designSet toggle itself) has been deleted; this
// is the only Edge Design roster now.

export const PIPING_TIPS_DELUXE = [
  ...PIPING_TIPS,
  { id: 'elongatedShell', label: 'Elongated Shell Border' },
];

export const BEADED_TRIM_VARIATIONS_DELUXE = [
  // Trio filtered out here rather than removed from BRACELET_BEADS_
  // VARIATIONS itself — that array is also spread into
  // EDGE_DECORATION_SETS elsewhere, so trimming it directly would remove
  // Trio from there too, which wasn't asked for.
  ...BRACELET_BEADS_VARIATIONS.filter((v) => v.id !== 'beadedTrimTrio'),
  { id: 'beadedTrimGrand', label: 'Grand Beaded Trim' },
  { id: 'beadedTrimMorseDotDashDot', label: 'Morse Dot-Dash-Dot' },
  { id: 'beadedTrimMorseDotDash', label: 'Morse Alternating' },
  { id: 'beadedTrimMorseDotDotDash', label: 'Morse Double-Dot Dash' },
];

export const BORDER_PIPING_SOLID_VARIATIONS = [
  { id: 'shell', label: 'Shell Border' },
  { id: 'reverseShell', label: 'Reverse Shell' },
  { id: 'bead', label: 'Bead Piping' },
  { id: 'ropeTwist', label: 'Rope Twist' },
  { id: 'ropeTwistClassic', label: 'Rope Twist Classic' },
  { id: 'elongatedShell', label: 'Elongated Shell Border' },
];

export const BORDER_PIPING_ALTERNATING_VARIATIONS = [
  { id: 'shellAlt', label: 'Shell Border - Alternating' },
  { id: 'reverseShellAlt', label: 'Reverse Shell - Alternating' },
  { id: 'beadAlt', label: 'Bead Piping - Alternating' },
  { id: 'ropeTwistAlt', label: 'Rope Twist - Alternating' },
  { id: 'ropeTwistClassicAlt', label: 'Rope Twist Classic - Alternating' },
  { id: 'elongatedShellAlt', label: 'Elongated Shell Border - Alternating' },
];

// Alternating variants need a second color (piping.secondaryColorId,
// already added to the edge default state above) — EdgeSection's Deluxe
// tab shows a second color picker whenever the active id ends in "Alt".
export const BORDER_PIPING_VARIATIONS_DELUXE = [
  ...BORDER_PIPING_SOLID_VARIATIONS,
  ...BORDER_PIPING_ALTERNATING_VARIATIONS,
];

export const DOLLOPS_SOLID_VARIATIONS_DELUXE = [
  { id: 'starDollopContinuous', label: 'Continuous Star Dollop' },
  { id: 'starDollop', label: 'Star Dollop' },
  { id: 'starDollopSparse', label: 'Sparse Star Dollop' },
  { id: 'roundDollop', label: 'Continuous Round Tip Dollop' },
  { id: 'roundDollopMedium', label: 'Round Tip Dollop' },
  { id: 'roundDollopSparse', label: 'Sparse Round Tip Dollop' },
];

export const DOLLOPS_SOLID_CHERRY_VARIATIONS_DELUXE = [
  { id: 'starDollopContinuousCherry', label: 'Continuous Star Dollop with Cherry' },
  { id: 'starDollopCherry', label: 'Star Dollop with Cherry' },
  { id: 'starDollopSparseCherry', label: 'Sparse Star Dollop with Cherry' },
  { id: 'roundDollopCherry', label: 'Continuous Round Tip Dollop with Cherry' },
  { id: 'roundDollopMediumCherry', label: 'Round Tip Dollop with Cherry' },
  { id: 'roundDollopSparseCherry', label: 'Sparse Round Tip Dollop with Cherry' },
];

export const DOLLOPS_ALTERNATING_VARIATIONS_DELUXE = [
  { id: 'starDollopContinuousAlt', label: 'Continuous Star Dollop - Alternating' },
  { id: 'starDollopAlt', label: 'Star Dollop - Alternating' },
  { id: 'starDollopSparseAlt', label: 'Sparse Star Dollop - Alternating' },
  { id: 'roundDollopAlt', label: 'Continuous Round Tip Dollop - Alternating' },
  { id: 'roundDollopMediumAlt', label: 'Round Tip Dollop - Alternating' },
  { id: 'roundDollopSparseAlt', label: 'Sparse Round Tip Dollop - Alternating' },
];

export const DOLLOPS_ALTERNATING_CHERRY_VARIATIONS_DELUXE = [
  { id: 'starDollopContinuousAltCherry', label: 'Continuous Star Dollop - Alternating with Cherry' },
  { id: 'starDollopAltCherry', label: 'Star Dollop - Alternating with Cherry' },
  { id: 'starDollopSparseAltCherry', label: 'Sparse Star Dollop - Alternating with Cherry' },
  { id: 'roundDollopAltCherry', label: 'Continuous Round Tip Dollop - Alternating with Cherry' },
  { id: 'roundDollopMediumAltCherry', label: 'Round Tip Dollop - Alternating with Cherry' },
  { id: 'roundDollopSparseAltCherry', label: 'Sparse Round Tip Dollop - Alternating with Cherry' },
];

export const DOLLOPS_VARIATIONS_DELUXE = [
  ...DOLLOPS_SOLID_VARIATIONS_DELUXE,
  ...DOLLOPS_SOLID_CHERRY_VARIATIONS_DELUXE,
  ...DOLLOPS_ALTERNATING_VARIATIONS_DELUXE,
  ...DOLLOPS_ALTERNATING_CHERRY_VARIATIONS_DELUXE,
];

export const WHIPPED_CREAM_SOLID_VARIATIONS = [
  { id: 'whippedCreamRosetteContinuous', label: 'Continuous Whipped Cream Rosettes' },
  { id: 'whippedCreamRosette', label: 'Whipped Cream Rosettes' },
];

export const WHIPPED_CREAM_ALTERNATING_VARIATIONS = [
  { id: 'whippedCreamRosetteContinuousAlt', label: 'Continuous Whipped Cream Rosettes - Alternating' },
  { id: 'whippedCreamRosetteAlt', label: 'Whipped Cream Rosettes - Alternating' },
];

export const WHIPPED_CREAM_CHERRY_VARIATIONS = [
  { id: 'whippedCreamRosetteContinuousCherry', label: 'Continuous Whipped Cream Rosettes with Cherry' },
  { id: 'whippedCreamRosetteCherry', label: 'Whipped Cream Rosettes with Cherry' },
];

export const WHIPPED_CREAM_VARIATIONS = [
  ...WHIPPED_CREAM_SOLID_VARIATIONS,
  ...WHIPPED_CREAM_ALTERNATING_VARIATIONS,
  ...WHIPPED_CREAM_CHERRY_VARIATIONS,
];

export const FRUIT_CONFECTION_RIM_OPTIONS = [
  { id: 'hersheysKissRim', label: "Hershey's Kisses Rim" },
  { id: 'hersheysKissRimSparse', label: 'Hershey and Ferrero' },
  { id: 'ferreroRocherRim', label: 'Ferrero Rocher Rim' },
  { id: 'ferreroRocherRimSparse', label: 'Ferrero and Cherry' },
  { id: 'cherryRim', label: 'Cherry Rim' },
  { id: 'cherryRimSparse', label: 'Cherry and Hershey' },
];

// Whipped Cream Rosettes' own Plain/With Cherry/With Strawberry blended
// together with Fruit / Confection Rim into one combined roster — same
// "one continuously-numbered row" treatment Border Piping and Dollops
// already got.
export const WHIPPED_CREAM_AND_RIM_VARIATIONS_DELUXE = [
  ...WHIPPED_CREAM_VARIATIONS,
  ...FRUIT_CONFECTION_RIM_OPTIONS,
];

export const EDGE_PIPING_OPTIONS = [...EDGE_DECORATION_SETS, ...PIPING_TIPS]
  .filter(({ id }) => !['curtain', 'star', 'round', 'leaf', 'lambeth'].includes(id));

// ─── Side treatments — the seven options for side.mode ─────────────────────
// Each is its own field in DEFAULT_CONFIG.side (not a nested "sets" list —
// see the Side comment above). Listed here purely so ToolPanel can render
// the mode-selector buttons and prices without hardcoding labels. Checkered
// Pattern and Triangle Pattern each price per-variant (6 each, see
// CHECKERED_PATTERN_SETS / TRIANGLE_PATTERN_SETS) rather than a flat price
// here. Formerly SIDE_DECORATION_SETS (Lace Wrap, Stripes, Scatter Pearls
// — previously free) + SIDE_NO_NAME_SETS (Tuxedo, Whipped Skirt, Drip) —
// merged into one roster since all seven now compete for the same "one
// treatment active at a time" slot.
export const CHEVRON_PATTERN_SETS = [
  { id: 'singleColor', label: 'Single Color', price: 105 },
  { id: 'twoTone', label: 'Two-Tone', price: 115 },
  { id: 'threeTone', label: 'Three-Tone', price: 115 },
  { id: 'wideZigzag', label: 'Wide Zigzag', price: 120 },
  { id: 'tightZigzag', label: 'Tight Zigzag', price: 130 },
  { id: 'singleColorGapped', label: 'Single Color, Gapped', price: 95 }, // Single Color's own 5-row layout with rows 2 & 4 removed — see buildChevronSideStripes in DecorationSets.jsx
];

export const SCATTER_PEARLS_SETS = [
  { id: 'randomScatter', label: 'Random Scatter', price: 95 },
  { id: 'diamondGrid', label: 'Diamond Grid', price: 105 },
  { id: 'horizontalRows', label: 'Horizontal Rows', price: 100 },
  { id: 'diamondGridBorder', label: 'Diamond Grid Border', price: 90 }, // Diamond Grid's row 1 & row 4 only (its own 2nd/3rd rows removed) — see buildScatterPearlsRing in DecorationSets.jsx
  { id: 'bigPearlsScatter', label: 'Big Pearls Scatter', price: 115 }, // same scatter placement as Random Scatter, big pearls only
  { id: 'smallPearlsScatter', label: 'Small Pearls Scatter', price: 90 }, // same scatter placement as Random Scatter, small pearls only
];

export const PIPING_SCROLLS_SETS = [
  { id: 'waveRope', label: 'Continuous Wave Rope', price: 105 },
  { id: 'pairedScrolls', label: 'Paired Opposing Scrolls', price: 110 },
  { id: 'fleurDeLisRow', label: 'Fleur-de-lis Row', price: 115 },
  { id: 'shellBorderRow', label: 'Shell Border Row', price: 110 },
  { id: 'vineAndTendrils', label: 'Vine and Tendrils', price: 120 },
  { id: 'loopChain', label: 'Interlocking Loop Chain', price: 115 },
];

// Sunshine Play — replaces Fondant Swag, Stripes, and Tuxedo. Unlike those
// (and unlike every other Side treatment, which wraps the whole wall or
// tiles around it), each Sunshine Play design is an accent piece
// stuck to the side — see buildSunshinePlay in
// sets/sunshinePlayHelpers.js. Star Burst and Cloudy Chump respect Color
// Override for buttercream coloring; Rainbow Arc has its own fixed rainbow
// palette and ignores it — see SideSection.jsx's colorOverrideDisabled,
// which is keyed off exactly that.
export const SUNSHINE_PLAY_SETS = [
  { id: 'rainbowArc', label: 'Rainbow Arc', price: 140 }, // hardened buttercream rainbow with cloud puffs at its feet
  { id: 'cloudyChump', label: 'Cloudy Champ', price: 130 }, // randomized clouds only
  { id: 'starBurst', label: 'Star Burst', price: 125 }, // scattered buttercream stars hugging the cake side
  { id: 'skyChumps', label: 'Sky Chumps', price: 145 }, // combination of stars and clouds only
  { id: 'sunshineStars', label: 'Sunshine Stars', price: 155 }, // combination of rainbow and stars only
  { id: 'starrySunshinePlay', label: 'Starry Sunshine Play', price: 180 }, // Starry Sunshine Play with assorted star colors
];

export const VICTORIAN_LAMBETH_SETS = [
  { id: 'classic', label: 'Classic', price: 150 },
  { id: 'noRosette', label: 'No Rosette', price: 125 }, // Classic with the rosette (petals), its top border rope, and the rope below that removed — see buildVictorianLambeth in victorianLambethHelpers.js
  { id: 'ropesOnly', label: 'Ropes Only', price: 100 }, // Classic with everything removed except the four rope tiers and every pearl connected to them (the anchor pearl and the low pearl) — see buildVictorianLambeth in victorianLambethHelpers.js
  { id: 'noRopes', label: 'No Ropes', price: 130 }, // Classic with the four rope tiers and the low pearl removed — the exact complement of Ropes Only — see buildVictorianLambeth in victorianLambethHelpers.js
  { id: 'doubleBand', label: 'Double Band', price: 175 }, // No Ropes' design (minus the fleur-de-lis) repeated twice — a top band and a bottom band — see buildVictorianLambeth in victorianLambethHelpers.js
  { id: 'tripleBand', label: 'Triple Band', price: 210 }, // Double Band with a third row added (alternating stagger continues: aligned, offset, aligned), plus fleur-de-lis filling the gaps between rows — see buildVictorianLambeth in victorianLambethHelpers.js
];

export const SIDE_TREATMENTS = [
  { id: 'checkeredPattern', label: 'Checkered Pattern' }, // priced per-variant, see CHECKERED_PATTERN_SETS
  { id: 'trianglePattern', label: 'Triangle Pattern' }, // priced per-variant, see TRIANGLE_PATTERN_SETS
  { id: 'chevronPattern', label: 'Chevron Pattern' }, // priced per-variant, see CHEVRON_PATTERN_SETS
  { id: 'scatterPearls', label: 'Scatter Pearls' }, // priced per-variant, see SCATTER_PEARLS_SETS
  { id: 'pipingScrolls', label: 'Piping Scrolls' }, // priced per-variant, see PIPING_SCROLLS_SETS
  { id: 'sunshinePlay', label: 'Sunshine Play' }, // priced per-variant, see SUNSHINE_PLAY_SETS — replaces Fondant Swag/Stripes/Tuxedo
  { id: 'victorianLambeth', label: 'Victorian Lambeth' }, // priced per-variant, see VICTORIAN_LAMBETH_SETS
];

// ─── Predefined Top-Surface Placement Slots ────────────────────────────────
export const SLOT_RINGS = [
  { id: 'center', label: 'Center', total: 1, radiusRatio: 0 },
  { id: 'inner', label: 'Inner Ring', total: 8, radiusRatio: 0.38 },
  { id: 'outer', label: 'Outer Ring', total: 12, radiusRatio: 0.68 },
];

export const TOP_SURFACE_SLOTS = [
  // Center (1 slot)
  { id: 'center-0', ring: 'center', ringLabel: 'Center', index: 0, radiusRatio: 0, angle: 0 },
  // Inner Ring (8 slots)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `inner-${i}`,
    ring: 'inner',
    ringLabel: 'Inner Ring',
    index: i,
    radiusRatio: 0.38,
    angle: i * ((Math.PI * 2) / 8),
  })),
  // Outer Ring (12 slots)
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `outer-${i}`,
    ring: 'outer',
    ringLabel: 'Outer Ring',
    index: i,
    radiusRatio: 0.68,
    angle: i * ((Math.PI * 2) / 12),
  })),
];

export const PLACEABLE_DECORATIONS = [
  { id: 'cherry', label: 'Cherry', emoji: '🍒', price: 3, description: 'Glossy red cherry with stem' },
  { id: 'strawberry', label: 'Strawberry', emoji: '🍓', price: 4, description: 'Fresh ripe strawberry with leaf crown' },
  { id: 'candle', label: 'Candle', emoji: '🕯️', price: 4, description: 'Celebration candle with glowing flame' },
  { id: 'chocolateChip', label: 'Choc Chip', emoji: '🍫', price: 2, description: 'Rich chocolate morsel' },
  { id: 'rosette', label: 'Rosette', emoji: '🌹', price: 5, description: 'Piped buttercream flower' },
  { id: 'piping', label: 'Piping Stamp', emoji: '🌀', price: 5, description: 'Decoratively piped swirl accent' },
];

// Footprint radius (local cake-group units, 1 unit = 2 real inches) for each
// Place-tab item — the freeform-placement analog of centerItemRadii/
// DECORATION_SPACING in CakeScene.jsx. Used to reject a drop that would
// overlap an already-placed item, instead of forcing every item onto one
// of the old fixed TOP_SURFACE_SLOTS ring positions. This is the single
// source of truth for these numbers — CakeScene.jsx (collision + ghost
// preview) and PlaceSection.jsx (UI hints) both read from here rather than
// keeping their own copies.
export const PLACE_ITEM_RADII = {
  cherry: 0.50,
  strawberry: 0.62,
  blueberry: 0.45,
  mangoCube: 0.45,
  mango: 0.45,
  candle: 0.38,
  chocolateChip: 0.30,
  rosette: 0.75,
  piping: 0.70,
};

export function getSlotById(slotId) {
  return TOP_SURFACE_SLOTS.find(s => s.id === slotId) || null;
}

export function computeSlotPosition(slot, topRadius) {
  if (!slot) return { x: 0, z: 0 };
  const r = slot.radiusRatio * topRadius;
  return {
    x: Math.cos(slot.angle) * r,
    z: Math.sin(slot.angle) * r,
  };
}
