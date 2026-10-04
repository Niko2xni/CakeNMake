// lib/aiCakeToolSchemas.js
//
// Shared tool catalog: the executor imports this file and the backend
// generator converts it to CommonJS. Enum values follow cakeConfig.
//
// It reads live off lib/cakeConfig.js / lib/cakeFlavors.js — copies of
// the exact same files the frontend uses (see note below) — so the tool
// schema can never silently drift from the real option catalog.
//
// The EXECUTOR (applyCakeAiTool, which actually mutates the cake config)
// stays frontend-only, in src/lib/aiCakeTools.js — it calls the React
// onChange setter directly, which has no meaning on a server. Don't try
// to move it here.
//
// ── Keeping this in sync ────────────────────────────────────────────
// lib/cakeConfig.js and lib/cakeFlavors.js in THIS backend repo must be
// byte-identical to src/lib/cakeConfig.js / src/lib/cakeFlavors.js in the
// frontend repo. Whenever you add/change an option in the frontend copy
// (new SIDE_TREATMENTS entry, new SUGAR_COLORS swatch, etc.), copy the
// same file over here too, or the AI will either not know about new
// options or (worse) offer options that no longer exist. If these two
// repos are ever merged into one workspace, promote both files to a
// shared package instead and import from there in both places — that
// removes this manual-copy step entirely.

const {
  SIZE_OPTIONS,
  LAYER_OPTIONS,
  FINISH_STYLES,
  BUTTERCREAM_TEXTURES,
  FILLING_LAYER_OPTIONS,
  FILLING_PIPING_DESIGNS,
  SUGAR_COLORS,
  SUGAR_COLOR_MODES,
  GLAZE_PATTERNS,
  SIDE_TREATMENTS,
  CHECKERED_PATTERN_SETS,
  TRIANGLE_PATTERN_SETS,
  CHEVRON_PATTERN_SETS,
  SCATTER_PEARLS_SETS,
  PIPING_SCROLLS_SETS,
  SUNSHINE_PLAY_SETS,
  VICTORIAN_LAMBETH_SETS,
  CENTER_PLACEABLE_DESIGNS,
  TOP_SURFACE_SLOTS,
} = require('./cakeConfig');
const { FLAVOR_ORDER, FROSTING_FILLING_FLAVOR_ORDER } = require('./cakeFlavors');

const ids = (arr, key = 'id') => arr.map((o) => o[key]);

const CAKE_AI_TOOLS = [
  {
    name: 'set_structure',
    description: 'Change the cake size and/or number of tiers.',
    input_schema: {
      type: 'object',
      properties: {
        size: { type: 'string', enum: ids(SIZE_OPTIONS) },
        layers: { type: 'integer', enum: ids(LAYER_OPTIONS) },
      },
    },
  },
  {
    name: 'set_sponge_flavor',
    description: 'Change the sponge (cake base) flavor. Whole-cake only.',
    input_schema: {
      type: 'object',
      properties: { flavor: { type: 'string', enum: FLAVOR_ORDER } },
      required: ['flavor'],
    },
  },
  {
    name: 'set_filling',
    description: "Enable/disable filling, set its layer count and/or flavor. Filling and Sponge Flavor only apply while Exterior Finish's style is 'naked'.",
    input_schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        layers: { type: 'integer', enum: ids(FILLING_LAYER_OPTIONS) },
        flavor: { type: 'string', enum: FROSTING_FILLING_FLAVOR_ORDER },
        pipingDesign: { type: 'string', enum: [...ids(FILLING_PIPING_DESIGNS), 'none'] },
      },
    },
  },
  {
    name: 'set_exterior_finish',
    description: 'Change the base coating style, its eating flavor, and (for Textured Buttercream) which texture variant.',
    input_schema: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ids(FINISH_STYLES) },
        flavor: { type: 'string', enum: FROSTING_FILLING_FLAVOR_ORDER },
        buttercreamTexture: { type: 'string', enum: ids(BUTTERCREAM_TEXTURES) },
      },
    },
  },
  {
    name: 'set_sugar_color',
    description: "Change what the coating looks like: 'default' matches the flavor's natural color, 'colorOverride' picks a flat color via colorId. Applies to the whole-cake exterior finish color (use the `context` field to target Filling, Side, or Glaze/Surface color instead).",
    input_schema: {
      type: 'object',
      properties: {
        context: { type: 'string', enum: ['exterior', 'filling', 'side', 'surface'], description: 'Which region this color applies to. Defaults to exterior.' },
        mode: { type: 'string', enum: ids(SUGAR_COLOR_MODES) },
        colorId: { type: 'string', enum: ids(SUGAR_COLORS) },
      },
    },
  },
  {
    name: 'set_surface_treatment',
    description: 'Turn Glaze on/off and pick its drip pattern. Glaze can be combined with any Exterior Finish style.',
    input_schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        pattern: { type: 'string', enum: ids(GLAZE_PATTERNS) },
      },
    },
  },
  {
    name: 'set_side_treatment',
    description: 'Set the vertical side-wall treatment (only one is active at a time) and its variant/set.',
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: [...ids(SIDE_TREATMENTS), 'none'] },
        setId: {
          type: 'string',
          description: 'The variant id, valid values depend on `mode`: ' +
            `checkeredPattern: ${ids(CHECKERED_PATTERN_SETS).join(', ')} | ` +
            `trianglePattern: ${ids(TRIANGLE_PATTERN_SETS).join(', ')} | ` +
            `chevronPattern: ${ids(CHEVRON_PATTERN_SETS).join(', ')} | ` +
            `scatterPearls: ${ids(SCATTER_PEARLS_SETS).join(', ')} | ` +
            `pipingScrolls: ${ids(PIPING_SCROLLS_SETS).join(', ')} | ` +
            `sunshinePlay: ${ids(SUNSHINE_PLAY_SETS).join(', ')} | ` +
            `victorianLambeth: ${ids(VICTORIAN_LAMBETH_SETS).join(', ')}`,
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'place_center_decoration',
    description: 'Place a decoration on the top-center of the cake (e.g. a cherry, chocolate bear, basketball). Places at a default top-surface slot rather than an exact clicked point — the person can still drag/reposition it manually afterward.',
    input_schema: {
      type: 'object',
      properties: {
        designId: { type: 'string', enum: ids(CENTER_PLACEABLE_DESIGNS, 'designId') },
        slot: { type: 'string', enum: ids(TOP_SURFACE_SLOTS), description: 'Optional exact slot. If omitted, finds the first available position, starting at the center.' },
      },
      required: ['designId'],
    },
  },
  {
    name: 'clear_center_decorations',
    description: 'Remove all placed center decorations and individually placed letters. Does not clear fixed piping text lines.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_current_quote',
    description: "Return the customer's current live price estimate (already computed for the current design) so you can answer pricing questions honestly instead of guessing.",
    input_schema: { type: 'object', properties: {} },
  },
];

module.exports = { CAKE_AI_TOOLS };
