// aiCakeTools.js
//
// Validated executor that applies each Cake AI tool
// call to the SAME config shape ToolPanel's sections already mutate.
// Tool schemas are imported from aiCakeToolSchemas.js; their enums use cakeConfig.js — nothing is
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
  STANDARD_SIZE_OPTIONS,
  PETITS_FOUR_SIZE_OPTIONS,
  BENTO_SIZE_OPTIONS,
  getCakeFormat,
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
  getTopTierRadiusFromConfig,
  getCenterItemLimit,
  getCenterItemCount,
  getItemFootprint,
  doFootprintsClash,
  isFootprintInBoundary,
  getEdgeDelicatesObstacles,
  getDelicatesAwareBoundaryRadius,
  BUTTERCREAM_LETTERS,
} from '@/lib/cakeConfig';

import { CAKE_AI_TOOLS } from './aiCakeToolSchemas';
import { syncTierDesignOnToggle } from './tierDesignSync';
export { CAKE_AI_TOOLS };

const sideSets = {
  checkeredPattern: CHECKERED_PATTERN_SETS, trianglePattern: TRIANGLE_PATTERN_SETS,
  chevronPattern: CHEVRON_PATTERN_SETS, scatterPearls: SCATTER_PEARLS_SETS,
  pipingScrolls: PIPING_SCROLLS_SETS, sunshinePlay: SUNSHINE_PLAY_SETS,
  victorianLambeth: VICTORIAN_LAMBETH_SETS,
};

// Size ids grouped by format — 'small'/'big' stay accepted as legacy aliases
// of 6x6/8x8 so saved designs from before the Cake Format rework keep editing.
const petitsFourSizeIds = PETITS_FOUR_SIZE_OPTIONS.map((option) => option.id);
const bentoSizeIds = BENTO_SIZE_OPTIONS.map((option) => option.id);
const standardSizeIds = [...STANDARD_SIZE_OPTIONS.map((option) => option.id), 'small', 'big'];
const formatForSize = (size) => (petitsFourSizeIds.includes(size) ? 'petitsFour' : bentoSizeIds.includes(size) ? 'bento' : 'standard');

export function validateCakeAiTool(name, input) {
  const tool = CAKE_AI_TOOLS.find(candidate => candidate.name === name);
  if (!tool) return `Unknown cake tool '${name}'.`;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Tool input must be an object.';
  const { properties, required = [] } = tool.input_schema;
  for (const key of required) if (!Object.hasOwn(input, key)) return `Missing required argument '${key}'.`;
  for (const [key, value] of Object.entries(input)) {
    const schema = properties[key];
    if (!Object.hasOwn(properties, key)) return `Unknown argument '${key}'.`;
    if (schema.type === 'integer' ? !Number.isInteger(value) : typeof value !== schema.type) return `Invalid type for '${key}'.`;
    if (schema.enum && !schema.enum.includes(value)) return `Unsupported value for '${key}': ${value}.`;
    if (schema.maxLength != null && value.length > schema.maxLength) return `Argument '${key}' is too long.`;
  }
  if (Object.keys(properties).length && !Object.keys(input).length) return 'Supply at least one edit.';
  if (name === 'set_side_treatment' && input.setId && !sideSets[input.mode]?.some(set => set.id === input.setId)) return 'This side variant does not belong to the selected treatment.';
  if (name === 'set_edge_border' && input.designId === undefined && !input.colorId && !input.secondaryColorId) return 'Choose a border design or color to change.';
  return null;
}

