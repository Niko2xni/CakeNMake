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
// color content (Default / Color Override) lives under Fundamentals as
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
    size: 'big', // 'big' (8×5) | 'small' (6×5)
    layers: 1, // 1 or 2
    layerDesign: 'uniform', // 'uniform' | 'individual'
  },
  realSize: {
    diameter: 8,
    height: 5
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
    flavorColorId: 'vanilla',
    overrideColorId: 'red',
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
  },

  // 5. Center — top surface. Decorations and Text are mutually EXCLUSIVE
  // (genuine delete, not disable-preserve — see spec §4b): picking one
  // clears the other's stored value. `mode` tracks which is active.
  center: {
    mode: null, // 'decorations' | 'text' | null
    decorations: { setId: null, variation: 'outerRing', colorId: 'vanilla' },
    text: { top: '', middle: '', bottom: '', font: 'script' },
  },

  // 6. Edge — top edge / bottom edge trim. Top+Bottom-separate and Both are
  // mutually EXCLUSIVE (genuine delete — see spec §4b): picking a Set in
  // Both clears Top/Bottom individually, and vice versa. `mode` tracks
  // which is currently active; the other's stored values are cleared, not
  // just hidden.
  edge: {
    mode: 'both', // 'topBottomSeparate' | 'both'
    top:    { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red' } },
    bottom: { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red' } },
    both:   { decorations: { setId: null, colorId: 'vanilla' }, piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red' } },
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
    chevronPattern: { setId: 'multiColor', colorId: 'vanilla' },
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
  { id: 'fullyFrosted', label: 'Fully Frosted', description: 'Entire cake covered' },
  { id: 'texturedButtercream', label: 'Textured Buttercream', description: 'Ridged, hand-applied coat' },
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
export const SIZE_OPTIONS = [
  { id: 'big', label: '8×5', dimensions: { diameter: 8, height: 5 } },
  { id: 'small', label: '6×5', dimensions: { diameter: 6, height: 5 } },
];

// Layer options
export const LAYER_OPTIONS = [
  { id: 1, label: '1 Layer' },
  { id: 2, label: '2 Layers' },
];

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
  { id: 'ropeTwistClassic', label: 'Rope Twist (Classic)' },
  { id: 'shellAlt', label: 'Shell Border - Alternating' },
  { id: 'reverseShellAlt', label: 'Reverse Shell - Alternating' },
  { id: 'beadAlt', label: 'Bead Piping - Alternating' },
  { id: 'ropeTwistAlt', label: 'Rope Twist - Alternating' },
  { id: 'ropeTwistClassicAlt', label: 'Rope Twist (Classic) - Alternating' },
  { id: 'round', label: 'Round' },
  { id: 'petal', label: 'Petal' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'dropFlower', label: 'Drop Flower' },
  { id: 'lambeth', label: 'Lambeth Method' },
  { id: 'starDollopContinuous', label: 'Continuous Star Dollop (20 pc)' },
  { id: 'starDollop', label: 'Star Dollop (12 pc)' },
  { id: 'starDollopSparse', label: 'Sparse Star Dollop (8 pc)' },
  { id: 'roundDollop', label: 'Continuous Round Tip Dollop (20 pc)' },
  { id: 'roundDollopMedium', label: 'Round Tip Dollop (12 pc)' },
  { id: 'roundDollopSparse', label: 'Sparse Round Tip Dollop (8 pc)' },
  { id: 'kissDollop', label: 'Continuous Kisses Dollop (20 pc)' },
  { id: 'kissDollopMedium', label: 'Kisses Dollop (12 pc)' },
  { id: 'kissDollopSparse', label: 'Sparse Kisses Dollop (8 pc)' },
  { id: 'starDollopContinuousCherry', label: 'Continuous Star Dollop (20 pc) with Cherry' },
  { id: 'starDollopCherry', label: 'Star Dollop (12 pc) with Cherry' },
  { id: 'starDollopSparseCherry', label: 'Sparse Star Dollop (8 pc) with Cherry' },
  { id: 'roundDollopCherry', label: 'Continuous Round Tip Dollop (20 pc) with Cherry' },
  { id: 'roundDollopMediumCherry', label: 'Round Tip Dollop (12 pc) with Cherry' },
  { id: 'roundDollopSparseCherry', label: 'Sparse Round Tip Dollop (8 pc) with Cherry' },
  { id: 'kissDollopCherry', label: 'Continuous Kisses Dollop (20 pc) with Cherry' },
  { id: 'kissDollopMediumCherry', label: 'Kisses Dollop (12 pc) with Cherry' },
  { id: 'kissDollopSparseCherry', label: 'Sparse Kisses Dollop (8 pc) with Cherry' },
  { id: 'starDollopContinuousAlt', label: 'Continuous Star Dollop (20 pc) - Alternating' },
  { id: 'starDollopAlt', label: 'Star Dollop (12 pc) - Alternating' },
  { id: 'starDollopSparseAlt', label: 'Sparse Star Dollop (8 pc) - Alternating' },
  { id: 'roundDollopAlt', label: 'Continuous Round Tip Dollop (20 pc) - Alternating' },
  { id: 'roundDollopMediumAlt', label: 'Round Tip Dollop (12 pc) - Alternating' },
  { id: 'roundDollopSparseAlt', label: 'Sparse Round Tip Dollop (8 pc) - Alternating' },
  { id: 'kissDollopAlt', label: 'Continuous Kisses Dollop (20 pc) - Alternating' },
  { id: 'kissDollopMediumAlt', label: 'Kisses Dollop (12 pc) - Alternating' },
  { id: 'kissDollopSparseAlt', label: 'Sparse Kisses Dollop (8 pc) - Alternating' },
  { id: 'starDollopContinuousAltCherry', label: 'Continuous Star Dollop (20 pc) - Alternating with Cherry' },
  { id: 'starDollopAltCherry', label: 'Star Dollop (12 pc) - Alternating with Cherry' },
  { id: 'starDollopSparseAltCherry', label: 'Sparse Star Dollop (8 pc) - Alternating with Cherry' },
  { id: 'roundDollopAltCherry', label: 'Continuous Round Tip Dollop (20 pc) - Alternating with Cherry' },
  { id: 'roundDollopMediumAltCherry', label: 'Round Tip Dollop (12 pc) - Alternating with Cherry' },
  { id: 'roundDollopSparseAltCherry', label: 'Sparse Round Tip Dollop (8 pc) - Alternating with Cherry' },
  { id: 'kissDollopAltCherry', label: 'Continuous Kisses Dollop (20 pc) - Alternating with Cherry' },
  { id: 'kissDollopMediumAltCherry', label: 'Kisses Dollop (12 pc) - Alternating with Cherry' },
  { id: 'kissDollopSparseAltCherry', label: 'Sparse Kisses Dollop (8 pc) - Alternating with Cherry' },
  { id: 'starScallop', label: 'Star Scallop' },
  { id: 'starScallopSoft', label: 'Soft Star Scallop' },
  { id: 'starScallopDollops', label: 'Scallop with Dollops' },
  { id: 'starScallopLayered', label: 'Layered Star Scallop' },
  { id: 'whippedCreamRosetteContinuous', label: 'Whipped Cream Rosettes (Continuous)' },
  { id: 'whippedCreamRosette', label: 'Whipped Cream Rosettes (12 pc)' },
  { id: 'whippedCreamRosetteSparse', label: 'Whipped Cream Rosettes (Sparse)' },
  { id: 'whippedCreamRosetteContinuousCherry', label: 'Whipped Cream Rosettes with Cherry (Continuous)' },
  { id: 'whippedCreamRosetteCherry', label: 'Whipped Cream Rosettes with Cherry (12 pc)' },
  { id: 'whippedCreamRosetteSparseCherry', label: 'Sparse Whipped Cream Rosettes with Cherry (8 pc)' },
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
//   4. Pattern/multi-tone (5) — whole-surface patterns, not flat colors;
//      `implemented: false` means not rendered yet, not "can't be" — same
//      cake mesh, just no code reads these ids yet (see `swatchCss`/
//      `metallic` for how the picker itself still shows something distinct)
export const SUGAR_COLORS = [
  // Flavor-mirror — tagged isFlavorMirror so SugarColorSection.jsx can
  // exclude them from Color Override's own palette (picking "Color
  // Override → Vanilla" is redundant with what Default mode already gives
  // you from Exterior Finish's flavor) without duplicating this id list in
  // a second file. Everything else that reads SUGAR_COLORS — Default's own
  // preview swatch, SetPicker/Center/Place's decoration and piping color
  // grids, and every `colorId: 'vanilla'` default elsewhere in this file —
  // is unaffected and still sees these six normally.
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
    id: 'marble', label: 'Marble', hex: '#D8D8D8', price: 100, implemented: false,
    swatchCss: 'linear-gradient(135deg, #2B2B2B 0%, #FBFBF8 35%, #2B2B2B 60%, #FBFBF8 100%)',
  },
  {
    id: 'ombre', label: 'Ombré', hex: '#C7B7EA', price: 100, implemented: false,
    swatchCss: 'linear-gradient(180deg, #F5A9C0 0%, #C7B7EA 50%, #A6D8EA 100%)',
  },
  {
    id: 'rainbowSwirl', label: 'Rainbow Swirl', hex: '#E8A9D8', price: 100, implemented: false,
    swatchCss: 'conic-gradient(from 0deg, #E24B4A, #EF9F27, #97C459, #378ADD, #7F77DD, #E24B4A)',
  },
  {
    id: 'goldShimmer', label: 'Gold Shimmer', hex: '#D4AF37', price: 100, implemented: false,
    metallic: true, // needs metalness/roughness tuning, not just a flat/gradient color
  },
  {
    id: 'watercolorPastel', label: 'Watercolor Pastel Mix', hex: '#EAD9EA', price: 100, implemented: false,
    swatchCss: 'linear-gradient(120deg, #F5A9C0 0%, #A6D8EA 35%, #FAEEDA 70%, #C7EAD8 100%)',
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
  { id: 'default', label: 'Default', implemented: true },
  { id: 'colorOverride', label: 'Color Override', implemented: true },
];

// ─── Surface Treatment modes — combinable overlay layers, independent of
// both Sugar Color (a color choice) and Exterior Finish's `style` (the
// base coat itself). Textured Buttercream used to live here too, but it
// turned out to be an alternate base coat, not an overlay — it moved to
// FINISH_STYLES/exteriorFinish.style instead (see that field's comment in
// DEFAULT_CONFIG). Kept as a list (not a single flag) since more
// combinable overlays are expected to join Glaze eventually.
export const SURFACE_TREATMENT_MODES = [
  { id: 'glaze', label: 'Glaze', implemented: true },
];

// ─── Glaze Patterns — six variants of the poured-and-dripping silhouette
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
  { id: 'parallelOuter', label: 'Parallel Lines — Outer', price: 100 },
  { id: 'parallelInner', label: 'Parallel Lines — Inner', price: 100 },
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
  { id: 'parallelOuter', label: 'Parallel Lines — Outer', price: 100 },
  { id: 'parallelInner', label: 'Parallel Lines — Inner', price: 100 },
];

// ─── Starter Set rosters (PLACEHOLDER CONTENT) ─────────────────────────────
// These are NOT final designs — no actual named Sets beyond illustrative
// examples ("Curtain," etc.) were ever specified. This is a minimal,
// clearly-flagged starting roster so each SetPicker has something to
// render and the data flow can be built/tested end-to-end. Real Set
// geometry (see pipingTips.js for the level of care each one needs) is
// follow-on content work, not part of this pass.

export const CENTER_DECORATION_SETS = [
  { id: 'floralCluster', label: 'Floral Rosette' },
  { id: 'strawberry', label: 'Strawberry' },
  { id: 'cherry', label: 'Cherry' },
  { id: 'ferreroRocher', label: 'Ferrero Rocher' },
  { id: 'hersheysKisses', label: "Hershey's Kisses" },
  { id: 'oreo', label: 'Oreo' },
  { id: 'chocolateBear', label: 'Chocolate Bear' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'soccerball', label: 'Soccer Ball' },
];

export const SINGLE_ITEM_DECORATION_SETS = CENTER_DECORATION_SETS;

export const CENTER_DECORATION_VARIATIONS = [
  { id: 'fullFill', label: 'Full Surface Fill' },
  { id: 'outerRing', label: 'Outer Ring' },
  { id: 'single', label: 'Single Centerpiece' },
  { id: 'crescent', label: 'Crescent Arc' },
  { id: 'cluster', label: 'Offset Cluster' },
  { id: 'diagonal', label: 'Diagonal Stripe' },
];

export const WHIPPED_CREAM_SOLID_VARIATIONS = [
  { id: 'whippedCreamRosetteContinuous', label: 'Whipped Cream Rosettes (Continuous ~20 pc)' },
  { id: 'whippedCreamRosette', label: 'Whipped Cream Rosettes (12 pc)' },
  { id: 'whippedCreamRosetteSparse', label: 'Sparse Whipped Cream Rosettes (8 pc)' },
];

export const WHIPPED_CREAM_CHERRY_VARIATIONS = [
  { id: 'whippedCreamRosetteContinuousCherry', label: 'Whipped Cream Rosettes with Cherry (Continuous ~20 pc)' },
  { id: 'whippedCreamRosetteCherry', label: 'Whipped Cream Rosettes with Cherry (12 pc)' },
  { id: 'whippedCreamRosetteSparseCherry', label: 'Sparse Whipped Cream Rosettes with Cherry (8 pc)' },
];

export const WHIPPED_CREAM_VARIATIONS = [
  ...WHIPPED_CREAM_SOLID_VARIATIONS,
  ...WHIPPED_CREAM_CHERRY_VARIATIONS,
];

export const BRACELET_BEADS_VARIATIONS = [
  { id: 'beadedTrim', label: 'Beaded Trim' },
  // Same underlying geometry as Beaded Trim (buildBeadedTrimRing in
  // DecorationSets.jsx), just a different bead-size rhythm per design —
  // see BEADED_TRIM_PATTERNS in CakeScene.jsx for how each id maps to a
  // pattern. Trio cycles Small → Big → Medium around the ring rather than
  // a straight Small → Medium → Big ramp — a repeating ascending-size
  // sequence reads as a lopsided gradient once it wraps all the way
  // around a circle, not a balanced pattern; breaking the order keeps
  // the eye from settling into "biggest bead is always three spots after
  // the smallest."
  { id: 'beadedTrimTrio', label: 'Trio Beaded Trim' },
  { id: 'beadedTrimPetite', label: 'Petite Beaded Trim' },
];

export const DOLLOPS_SOLID_VARIATIONS = [
  { id: 'starDollopContinuous', label: 'Continuous Star Dollop (20 pc)' },
  { id: 'starDollop', label: 'Star Dollop (12 pc)' },
  { id: 'starDollopSparse', label: 'Sparse Star Dollop (8 pc)' },
  { id: 'roundDollop', label: 'Continuous Round Tip Dollop (20 pc)' },
  { id: 'roundDollopMedium', label: 'Round Tip Dollop (12 pc)' },
  { id: 'roundDollopSparse', label: 'Sparse Round Tip Dollop (8 pc)' },
  { id: 'kissDollop', label: 'Continuous Kisses Dollop (20 pc)' },
  { id: 'kissDollopMedium', label: 'Kisses Dollop (12 pc)' },
  { id: 'kissDollopSparse', label: 'Sparse Kisses Dollop (8 pc)' },
];

export const DOLLOPS_SOLID_CHERRY_VARIATIONS = [
  { id: 'starDollopContinuousCherry', label: 'Continuous Star Dollop (20 pc) with Cherry' },
  { id: 'starDollopCherry', label: 'Star Dollop (12 pc) with Cherry' },
  { id: 'starDollopSparseCherry', label: 'Sparse Star Dollop (8 pc) with Cherry' },
  { id: 'roundDollopCherry', label: 'Continuous Round Tip Dollop (20 pc) with Cherry' },
  { id: 'roundDollopMediumCherry', label: 'Round Tip Dollop (12 pc) with Cherry' },
  { id: 'roundDollopSparseCherry', label: 'Sparse Round Tip Dollop (8 pc) with Cherry' },
  { id: 'kissDollopCherry', label: 'Continuous Kisses Dollop (20 pc) with Cherry' },
  { id: 'kissDollopMediumCherry', label: 'Kisses Dollop (12 pc) with Cherry' },
  { id: 'kissDollopSparseCherry', label: 'Sparse Kisses Dollop (8 pc) with Cherry' },
];

export const DOLLOPS_ALTERNATING_VARIATIONS = [
  { id: 'starDollopContinuousAlt', label: 'Continuous Star Dollop (20 pc) - Alternating' },
  { id: 'starDollopAlt', label: 'Star Dollop (12 pc) - Alternating' },
  { id: 'starDollopSparseAlt', label: 'Sparse Star Dollop (8 pc) - Alternating' },
  { id: 'roundDollopAlt', label: 'Continuous Round Tip Dollop (20 pc) - Alternating' },
  { id: 'roundDollopMediumAlt', label: 'Round Tip Dollop (12 pc) - Alternating' },
  { id: 'roundDollopSparseAlt', label: 'Sparse Round Tip Dollop (8 pc) - Alternating' },
  { id: 'kissDollopAlt', label: 'Continuous Kisses Dollop (20 pc) - Alternating' },
  { id: 'kissDollopMediumAlt', label: 'Kisses Dollop (12 pc) - Alternating' },
  { id: 'kissDollopSparseAlt', label: 'Sparse Kisses Dollop (8 pc) - Alternating' },
];

export const DOLLOPS_ALTERNATING_CHERRY_VARIATIONS = [
  { id: 'starDollopContinuousAltCherry', label: 'Continuous Star Dollop (20 pc) - Alternating with Cherry' },
  { id: 'starDollopAltCherry', label: 'Star Dollop (12 pc) - Alternating with Cherry' },
  { id: 'starDollopSparseAltCherry', label: 'Sparse Star Dollop (8 pc) - Alternating with Cherry' },
  { id: 'roundDollopAltCherry', label: 'Continuous Round Tip Dollop (20 pc) - Alternating with Cherry' },
  { id: 'roundDollopMediumAltCherry', label: 'Round Tip Dollop (12 pc) - Alternating with Cherry' },
  { id: 'roundDollopSparseAltCherry', label: 'Sparse Round Tip Dollop (8 pc) - Alternating with Cherry' },
  { id: 'kissDollopAltCherry', label: 'Continuous Kisses Dollop (20 pc) - Alternating with Cherry' },
  { id: 'kissDollopMediumAltCherry', label: 'Kisses Dollop (12 pc) - Alternating with Cherry' },
  { id: 'kissDollopSparseAltCherry', label: 'Sparse Kisses Dollop (8 pc) - Alternating with Cherry' },
];

export const DOLLOPS_VARIATIONS = [
  ...DOLLOPS_SOLID_VARIATIONS,
  ...DOLLOPS_SOLID_CHERRY_VARIATIONS,
  ...DOLLOPS_ALTERNATING_VARIATIONS,
  ...DOLLOPS_ALTERNATING_CHERRY_VARIATIONS,
];

export const SCALLOPS_VARIATIONS = [
  { id: 'starScallop', label: 'Star Scallop' },
  { id: 'starScallopSoft', label: 'Soft Star Scallop' },
  { id: 'starScallopDollops', label: 'Scallop with Dollops' },
  { id: 'starScallopLayered', label: 'Layered Star Scallop' },
];

export const ROPE_TWIST_VARIATIONS = [
  { id: 'ropeTwist', label: 'Rope Twist' },
  { id: 'ropeTwistClassic', label: 'Rope Twist (Classic)' },
];

export const SHELL_VARIATIONS = [
  { id: 'shell', label: 'Shell Border' },
  { id: 'reverseShell', label: 'Reverse Shell' },
];

export const BORDER_PIPING_SOLID_VARIATIONS = [
  { id: 'shell', label: 'Shell Border' },
  { id: 'reverseShell', label: 'Reverse Shell' },
  { id: 'bead', label: 'Bead Piping' },
  { id: 'ropeTwist', label: 'Rope Twist' },
  { id: 'ropeTwistClassic', label: 'Rope Twist (Classic)' },
];

export const BORDER_PIPING_ALTERNATING_VARIATIONS = [
  { id: 'shellAlt', label: 'Shell Border - Alternating' },
  { id: 'reverseShellAlt', label: 'Reverse Shell - Alternating' },
  { id: 'beadAlt', label: 'Bead Piping - Alternating' },
  { id: 'ropeTwistAlt', label: 'Rope Twist - Alternating' },
  { id: 'ropeTwistClassicAlt', label: 'Rope Twist (Classic) - Alternating' },
];

export const BORDER_PIPING_VARIATIONS = [
  ...BORDER_PIPING_SOLID_VARIATIONS,
  ...BORDER_PIPING_ALTERNATING_VARIATIONS,
];

export const STANDALONE_EDGE_PIPING_OPTIONS = PIPING_TIPS
  .filter(({ id }) => ['rope', 'petal', 'dropFlower'].includes(id));

export const EDGE_DECORATION_SETS = [
  { id: 'curtain', label: 'Curtain' },
  ...BRACELET_BEADS_VARIATIONS,
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
  { id: 'multiColor', label: 'Multi-Color', price: 125 },
  { id: 'singleColor', label: 'Single Color', price: 105 },
  { id: 'twoTone', label: 'Two-Tone', price: 115 },
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
  { id: 'assortedStarBurst', label: 'Assorted Star Burst', price: 135 }, // scattered buttercream stars in assorted colors
  { id: 'starryRainbow', label: 'Starry Rainbow', price: 170 }, // combination of Rainbow Arc, Cloudy Champ, and Star Burst
  { id: 'assortedStarryRainbow', label: 'Assorted Starry Rainbow', price: 180 }, // Starry Rainbow with assorted star colors
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