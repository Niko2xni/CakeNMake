import * as options from './cakeConfig';

const names = new Map(Object.values(options).filter(Array.isArray).flat()
  .filter((entry) => entry?.id).map((entry) => [entry.id, entry.label || entry.name || entry.id]));
const name = (value) => names.get(value) || String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());

// Match selection rows to quote keys, keeping every quoted cent exactly once.
export function buildBlueprintDetails(config, quote, designName = '') {
  const sections = [];
  const addSection = (title, items) => {
    if (items.length) sections.push({ title, items: items.map(([label, detail, keys = [], weight = 1]) => ({ label, detail, keys, weight, priceMinor: null, priceText: quote ? 'Included' : 'Unavailable' })) });
  };
  const layers = config.structure?.layers || 1;
  const individual = layers > 1 && config.structure?.layerDesign === 'individual';
  const fundamentals = [['Tiers', `${layers} tier(s) · ${config.realSize?.diameter || ''} in diameter · ${config.realSize?.height || ''} in height`, ['base.standard', `size.${config.structure?.size || 'big'}`, 'tier.additional']]];
  for (let i = 0; i < (individual ? layers : 1); i++) {
    const prefix = individual ? `Tier ${i + 1} ` : '';
    const sponge = individual ? config.sponge?.layerFlavors?.[i] || config.sponge?.flavor : config.sponge?.flavor;
    fundamentals.push([`${prefix}Sponge Flavor`, name(sponge), [`sponge.${sponge}`]]);
    const fillingFlavor = individual ? config.filling?.layerFlavors?.[i] || config.filling?.flavor : config.filling?.flavor;
    if (config.filling?.enabled) fundamentals.push([`${prefix}Filling`, `${name(fillingFlavor)} · ${config.filling.layers} filling layer(s)`, ['filling.layer', `filling.${fillingFlavor}`]]);
    const finish = config.exteriorFinish || {};
    const style = individual ? finish.layerStyles?.[i] || finish.style : finish.style;
    const flavor = individual ? finish.layerFlavors?.[i] || finish.flavor : finish.flavor;
    const texture = individual ? finish.layerButtercreamTextures?.[i] || finish.buttercreamTexture : finish.buttercreamTexture;
    fundamentals.push([`${prefix}Exterior Finish`, [name(style), style !== 'naked' && name(flavor), style === 'texturedButtercream' && name(texture)].filter(Boolean).join(' · '), [`finish.${style}`, ...(style !== 'naked' ? [`frosting.${flavor}`] : []), ...(style === 'texturedButtercream' ? [`texture.${texture}`] : [])]]);
    const surface = individual ? config.surfaceTreatment?.layerTreatments?.[i] || config.surfaceTreatment : config.surfaceTreatment;
    if (surface?.mode) fundamentals.push([`${prefix}Surface Treatment`, `${name(surface.mode)} · ${name(surface.pattern)}`, [`surface.${surface.mode}`]]);
  }
  if (config.filling?.enabled && config.filling.piping?.tip) fundamentals.push(['Filling Piping', `${name(config.filling.piping.tip)} · ${name(config.filling.piping.colorId)}`, ['edge.piping']]);
  if (config.sugarColor?.mode === 'colorOverride') fundamentals.push(['Sugar Color', name(config.sugarColor.colorId), [`color.${config.sugarColor.colorId}`]]);
  Object.entries(config.sugarColorOverrides || {}).forEach(([context, color]) => {
    if (color?.mode === 'colorOverride' && color.colorId) fundamentals.push([`${name(context)} Color`, name(color.colorId), [`color.${color.colorId}`]]);
  });
  addSection('Fundamentals', fundamentals);
  const sideItems = [];
  for (let i = 0; i < (individual ? layers : 1); i++) {
    const side = individual ? config.side?.layerTreatments?.[i] || config.side : config.side;
    if (side?.mode) {
      const choice = side[side.mode] || {};
      sideItems.push([`${individual ? `Tier ${i + 1} ` : ''}${name(side.mode)}`, [name(choice.setId), name(choice.colorId), choice.flavorId && name(choice.flavorId)].filter(Boolean).join(' · '), [`side.${side.mode}`, 'side.treatment']]);
    }
  }
  addSection('Side', sideItems);
  const center = [];
  if (config.center?.mode === 'text') {
    ['top', 'middle', 'bottom'].forEach((slot) => {
      if (config.center.text?.[slot]) center.push([`${name(slot)} Text`, `${config.center.text[slot]} · ${name(config.center.text.font)}`, ['center.customText']]);
    });
  }
  (config.place?.items || []).forEach((item) => center.push(['Placed Decoration', `${name(item.designId || item.type)} · position ${JSON.stringify(item.position || { x: item.x, y: item.y, z: item.z })}`, [`placed.${item.type || item.designId}`]]));
  addSection('Center', center);
  const edges = [];
  const slots = config.edge?.mode === 'both' ? ['both', ...(layers > 1 ? ['middle'] : [])] : ['top', ...(layers > 1 ? ['middle'] : []), 'bottom'];
  slots.forEach((slot) => {
    const edge = config.edge?.[slot];
    if (edge?.piping?.tip) edges.push([`${name(slot)} Border Piping`, `${name(edge.piping.tip)} · ${name(edge.piping.colorId)}${edge.piping.secondaryColorId ? ` / ${name(edge.piping.secondaryColorId)}` : ''}`, ['edge.piping'], slot === 'both' ? 2 : 1]);
    if (edge?.decorations?.setId) edges.push([`${name(slot)} Edge Decoration`, `${name(edge.decorations.setId)} · ${name(edge.decorations.colorId)}`, ['edge.decorationSet'], slot === 'both' ? 2 : 1]);
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
