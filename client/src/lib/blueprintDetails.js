import * as options from './cakeConfig';
import { FLAVORS } from '@/lib/cakeFlavors';

const names = new Map(Object.values(options).filter(Array.isArray).flat()
  .filter((entry) => entry?.id).map((entry) => [entry.id, entry.label || entry.name || entry.id]));
// Colour of a flavor's own chip in the designer, when the option list carries one.
const entries = new Map(Object.values(options).filter(Array.isArray).flat().filter((entry) => entry?.id).map((entry) => [entry.id, entry]));
export function flavorColorOf(id) {
  if (!id) return null;
  const str = String(id).trim();
  if (/^#[0-9a-f]{3,8}$/i.test(str)) return str;

  // 1. ToolPanel sugar color palette (SUGAR_COLORS)
  const sugar = options.SUGAR_COLORS?.find((c) => c.id === str);
  if (sugar?.hex) return sugar.hex;

  // 2. Flavor palette (FLAVORS)
  const flavor = FLAVORS?.[str];
  if (flavor?.colors) {
    return flavor.colors.crumbBase || flavor.colors.frosting || flavor.colors.filling;
  }

  // 3. Any entry in options with a hex property
  const entry = entries.get(str);
  if (entry) {
    for (const key of ['color', 'hex', 'swatch', 'colorHex', 'chipColor', 'iconColor', 'icon', 'bg', 'bgColor', 'dot', 'value']) {
      const v = entry[key];
      if (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim())) return v.trim();
    }
  }
  return null;
}

