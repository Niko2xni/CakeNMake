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
  if (name === 'set_cake_text' && input.style === 'buttercream' && input.font) return 'Font selection applies only to piping text.';
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
      if (text && !(input.style === 'buttercream' ? /^[A-Za-z \n]+$/ : /^[A-Za-z0-9 .,!?&'()\n-]+$/).test(text)) return { error: input.style === 'buttercream' ? 'Buttercream letters support A–Z, a–z and spaces only.' : 'Piping text supports Latin letters, numbers and basic punctuation.' };
      const lines = [];
      const maxLine = input.style === 'buttercream' ? 12 : 20;
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
      const style = config.structure?.layerDesign === 'individual' ? config.exteriorFinish?.layerStyles?.[tiers - 1] || config.exteriorFinish?.style : config.exteriorFinish?.style;
      const boundary = getDelicatesAwareBoundaryRadius(radius, config.edge, style);
      const obstacles = [...getEdgeDelicatesObstacles(config.edge, radius, style), ...retained.map(item => getItemFootprint(item, scale))];
      const added = [];
      const footprints = [];
      const colorId = input.colorId || config.center?.text?.colorId || config.sugarColorOverrides?.center?.colorId || 'vanilla';
      lines.forEach((line, lineIndex) => {
        const z = input.style === 'piping' && lines.length === 2 ? (lineIndex === 0 ? -0.28 : 0.28) * radius : (lineIndex - (lines.length - 1) / 2) * radius * 0.28;
        if (input.style === 'piping') footprints.push({ type: 'obb', x: 0, z, halfLength: Math.max(0.4, line.length * 0.17), halfWidth: 0.3, angle: 0 });
        else {
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
        }
      });
      if (footprints.some(footprint => !isFootprintInBoundary(footprint, boundary, radius) || obstacles.some(obstacle => doFootprintsClash(footprint, obstacle, 0.04)))) return { error: 'The text would overlap a decoration or extend beyond the cake. Shorten it or move decorations first.' };
      const centerText = { ...(config.center?.text || {}), top: '', middle: '', bottom: '', colorId, font: input.font || 'default', spacing: 0.28, colorMode: 'individual' };
      if (input.style === 'piping' && lines.length) {
        if (lines.length === 1) centerText.middle = lines[0];
        else if (lines.length === 2) { centerText.top = lines[0]; centerText.bottom = lines[1]; }
        else [centerText.top, centerText.middle, centerText.bottom] = lines;
      }
      onChange({ ...config, center: { ...config.center, mode: 'text', textCategory: input.style, text: centerText },
        place: { ...config.place, items: [...retained, ...added] }, placedItems: (config.placedItems || []).filter(item => !isLetter(item)) });
      return { label: text ? `Added ${input.style} text: ${text}` : 'Removed cake text', result: { text, style: input.style, lines, letters: added.length } };
    }
    case 'set_structure': {
      const nextStructure = { ...config.structure, ...input };
      if (nextStructure.size === 'small' && nextStructure.layers > 1) {
        if (input.layers > 1) return { error: 'Small cakes support one tier only. Select a big cake for two tiers.' };
        nextStructure.layers = 1;
      }
      if (nextStructure.layers === 1) nextStructure.layerDesign = 'uniform';
      const realSize = SIZE_OPTIONS.find(option => option.id === nextStructure.size).dimensions;
      const tierCountChanged = nextStructure.layers !== config.structure?.layers;
      if (!tierCountChanged) {
        onChange({ ...config, structure: nextStructure, realSize: { ...realSize } });
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
      onChange(syncTierDesignOnToggle({
        ...config,
        structure: nextStructure,
        realSize: { ...realSize },
        place: { ...(config.place || {}), items: centerItems },
        placedItems: legacyPlacedItems,
      }, nextStructure.layerDesign, 0));
      return { label: `Set cake to ${nextStructure.layers} tier(s)`, result: nextStructure };
    }

    case 'set_sponge_flavor': {
      const nextSponge = { ...config.sponge, flavor: input.flavor, layerFlavors: Array(tiers).fill(input.flavor) };
      onChange({ ...config, sponge: nextSponge });
      return { label: `Sponge flavor → ${input.flavor}`, result: nextSponge };
    }

    case 'set_filling': {
      const nextFilling = { ...config.filling };
      if (input.enabled != null) nextFilling.enabled = input.enabled;
      if (input.layers != null) { nextFilling.layers = input.layers; if (input.enabled == null) nextFilling.enabled = true; }
      if (input.flavor != null) { nextFilling.flavor = input.flavor; nextFilling.layerFlavors = Array(tiers).fill(input.flavor); }
      if (input.pipingDesign != null) {
        nextFilling.piping = { ...nextFilling.piping, tip: input.pipingDesign === 'none' ? null : input.pipingDesign };
      }
      onChange({ ...config, filling: nextFilling });
      return { label: 'Updated filling', result: nextFilling };
    }

    case 'set_exterior_finish': {
      const nextExterior = { ...config.exteriorFinish, ...input };
      if (input.style) nextExterior.layerStyles = Array(tiers).fill(input.style);
      if (input.flavor) nextExterior.layerFlavors = Array(tiers).fill(input.flavor);
      if (input.buttercreamTexture) nextExterior.layerButtercreamTextures = Array(tiers).fill(input.buttercreamTexture);
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
      for (let tier = 0; tier < tiers; tier++) overrides[`${key}-${tier}`] = { ...next };
      // A naked tier has no coating to tint. Make an explicit exterior
      // color request visible, preserving existing frosted textures.
      let exteriorFinish = config.exteriorFinish;
      let addedFrosting = false;
      if (context === 'exterior' && next.mode === 'colorOverride') {
        const individual = config.structure?.layerDesign === 'individual';
        const layerStyles = Array.from({ length: tiers }, (_, tier) => {
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
      next.layerTreatments = Array.from({ length: tiers }, (_, index) => ({
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
      next.layerTreatments = Array.from({ length: tiers }, (_, index) => ({
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
        ? config.exteriorFinish?.layerStyles?.[tiers - 1] || config.exteriorFinish?.style
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
