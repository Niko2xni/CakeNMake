import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './cakeConfig';
import { buildBlueprintDetails } from './blueprintDetails';
import { buildBlueprintPdf } from './blueprintPdf';

describe('internal blueprint', () => {
  it('preserves quote charges and total without assigning invented decoration prices', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.side.mode = 'sunshinePlay';
    config.side.sunshinePlay.setId = 'skyChumps';
    config.center.mode = 'text';
    config.center.text.top = 'Legacy invisible text';
    config.place.items = [{ type: 'center-letterUpperH-default', x: 0, z: 0 }];
    const quote = { pricingVersion: 3, currency: 'PHP', totalMinor: 195000, lineItems: [{ componentKey: 'base.standard', label: 'Standard Base Cake', quantity: 1, lineTotalMinor: 195000 }] };
    const details = buildBlueprintDetails(config, quote, 'Actual design');
    expect(details.totalMinor).toBe(195000);
    expect(details.sections.find((s) => s.title === 'Side').items[0].detail).toContain('Sky Chumps');
    expect(details.sections.find((s) => s.title === 'Center').items[0].detail).toContain('letter Upper H');
    expect(details.sections[0].items[0].priceMinor).toBe(195000);
    expect(details.sections.some((s) => s.title.startsWith('Pricing quote'))).toBe(false);
    expect(details.sections.flatMap((s) => s.items).some((r) => r.priceText === 'See quote')).toBe(false);
    expect(buildBlueprintPdf({ details }).getNumberOfPages()).toBe(3);
  });
  it('combines structure charges and splits shared piping without losing cents', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.edge.top.piping.tip = 'shell';
    config.edge.bottom.piping.tip = 'shell';
    const quote = { totalMinor: 195501, lineItems: [
      { componentKey: 'base.standard', lineTotalMinor: 110000 },
      { componentKey: 'size.big', lineTotalMinor: 85000 },
      { componentKey: 'edge.piping', lineTotalMinor: 501 },
      { componentKey: 'sponge.vanilla', lineTotalMinor: 0 },
    ] };
    const details = buildBlueprintDetails(config, quote);
    const rows = details.sections.flatMap((s) => s.items);
    expect(rows.find((r) => r.label === 'Tiers').priceMinor).toBe(195000);
    expect(rows.find((r) => r.label === 'Sponge Flavor').priceMinor).toBe(0);
    expect(rows.reduce((sum, r) => sum + (r.priceMinor || 0), 0)).toBe(quote.totalMinor);
    expect(details.sections.find((s) => s.title === 'Edge').items.map((r) => r.priceMinor)).toEqual([250, 251]);
  });
  it('uses tier-specific choices and omits inactive treatments', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure.layers = 2;
    config.structure.layerDesign = 'individual';
    config.sponge.layerFlavors = ['chocolate', 'ube'];
    config.side.layerTreatments = [{ mode: null }, { mode: 'sunshinePlay', sunshinePlay: { setId: 'skyChumps', colorId: 'vanilla' } }];
    const details = buildBlueprintDetails(config, null);
    expect(details.totalMinor).toBeNull();
    const rows = details.sections[0].items;
    expect(rows.find((r) => r.label === 'Tier 1 Sponge Flavor').detail).toBe('Chocolate');
    expect(rows.find((r) => r.label === 'Tier 2 Sponge Flavor').detail).toBe('Ube');
    expect(details.sections.find((s) => s.title === 'Side').items).toHaveLength(1);
    expect(details.sections.some((s) => s.title === 'Edge')).toBe(false);
  });
  it('lists all four Petit Fours variants when each piece is configured individually', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure = { ...config.structure, cakeFormat: 'petitsFour', format: 'petitsFour', size: 'classicCube', layers: 1, layerDesign: 'individual' };
    config.sponge.layerFlavors = ['vanilla', 'chocolate', 'ube', 'vanilla'];
    const details = buildBlueprintDetails(config, null);
    const rows = details.sections[0].items;
    expect(rows[0].label).toBe('Format');
    expect(rows[0].detail).toContain('Petit Fours');
    expect(rows.find((r) => r.label === 'Variant 1 Sponge Flavor').detail).toBe('Vanilla');
    expect(rows.find((r) => r.label === 'Variant 2 Sponge Flavor').detail).toBe('Chocolate');
    expect(rows.find((r) => r.label === 'Variant 3 Sponge Flavor').detail).toBe('Ube');
    expect(rows.find((r) => r.label === 'Variant 4 Sponge Flavor').detail).toBe('Vanilla');
  });
  it('wraps long details onto additional pages', () => {
    const details = { sections: [{ title: 'Center', items: Array.from({ length: 60 }, () => ({ label: 'Decoration', detail: 'Long selected design detail '.repeat(10), priceText: 'See quote' })) }] };
    expect(buildBlueprintPdf({ details }).getNumberOfPages()).toBeGreaterThan(3);
  });
});