export const name = (value) => names.get(value) || String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function cleanDecorName(rawType, designId) {
  if (designId && names.has(designId)) return names.get(designId);
  const placeable = options.CENTER_PLACEABLE_DESIGNS?.find((d) => d.designId === designId || d.toolId === rawType);
  if (placeable?.label) return placeable.label;
  if (!rawType) return 'Decoration';
  let s = String(rawType)
    .replace(/^center-/, '')
    .replace(/-default$/, '')
    .replace(/-standing$/, ' (Standing)')
    .replace(/-/g, ' ');
  const letterMatch = s.match(/^letter(Upper|Lower)([A-Za-z0-9])/i);
  if (letterMatch) {
    return `Letter '${letterMatch[2]}'`;
  }
  const numberMatch = s.match(/^number([0-9])/i);
  if (numberMatch) {
    return `Number '${numberMatch[1]}'`;
  }
  return s.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function resolveEdgeColors(config = {}, slot = 'top', edgeSlot = null) {
  const edge = edgeSlot || config.edge?.[slot] || (config.edge?.mode === 'both' ? config.edge?.both : null) || {};
  const overrides = config.sugarColorOverrides || {};
  const context = slot === 'both' ? 'edgeBoth' : `edge${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;

  const extractColorId = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val.mode === 'colorOverride' && val.colorId) return val.colorId;
    if (val.mode === 'default' && val.colorId) return val.colorId;
    if (val.colorId) return val.colorId;
    return null;
  };

  // Primary color override: e.g. edgeTop, then edgeBoth, then edge
  const primaryOverride = overrides[context]
    || (slot === 'top' || slot === 'bottom' || slot === 'middle' ? overrides.edgeBoth : null)
    || overrides.edge
    || null;

  const primaryOverrideId = extractColorId(primaryOverride);
  const primaryColorId = primaryOverrideId
    || edge.piping?.colorId
    || edge.decorations?.colorId
    || (config.sugarColor?.mode === 'colorOverride' && config.sugarColor?.colorId ? config.sugarColor.colorId : null)
    || config.sugarColor?.colorId
    || 'vanilla';

  const primaryHex = flavorColorOf(primaryColorId) || '#F6DEAB';
  const primaryName = name(primaryColorId);

  // Secondary color (only for alternating tips)
  const tip = edge.piping?.tip || edge.decorations?.setId || '';
  const isAlt = String(tip).endsWith('Alt') || String(tip).toLowerCase().includes('alternat');

  const secondaryOverride = overrides[`${context}Secondary`]
    || (slot === 'top' || slot === 'bottom' || slot === 'middle' ? overrides.edgeBothSecondary : null)
    || overrides.edgeSecondary
    || null;
  const secondaryOverrideId = extractColorId(secondaryOverride);

  const rawSecondaryId = secondaryOverrideId || edge.piping?.secondaryColorId || null;
  const secondaryColorId = isAlt ? (rawSecondaryId || 'red') : null;
  const hasSecondary = isAlt && Boolean(secondaryColorId);

  const secondaryHex = hasSecondary ? (flavorColorOf(secondaryColorId) || '#D6293E') : null;
  const secondaryName = hasSecondary ? name(secondaryColorId) : null;

  const fullColorName = hasSecondary ? `${primaryName} / ${secondaryName}` : primaryName;

  // Decoration specific color
  const decorColorId = primaryOverrideId || edge.decorations?.colorId || primaryColorId;
  const decorHex = flavorColorOf(decorColorId) || primaryHex;
  const decorName = name(decorColorId);

  return {
    primaryColorId,
    primaryHex,
    primaryName,
    secondaryColorId,
    secondaryHex,
    secondaryName,
    hasSecondary,
    fullColorName,
    decorColorId,
    decorHex,
    decorName,
    isAlt,
  };
}

// Match selection rows to quote keys, keeping every quoted cent exactly once.
export function buildBlueprintDetails(config, quote, designName = '') {
  const sections = [];
  const addSection = (title, items) => {
    if (items.length) sections.push({ title, items: items.map(([label, detail, keys = [], weight = 1]) => ({ label, detail, keys, weight, priceMinor: null, priceText: quote ? 'Included' : 'Unavailable' })) });
  };
  const layers = config.structure?.layers || 1;
  // Petit Fours mirror configAdapter's own slot count: 4 individually
  // configurable variants even though the structure keeps layers = 1.
  const isPetitsFour = options.isPetitsFourStructure(config.structure);
  const variationCount = isPetitsFour ? 4 : layers;
  const individual = (layers > 1 || isPetitsFour) && config.structure?.layerDesign === 'individual';
  const pieceName = isPetitsFour ? 'Variant' : 'Tier';
  const sizeKey = config.structure?.size || '8x6';
  const sizeAliases = sizeKey === '8x6' || sizeKey === '8x8' || sizeKey === 'big' ? ['size.8x6', 'size.8x8', 'size.big'] : sizeKey === '6x4' || sizeKey === '6x6' || sizeKey === 'small' ? ['size.6x4', 'size.6x6', 'size.small'] : [`size.${sizeKey}`];
  const fundamentals = [[isPetitsFour ? 'Format' : 'Tiers', isPetitsFour ? `Petit Fours · 4 pieces · ${name(sizeKey)}` : `${layers} tier(s) · ${config.realSize?.diameter || ''} in diameter · ${config.realSize?.height || ''} in height`, ['base.standard', ...sizeAliases, 'tier.additional']]];
  for (let i = 0; i < (individual ? variationCount : 1); i++) {
    const prefix = individual ? `${pieceName} ${i + 1} ` : '';
    const sponge = individual ? config.sponge?.layerFlavors?.[i] || config.sponge?.flavor : config.sponge?.flavor;
    fundamentals.push([`${prefix}Sponge Flavor`, name(sponge), [`sponge.${sponge}`]]);
    const fillingEnabled = individual && Array.isArray(config.filling?.layerEnabled)
      ? config.filling.layerEnabled[i] !== false
      : config.filling?.enabled;
    const fillingLayers = individual && Array.isArray(config.filling?.layerLayers)
      ? config.filling.layerLayers[i] || 1
      : config.filling?.layers || 1;
    const fillingFlavor = individual ? config.filling?.layerFlavors?.[i] || config.filling?.flavor : config.filling?.flavor;
    if (fillingEnabled) fundamentals.push([`${prefix}Filling`, `${name(fillingFlavor)} · ${fillingLayers} filling layer(s)`, ['filling.layer', `filling.${fillingFlavor}`]]);
    const finish = config.exteriorFinish || {};
    const style = individual ? finish.layerStyles?.[i] || finish.style : finish.style;
    const flavor = individual ? finish.layerFlavors?.[i] || finish.flavor : finish.flavor;
    const texture = individual ? finish.layerButtercreamTextures?.[i] || finish.buttercreamTexture : finish.buttercreamTexture;
    fundamentals.push([`${prefix}Exterior Finish`, [name(style), style !== 'naked' && name(flavor), style === 'texturedButtercream' && name(texture)].filter(Boolean).join(' · '), [`finish.${style}`, ...(style !== 'naked' ? [`frosting.${flavor}`] : []), ...(style === 'texturedButtercream' ? [`texture.${texture}`] : [])]]);
    const surface = individual ? config.surfaceTreatment?.layerTreatments?.[i] || config.surfaceTreatment : config.surfaceTreatment;
    if (surface?.mode) fundamentals.push([`${prefix}Surface Treatment`, `${name(surface.mode)} · ${name(options.getSurfaceTreatmentPattern(surface, config.structure))}`, [`surface.${surface.mode}`]]);
  }
  if (!individual) {
    if (config.filling?.enabled && config.filling.piping?.tip) fundamentals.push(['Filling Piping', `${name(config.filling.piping.tip)} · ${name(config.filling.piping.colorId)}`, ['edge.piping']]);
  } else {
    for (let i = 0; i < variationCount; i++) {
      const isPieceEnabled = config.filling?.layerEnabled ? config.filling.layerEnabled[i] !== false : config.filling?.enabled;
      const piecePiping = config.filling?.layerPipings?.[i] || config.filling?.piping;
      if (isPieceEnabled && piecePiping?.tip) {
        fundamentals.push([`${pieceName} ${i + 1} Filling Piping`, `${name(piecePiping.tip)} · ${name(piecePiping.colorId)}`, ['edge.piping']]);
      }
    }
  }
  if (config.sugarColor?.mode === 'colorOverride') fundamentals.push(['Sugar Color', name(config.sugarColor.colorId), [`color.${config.sugarColor.colorId}`]]);
  Object.entries(config.sugarColorOverrides || {}).forEach(([context, color]) => {
    if (color?.mode === 'colorOverride' && color.colorId) fundamentals.push([`${name(context)} Color`, name(color.colorId), [`color.${color.colorId}`]]);
  });
  addSection('Fundamentals', fundamentals);
  const sideItems = [];
  for (let i = 0; i < (individual ? variationCount : 1); i++) {
    const side = individual ? config.side?.layerTreatments?.[i] || config.side : config.side;
    if (side?.mode) {
      const choice = side[side.mode] || {};
      sideItems.push([`${individual ? `${pieceName} ${i + 1} ` : ''}${name(side.mode)}`, [name(choice.setId), name(choice.colorId), choice.flavorId && name(choice.flavorId)].filter(Boolean).join(' · '), [`side.${side.mode}`, 'side.treatment']]);
    }
  }
  addSection('Side', sideItems);
  const center = [];
  const placedItems = config.place?.items || [];
  if (placedItems.length) {
    const groups = new Map();
    placedItems.forEach((item) => {
      const textVal = item.text ?? item.content ?? item.value;
      const key = (item.type === 'text' || textVal != null)
        ? `text_${textVal}_${item.colorId || item.color || ''}`
        : (item.designId || item.type || 'decor');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    groups.forEach((items) => {
      const first = items[0];
      const textVal = first.text ?? first.content ?? first.value;
      const count = items.length;
      const allKeys = items.flatMap((it) => [
        `placed.${it.type}`,
        `placed.${it.designId}`,
        'center-decorations',
        'center.decorations',
        'center.place',
        'placed.decorations',
        'placed.items',
      ]).filter(Boolean);
      const uniqueKeys = [...new Set(allKeys)];

      if (first.type === 'text' || textVal != null) {
        const color = first.colorId || first.color;
        const colorStr = color ? ` · ${name(color)}` : '';
        const timesText = count > 1 ? ` (${count}×)` : '';
        center.push([
          'Writing',
          `"${textVal}"${colorStr}${timesText}, placed on top of the cake`,
          uniqueKeys,
          count,
        ]);
      } else {
        const decorName = cleanDecorName(first.type, first.designId);
        const timesText = count > 1 ? `${count}×, ` : '';
        center.push([
          decorName,
          `${timesText}placed on top of the cake`,
          uniqueKeys,
          count,
        ]);
      }
    });
  }
  addSection('Center', center);
  const edges = [];
  const slots = config.edge?.mode === 'both' ? ['both', ...(layers > 1 ? ['middle'] : [])] : ['top', ...(layers > 1 ? ['middle'] : []), 'bottom'];
  slots.forEach((slot) => {
    const edge = config.edge?.[slot];
    if (edge?.piping?.tip) {
      const colors = resolveEdgeColors(config, slot, edge);
      edges.push([`${name(slot)} Border Piping`, `${name(edge.piping.tip)} · ${colors.fullColorName}`, ['edge.piping'], slot === 'both' ? 2 : 1]);
    }
    if (edge?.decorations?.setId) {
      const colors = resolveEdgeColors(config, slot, edge);
      edges.push([`${name(slot)} Edge Decoration`, `${name(edge.decorations.setId)} · ${colors.decorName}`, ['edge.decorationSet'], slot === 'both' ? 2 : 1]);
    }
  });
  addSection('Edge', edges);
  const rows = sections.flatMap((section) => section.items);
  for (const charge of quote?.lineItems || []) {
    const matches = rows.filter((row) => row.keys.includes(charge.componentKey));
    if (!matches.length) {
      // Preserve quote charges that have no active selection counterpart.
      const title = charge.componentKey.startsWith('edge.') ? 'Edge' : charge.componentKey.startsWith('side.') ? 'Side' : charge.componentKey.startsWith('placed.') || charge.componentKey.startsWith('center.') ? 'Center' : 'Fundamentals';
      let section = sections.find((entry) => entry.title === title);
      if (!section) { section = { title, items: [] }; sections.push(section); }
      section.items.push({ label: charge.label, detail: 'Quoted charge', priceMinor: charge.lineTotalMinor });
      continue;
    }
    const weight = matches.reduce((sum, row) => sum + row.weight, 0);
    let remaining = charge.lineTotalMinor;
    matches.forEach((row, index) => {
      const amount = index === matches.length - 1 ? remaining : Math.floor(charge.lineTotalMinor * row.weight / weight);
      remaining -= amount;
      row.priceMinor = (row.priceMinor || 0) + amount;
      delete row.priceText;
    });
  }
  for (const row of rows) {
    if (quote?.warnings?.some((key) => row.keys.includes(key))) row.priceText = row.priceMinor == null ? 'Unpriced' : undefined;
    delete row.keys;
    delete row.weight;
  }
  if (quote?.warnings?.length) sections.push({ title: 'Pricing notes', items: quote.warnings.map((key) => ({ label: name(key), detail: 'Price unavailable in quote', priceText: 'Unpriced' })) });
  return { sections, totalMinor: quote?.totalMinor ?? null, currency: quote?.currency || 'PHP', designName };
}