// aiCakeTools.js
//
// Tool schemas for the Cake AI, plus the executor that applies each tool
// call to the SAME config shape ToolPanel's sections already mutate.
// Every enum below is read live from cakeConfig.js — nothing is
// hand-copied — so a new SIDE_TREATMENTS entry or SUGAR_COLORS swatch is
// automatically something the AI can use, with no second file to update.
//
// Design note: this deliberately does NOT introduce a new mutation
// vocabulary. Each tool's `apply` function is the exact same
// spread-and-replace pattern ToolPanel.jsx's per-section onChange
// closures use (see e.g. `onChange={(newSponge) => onChange({ ...config,
// sponge: newSponge })}`). If ToolPanel ever changes how a slice is
// written, mirror the change here — but the shape of config itself never
// needs to be re-learned by the AI, only these small adapter functions.

import {
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
  DEFAULT_CONFIG,
  computeSlotPosition,
} from '@/lib/cakeConfig';
import { FLAVOR_ORDER, FROSTING_FILLING_FLAVOR_ORDER } from '@/lib/cakeFlavors';

const ids = (arr, key = 'id') => arr.map((o) => o[key]);

// ─── Tool schemas (sent to the model) ──────────────────────────────────
// v1 scope: whole-cake edits only. Per-tier ("Individual" Tier Design)
// edits are deliberately out of scope for now — `activeLayer` lives as
// local React state inside ToolPanel, not in config, so the AI (running
// server-side, stateless per request) has no reliable way to know which
// tier the person is "looking at." Extending to per-tier edits later
// means either lifting activeLayer into config or having the AI always
// pass an explicit tierIndex and apply to both tiers when omitted.
export const CAKE_AI_TOOLS = [
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
        slot: { type: 'string', enum: ['center-0', 'inner-0', 'outer-0'], description: 'Defaults to center-0 (dead center) if omitted.' },
      },
      required: ['designId'],
    },
  },
  {
    name: 'clear_center_decorations',
    description: 'Remove all placed center decorations/text from the top of the cake.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_current_quote',
    description: "Return the customer's current live price estimate (already computed for the current design) so you can answer pricing questions honestly instead of guessing.",
    input_schema: { type: 'object', properties: {} },
  },
];