// ─── Executor: tool_use input -> config mutation ───────────────────────
// `ctx` = { config, onChange, quote }. Returns a small JSON-able summary
// fed back to the model as the tool_result, and a human-readable label
// used to render an "AI changed: ..." chip in the chat transcript.
export function applyCakeAiTool(name, input, ctx) {
  if ((ctx.readOnly || ctx.config?.sentToBakery) && name !== 'get_current_quote') return { error: 'This submitted design is locked and cannot be edited.' };
  const error = validateCakeAiTool(name, input);
  if (error) return { error };
  const { config, onChange, quote } = ctx;
  const tiers = config.structure?.layers || 1;
  // Slot count for per-piece data arrays: Petit Fours always carry 4
  // Variants, mirroring configAdapter.js's own variationCount.
  const variationCount = getCakeFormat(config.structure) === 'petitsFour' ? 4 : tiers;

  switch (name) {
    case 'set_edge_border': {
      if (['middle', 'all'].includes(input.slot) && tiers < 2) return { error: 'Middle borders require a two-tier cake.' };
      const edge = structuredClone(config.edge || DEFAULT_CONFIG.edge);
      const overrides = { ...(config.sugarColorOverrides || {}) };
      // Preserve the visible opposite border when moving from shared to separate edges.
      if (edge.mode === 'both' && ['top', 'bottom', 'middle'].includes(input.slot)) {
        edge.top = structuredClone(edge.both); edge.bottom = structuredClone(edge.both);
        edge.topEnabled = Boolean(edge.both.piping?.tip || edge.both.decorations?.setId);
        edge.bottomEnabled = edge.topEnabled;
        for (const suffix of ['', 'Secondary']) if (overrides[`edgeBoth${suffix}`]) {
          overrides[`edgeTop${suffix}`] = { ...overrides[`edgeBoth${suffix}`] };
          overrides[`edgeBottom${suffix}`] = { ...overrides[`edgeBoth${suffix}`] };
        }
      }
      const slots = input.slot === 'all'
        ? ['top', 'bottom', 'middle', 'both']
        : input.slot === 'both'
          ? ['top', 'bottom', 'both']
          : [input.slot];
      for (const slot of slots) {
        const current = edge[slot] || {};
        if (input.designId === undefined && !current.piping?.tip) return { error: 'Choose a border design before changing its colors.' };
        const piping = { ...(current.piping || {}) };
        if (input.designId !== undefined) piping.tip = input.designId === 'none' ? null : input.designId;
        if (input.colorId) piping.colorId = input.colorId;
        if (input.secondaryColorId) { piping.secondaryColorId = input.secondaryColorId; piping.secondaryColorMode = 'colorOverride'; }
        edge[slot] = { ...current, piping, ...(input.designId !== undefined ? { decorations: { ...current.decorations, setId: null } } : {}) };
        const context = `edge${slot[0].toUpperCase()}${slot.slice(1)}`;
        if (input.colorId) overrides[context] = { mode: 'colorOverride', colorId: input.colorId };
        if (input.secondaryColorId) overrides[`${context}Secondary`] = { mode: 'colorOverride', colorId: input.secondaryColorId };
        if (['top', 'bottom'].includes(slot)) edge[`${slot}Enabled`] = Boolean(piping.tip || edge[slot].decorations?.setId);
      }
      edge.mode = 'topBottomSeparate';
      edge.activeSlot = (input.slot === 'both' || input.slot === 'all') ? 'top' : input.slot;
      onChange({ ...config, edge, sugarColorOverrides: overrides });
      return { label: `${input.slot} border → ${input.designId || 'updated colors'}`, result: edge };
    }
    case 'set_cake_text': {
      const isLetter = item => /^center-letter/.test(item.type || '') || /^letter/.test(item.type || '');
      const retained = (config.place?.items || []).filter(item => !isLetter(item));
      const text = input.text.trim();
      if (text && !/^[A-Za-z \n]+$/.test(text)) return { error: 'Buttercream letters support A–Z, a–z and spaces only.' };
      const lines = [];
      const maxLine = 12;
      for (const paragraph of text.split('\n')) {
        let line = '';
        for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
          if (word.length > maxLine) return { error: `Use words of at most ${maxLine} characters so the lettering can fit.` };
          if (line && `${line} ${word}`.length > maxLine) { lines.push(line); line = word; }
          else line = line ? `${line} ${word}` : word;
        }
        if (line) lines.push(line);
      }
      if (lines.length > 3) return { error: 'Cake text supports at most three lines. Please shorten the message.' };
      const radius = getTopTierRadiusFromConfig(config), scale = radius / 4;
      const style = config.structure?.layerDesign === 'individual' ? config.exteriorFinish?.layerStyles?.[variationCount - 1] || config.exteriorFinish?.style : config.exteriorFinish?.style;
      const boundary = getDelicatesAwareBoundaryRadius(radius, config.edge, style);
      const obstacles = [...getEdgeDelicatesObstacles(config.edge, radius, style), ...retained.map(item => getItemFootprint(item, scale))];
      const added = [];
      const footprints = [];
      const colorId = input.colorId || config.center?.text?.colorId || config.sugarColorOverrides?.center?.colorId || 'vanilla';
      lines.forEach((line, lineIndex) => {
        const z = (lineIndex - (lines.length - 1) / 2) * radius * 0.28;
        const widths = [...line].map(char => (char === ' ' ? 0.28 : char === char.toUpperCase() ? 0.52 : 0.4) * scale);
        let x = -widths.reduce((sum, width) => sum + width, 0) / 2;
        [...line].forEach((char, index) => {
          const width = widths[index];
          if (char !== ' ') {
            const letter = BUTTERCREAM_LETTERS.find(entry => entry.char === char);
            const item = { id: crypto.randomUUID(), type: letter.toolId, x: x + width / 2, z, y: 0, rotation: 0, tiltX: 0, tiltZ: 0, colorId, sugarColor: { mode: 'colorOverride', colorId } };
            added.push(item); footprints.push(getItemFootprint(item, scale));
          }
          x += width;
        });
      });
      if (footprints.some(footprint => !isFootprintInBoundary(footprint, boundary, radius) || obstacles.some(obstacle => doFootprintsClash(footprint, obstacle, 0.04)))) return { error: 'The text would overlap a decoration or extend beyond the cake. Shorten it or move decorations first.' };
      const centerText = { ...(config.center?.text || {}), top: '', middle: '', bottom: '', colorId, colorMode: 'individual' };
      onChange({ ...config, center: { ...config.center, mode: 'text', textCategory: input.style, text: centerText },
        place: { ...config.place, items: [...retained, ...added] }, placedItems: (config.placedItems || []).filter(item => !isLetter(item)) });
      return { label: text ? `Added ${input.style} text: ${text}` : 'Removed cake text', result: { text, style: input.style, lines, letters: added.length } };
    }
    case 'set_structure': {
      const nextStructure = { ...config.structure, ...input };
      // Format resolution: an explicit cakeFormat wins; otherwise the final
      // size decides ('classicCube'/'largeCube' → Petit Fours, '*Bento' →
      // Bento). 'bento'/'petitsFour' on `shape` still acts as a format
      // request for compatibility, but `shape` itself is purely visual now
      // ('round' | 'rectangle') — picking a shape never resets the size or
      // format, and Petit Fours keep honoring it like Bento does.
      const requestedFormat = ['standard', 'bento', 'petitsFour'].includes(input.cakeFormat)
        ? input.cakeFormat
        : (input.shape === 'bento' || input.shape === 'petitsFour' ? input.shape : null);
      const format = requestedFormat || formatForSize(nextStructure.size);
      if (format === 'petitsFour' && !petitsFourSizeIds.includes(nextStructure.size)) nextStructure.size = 'classicCube';
      if (format === 'bento' && !bentoSizeIds.includes(nextStructure.size)) nextStructure.size = 'standardBento';
      if (format === 'standard' && !standardSizeIds.includes(nextStructure.size)) nextStructure.size = '8x8';
      nextStructure.cakeFormat = format;
      nextStructure.format = format;
      nextStructure.shape = input.shape === 'round' || input.shape === 'rectangle' || input.shape === 'square'
        ? input.shape
        : (nextStructure.shape === 'rectangle' || nextStructure.shape === 'square' ? nextStructure.shape : 'round');
      
      // If square shape is selected, ensure size is 6x6 or 8x8
      if (nextStructure.shape === 'square' && nextStructure.size !== '6x6' && nextStructure.size !== '8x8') {
        nextStructure.size = '8x8';
      }
      const isPetitsFour = format === 'petitsFour';
      const isBento = format === 'bento';
      
      // Always enforce single tier for all cake types
      if (nextStructure.layers === 2 || input.layers === 2) {
        if (input.layers === 2) {
          return { error: 'All cakes are limited to 1 tier only.' };
        }
        nextStructure.layers = 1;
      }
      
      // Always use uniform layer design for single tier
      nextStructure.layerDesign = 'uniform';
      const sizeOpt = SIZE_OPTIONS.find(option => option.id === nextStructure.size);
      const realSize = sizeOpt ? sizeOpt.dimensions : (config.realSize || { diameter: 8, height: 8 });
      const currentFormat = getCakeFormat(config.structure);
      const nextFormat = getCakeFormat(nextStructure);
      const formatChanged = currentFormat !== nextFormat;
      const tierCountChanged = nextStructure.layers !== config.structure?.layers;
      if (!tierCountChanged && !formatChanged) {
        onChange({ ...config, structure: nextStructure, realSize: { ...realSize } });
        return { label: 'Updated cake structure', result: nextStructure };
      }
      // Mirror ToolPanel.handleStructureChange: changing format or shrinking/growing
      // tier count orphans center placements tied to the previous tier/format,
      // so strip them the same way the manual control does.
      const isCenterItem = (item) => typeof item.type === 'string' && item.type.startsWith('center-');
      const centerItems = nextFormat === 'petitsFour'
        ? []
        : (config.place?.items || []).filter((item) => !isCenterItem(item));
      const legacyPlacedItems = nextFormat === 'petitsFour'
        ? []
        : (config.placedItems || []).filter((item) => !isCenterItem(item));
      onChange(syncTierDesignOnToggle({
        ...config,
        structure: nextStructure,
        realSize: { ...realSize },
        center: {
          ...(config.center || {}),
          variations: {},
        },
        place: { ...(config.place || {}), items: centerItems },
        placedItems: legacyPlacedItems,
      }, nextStructure.layerDesign, 0));
      return { label: formatChanged ? `Changed format to ${nextFormat}` : `Set cake to ${nextStructure.layers} tier(s)`, result: nextStructure };
    }

    case 'set_sponge_flavor': {
      const nextSponge = { ...config.sponge, flavor: input.flavor, layerFlavors: Array(variationCount).fill(input.flavor) };
      onChange({ ...config, sponge: nextSponge });
      return { label: `Sponge flavor → ${input.flavor}`, result: nextSponge };
    }

    case 'set_filling': {
      const nextFilling = { ...config.filling };
      if (input.enabled != null) nextFilling.enabled = input.enabled;
      if (input.layers != null) { nextFilling.layers = input.layers; if (input.enabled == null) nextFilling.enabled = true; }
      if (input.flavor != null) { nextFilling.flavor = input.flavor; nextFilling.layerFlavors = Array(variationCount).fill(input.flavor); }
      if (input.pipingDesign != null) {
        nextFilling.piping = { ...nextFilling.piping, tip: input.pipingDesign === 'none' ? null : input.pipingDesign };
      }
      onChange({ ...config, filling: nextFilling });
      return { label: 'Updated filling', result: nextFilling };
    }

    case 'set_exterior_finish': {
      const nextExterior = { ...config.exteriorFinish, ...input };
      if (input.style) nextExterior.layerStyles = Array(variationCount).fill(input.style);
      if (input.flavor) nextExterior.layerFlavors = Array(variationCount).fill(input.flavor);
      if (input.buttercreamTexture) nextExterior.layerButtercreamTextures = Array(variationCount).fill(input.buttercreamTexture);
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
      const next = { ...current, ...(input.mode ? { mode: input.mode } : input.colorId ? { mode: 'colorOverride' } : {}), ...(input.colorId ? { colorId: input.colorId } : {}) };
      const overrides = { ...(config.sugarColorOverrides || {}), [key]: next };
      for (let tier = 0; tier < variationCount; tier++) overrides[`${key}-${tier}`] = { ...next };
      // A naked tier has no coating to tint. Make an explicit exterior
      // color request visible, preserving existing frosted textures.
      let exteriorFinish = config.exteriorFinish;
      let addedFrosting = false;
      if (context === 'exterior' && next.mode === 'colorOverride') {
        const individual = config.structure?.layerDesign === 'individual';
        const layerStyles = Array.from({ length: variationCount }, (_, tier) => {
          const style = (individual ? exteriorFinish?.layerStyles?.[tier] : null)
            || exteriorFinish?.style || DEFAULT_CONFIG.exteriorFinish.style;
          if (style !== 'naked') return style;
          addedFrosting = true;
          return 'fullyFrosted';
        });
        if (addedFrosting) exteriorFinish = {
          ...exteriorFinish,
          style: exteriorFinish?.style === 'naked' ? 'fullyFrosted' : exteriorFinish?.style,
          layerStyles,
        };
      }
      onChange({
        ...config,
        exteriorFinish,
        sugarColorOverrides: overrides,
      });
      return {
        label: `${context} color → ${next.colorId || next.mode}${addedFrosting ? ' (added frosting)' : ''}`,
        result: { ...next, ...(addedFrosting ? { addedFrosting: true, exteriorFinish } : {}) },
      };
    }

    case 'set_surface_treatment': {
      const next = { ...config.surfaceTreatment };
      if (input.enabled != null) next.mode = input.enabled ? 'glaze' : null;
      if (input.pattern != null) next.pattern = input.pattern;
      next.layerTreatments = Array.from({ length: variationCount }, (_, index) => ({
        ...(config.surfaceTreatment?.layerTreatments?.[index] || {}),
        ...(input.enabled != null ? { mode: next.mode } : {}),
        ...(input.pattern != null ? { pattern: next.pattern } : {}),
      }));
      onChange({ ...config, surfaceTreatment: next });
      return { label: next.mode ? `Glaze → ${next.pattern}` : 'Glaze removed', result: next };
    }

    case 'set_side_treatment': {
      const mode = input.mode === 'none' ? null : input.mode;
      const next = { ...config.side, mode };
      if (mode && input.setId) {
        next[mode] = { ...(config.side?.[mode] || {}), setId: input.setId };
      }
      next.layerTreatments = Array.from({ length: variationCount }, (_, index) => ({
        ...(config.side?.layerTreatments?.[index] || config.side), mode,
        ...(mode && input.setId ? { [mode]: { ...(config.side?.layerTreatments?.[index]?.[mode] || next[mode]), setId: input.setId } } : {}),
        layerTreatments: undefined,
      }));
      onChange({ ...config, side: next });
      return { label: mode ? `Side → ${mode} (${input.setId || 'default'})` : 'Side treatment removed', result: next };
    }

    case 'place_center_decoration': {
      const design = CENTER_PLACEABLE_DESIGNS.find((d) => d.designId === input.designId);
      if (!design) return { label: 'Unknown decoration', error: `No design '${input.designId}'` };
      const existing = config.place?.items || [];
      const limit = getCenterItemLimit(input.designId);
      if (limit != null && getCenterItemCount(existing, input.designId) >= limit) return { error: `Decoration limit reached for ${design.label}.` };
      const radius = getTopTierRadiusFromConfig(config);
      const scale = radius / 4;
      const style = config.structure?.layerDesign === 'individual'
        ? config.exteriorFinish?.layerStyles?.[variationCount - 1] || config.exteriorFinish?.style
        : config.exteriorFinish?.style;
      const boundary = getDelicatesAwareBoundaryRadius(radius, config.edge, style);
      const obstacles = getEdgeDelicatesObstacles(config.edge, radius, style);
      const slots = input.slot ? TOP_SURFACE_SLOTS.filter(slot => slot.id === input.slot) : TOP_SURFACE_SLOTS;
      let newItem;
      for (const slot of slots) {
        const position = computeSlotPosition(slot, radius);
        const candidate = { type: design.toolId, ...position, y: 0, rotation: 0, tiltX: 0, tiltZ: 0 };
        const footprint = getItemFootprint(candidate, scale);
        if (!isFootprintInBoundary(footprint, boundary, radius)) continue;
        if (obstacles.some(obstacle => doFootprintsClash(footprint, obstacle, 0.02))) continue;
        if (existing.some(item => doFootprintsClash(footprint, getItemFootprint(item, scale), 0.01))) continue;
        newItem = { ...candidate, id: crypto.randomUUID() };
        break;
      }
      if (!newItem) return { error: 'No available position for this decoration. Move an item or choose another slot.' };
      const items = [...existing, newItem];
      onChange({ ...config, place: { ...(config.place || {}), items } });
      return { label: `Placed ${design.label}`, result: newItem };
    }

    case 'clear_center_decorations': {
      const items = (config.place?.items || []).filter(
        (item) => !(typeof item.type === 'string' && item.type.startsWith('center-'))
      );
      onChange({ ...config, place: { ...(config.place || {}), items }, placedItems: (config.placedItems || []).filter(item => !item.type?.startsWith('center-')) });
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
