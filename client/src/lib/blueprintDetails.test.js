import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './cakeConfig';
import { buildBlueprintDetails } from './blueprintDetails';
import { buildBlueprintPdf } from './blueprintPdf';

describe('internal blueprint', () => {
  it('preserves quote charges and total without assigning invented decoration prices', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.side.mode = 'sunshinePlay';
    config.side.sunshinePlay.setId = 'starryRainbow';
    config.center.mode = 'text';
    config.center.text.top = 'Happy birthday';
    const quote = { pricingVersion: 3, currency: 'PHP', totalMinor: 195000, lineItems: [{ componentKey: 'base.standard', label: 'Standard Base Cake', quantity: 1, lineTotalMinor: 195000 }] };
    const details = buildBlueprintDetails(config, quote, 'Actual design');
    expect(details.totalMinor).toBe(195000);
    expect(details.sections.find((s) => s.title === 'Side').items[0].detail).toContain('Starry Rainbow');
    expect(details.sections.find((s) => s.title === 'Center').items[0].detail).toContain('Happy birthday');
    expect(details.sections.at(-1).items[0].priceMinor).toBe(195000);
    expect(buildBlueprintPdf({ details }).getNumberOfPages()).toBe(3);
  });
  it('uses tier-specific choices and omits inactive treatments', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.structure.layers = 2;
    config.structure.layerDesign = 'individual';
    config.sponge.layerFlavors = ['chocolate', 'ube'];
    config.side.layerTreatments = [{ mode: null }, { mode: 'sunshinePlay', sunshinePlay: { setId: 'starryRainbow', colorId: 'vanilla' } }];
    const details = buildBlueprintDetails(config, null);
    expect(details.totalMinor).toBeNull();
    const rows = details.sections[0].items;
    expect(rows.find((r) => r.label === 'Tier 1 Sponge Flavor').detail).toBe('Chocolate');
    expect(rows.find((r) => r.label === 'Tier 2 Sponge Flavor').detail).toBe('Ube');
    expect(details.sections.find((s) => s.title === 'Side').items).toHaveLength(1);
    expect(details.sections.some((s) => s.title === 'Edge')).toBe(false);
  });
  it('wraps long details onto additional pages', () => {
    const details = { sections: [{ title: 'Center', items: Array.from({ length: 60 }, () => ({ label: 'Decoration', detail: 'Long selected design detail '.repeat(10), priceText: 'See quote' })) }] };
    expect(buildBlueprintPdf({ details }).getNumberOfPages()).toBeGreaterThan(3);
  });
});