// ─── Executor: tool_use input -> config mutation ───────────────────────
// `ctx` = { config, onChange, quote }. Returns a small JSON-able summary
// fed back to the model as the tool_result, and a human-readable label
// used to render an "AI changed: ..." chip in the chat transcript.
export function applyCakeAiTool(name, input, ctx) {
  const { config, onChange, quote } = ctx;

  switch (name) {
    case 'set_structure': {
      const nextStructure = { ...config.structure, ...input };
      const tierCountChanged = input.layers != null && input.layers !== config.structure?.layers;
      if (!tierCountChanged) {
        onChange({ ...config, structure: nextStructure });
        return { label: 'Updated cake structure', result: nextStructure };
      }
      // Mirror ToolPanel.handleStructureChange: shrinking/growing tier
      // count orphans center placements tied to a tier that no longer
      // exists, so strip them the same way the manual control does.
      const centerItems = (config.place?.items || []).filter(
        (item) => !(typeof item.type === 'string' && item.type.startsWith('center-'))
      );
      const legacyPlacedItems = (config.placedItems || []).filter(
        (item) => !(typeof item.type === 'string' && item.type.startsWith('center-'))
      );
      onChange({
        ...config,
        structure: nextStructure,
        place: { ...(config.place || {}), items: centerItems },
        placedItems: legacyPlacedItems,
      });
      return { label: `Set cake to ${nextStructure.layers} tier(s)`, result: nextStructure };
    }

    case 'set_sponge_flavor': {
      const nextSponge = { ...config.sponge, flavor: input.flavor };
      onChange({ ...config, sponge: nextSponge });
      return { label: `Sponge flavor → ${input.flavor}`, result: nextSponge };
    }

    case 'set_filling': {
      const nextFilling = { ...config.filling };
      if (input.enabled != null) nextFilling.enabled = input.enabled;
      if (input.layers != null) { nextFilling.layers = input.layers; nextFilling.enabled = true; }
      if (input.flavor != null) nextFilling.flavor = input.flavor;
      if (input.pipingDesign != null) {
        nextFilling.piping = { ...nextFilling.piping, tip: input.pipingDesign === 'none' ? null : input.pipingDesign };
      }
      onChange({ ...config, filling: nextFilling });
      return { label: 'Updated filling', result: nextFilling };
    }

    case 'set_exterior_finish': {
      const nextExterior = { ...config.exteriorFinish, ...input };
      onChange({ ...config, exteriorFinish: nextExterior });
      return { label: `Exterior finish → ${nextExterior.style}`, result: nextExterior };
    }

    case 'set_sugar_color': {
      const context = input.context || 'exterior';
      // Mirrors ToolPanel's fillingSugarColor/exteriorSugarColor/
      // renderSugarColor keying — whole-cake (non-individual) contexts
      // only, per the v1 scope note above.
      const key = context === 'exterior' ? 'exterior'
        : context === 'filling' ? 'filling'
        : context === 'side' ? 'side'
        : 'surface';
      const current = config.sugarColorOverrides?.[key] || DEFAULT_CONFIG.sugarColor;
      const next = { ...current, ...(input.mode ? { mode: input.mode } : {}), ...(input.colorId ? { colorId: input.colorId } : {}) };
      onChange({
        ...config,
        sugarColorOverrides: { ...(config.sugarColorOverrides || {}), [key]: next },
      });
      return { label: `${context} color → ${next.colorId || next.mode}`, result: next };
    }

    case 'set_surface_treatment': {
      const next = { ...config.surfaceTreatment };
      if (input.enabled != null) next.mode = input.enabled ? 'glaze' : null;
      if (input.pattern != null) next.pattern = input.pattern;
      onChange({ ...config, surfaceTreatment: next });
      return { label: next.mode ? `Glaze → ${next.pattern}` : 'Glaze removed', result: next };
    }

    case 'set_side_treatment': {
      const mode = input.mode === 'none' ? null : input.mode;
      const next = { ...config.side, mode };
      if (mode && input.setId) {
        next[mode] = { ...(config.side?.[mode] || {}), setId: input.setId };
      }
      onChange({ ...config, side: next });
      return { label: mode ? `Side → ${mode} (${input.setId || 'default'})` : 'Side treatment removed', result: next };
    }

    case 'place_center_decoration': {
      const design = CENTER_PLACEABLE_DESIGNS.find((d) => d.designId === input.designId);
      if (!design) return { label: 'Unknown decoration', error: `No design '${input.designId}'` };
      const slot = TOP_SURFACE_SLOTS.find((s) => s.id === (input.slot || 'center-0')) || TOP_SURFACE_SLOTS[0];
      // topRadius isn't known server-side / outside CakeScene — for a
      // dead-center placement (the default) x/z are 0 regardless, which
      // covers the common "put a cherry on top" case without needing the
      // real cake radius. Non-center slots need topRadius plumbed in from
      // CakeScene if you want this to place accurately off-center.
      const { x, z } = computeSlotPosition(slot, 4);
      const newItem = { type: design.toolId, x, y: 0, z, rotationY: 0, rotationX: 0 };
      const items = [...(config.place?.items || []), newItem];
      onChange({ ...config, place: { ...(config.place || {}), items } });
      return { label: `Placed ${design.label}`, result: newItem };
    }

    case 'clear_center_decorations': {
      const items = (config.place?.items || []).filter(
        (item) => !(typeof item.type === 'string' && item.type.startsWith('center-'))
      );
      onChange({ ...config, place: { ...(config.place || {}), items } });
      return { label: 'Cleared center decorations', result: items };
    }

    case 'get_current_quote': {
      if (!quote) return { label: 'Quote not ready', result: null };
      return {
        label: `Current estimate: ${quote.totalMinor / 100}`,
        result: { totalMinor: quote.totalMinor, currency: quote.currency, lineItems: quote.lineItems },
      };
    }

    default:
      return { label: 'Unknown tool', error: `No such tool '${name}'` };
  }
}