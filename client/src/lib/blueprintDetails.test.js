import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './cakeConfig';
import { buildBlueprintDetails } from './blueprintDetails';
import { buildBlueprintPdf } from './blueprintPdf';

import { buildBlueprintTierPlan } from './blueprintStages';

describe('internal blueprint', () => {
  it('renders surface treatment page with flavor and pattern like filling', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.surfaceTreatment = { mode: 'glaze', pattern: 'longGaps' };
    config.sugarColorOverrides = { surface: { mode: 'colorOverride', colorId: 'white' } };
    const plan = buildBlueprintTierPlan(config);
    const surfacePage = plan.groups[0].pages.find((p) => p.kind === 'surface');
    expect(surfacePage).toBeDefined();
    expect(surfacePage.flavorName).toBe('White');
    expect(surfacePage.flavorChipColor).toBe('#FBFBF8');
    expect(surfacePage.patternName).toBe('Natural Tear');
    expect(surfacePage.crops[0].label).toBe('FLAVOR');
    expect(surfacePage.pattern.label).toBe('PATTERN');
    expect(surfacePage.image).toBe('surface-front');
    expect(surfacePage.zoomImage).toBe('surface-back');

    const frontStage = plan.stages.find((s) => s.key === 'surface-front');
    const backStage = plan.stages.find((s) => s.key === 'surface-back');
    expect(frontStage).toBeDefined();
    expect(frontStage.azimuth).toBe(18);
    expect(frontStage.fit).toBe(0.86);
    expect(backStage).toBeDefined();
    expect(backStage.azimuth).toBe(198);
    expect(backStage.fit).toBe(0.86);

    const details = buildBlueprintDetails(config, null);
    const doc = buildBlueprintPdf({
      details,
      tiers: { groups: plan.groups, images: {}, anchors: {} },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('renders side design page with flavor and pattern like filling without surface treatment', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.surfaceTreatment = { mode: 'glaze', pattern: 'longGaps' }; // active surface treatment
    config.side = { mode: 'sunshinePlay', sunshinePlay: { setId: 'skyChumps', colorId: 'pink' } };
    config.sugarColorOverrides = { side: { mode: 'colorOverride', colorId: 'pink' } };
    const plan = buildBlueprintTierPlan(config);
    const sidePage = plan.groups[0].pages.find((p) => p.kind === 'side');
    expect(sidePage).toBeDefined();
    expect(sidePage.flavorName).toBe('Pink');
    expect(sidePage.flavorChipColor).toBe('#F5A9C0');
    expect(sidePage.crops[0].label).toBe('FLAVOR');
    expect(sidePage.pattern.label).toBe('PATTERN');
    expect(sidePage.image).toBe('side-front');
    expect(sidePage.zoomImage).toBe('side-back');
    expect(sidePage.baseTypeDisplay).toBe('NAKED + SIDE');

    // When exterior finish is frosted
    const frostedConfig = structuredClone(config);
    frostedConfig.exteriorFinish = { style: 'buttercream', flavor: 'vanilla' };
    const frostedPlan = buildBlueprintTierPlan(frostedConfig);
    const frostedSidePage = frostedPlan.groups[0].pages.find((p) => p.kind === 'side');
    expect(frostedSidePage.baseTypeDisplay).toBe('FROSTED + SIDE');

    // When exterior finish is textured
    const texturedConfig = structuredClone(config);
    texturedConfig.exteriorFinish = { style: 'texturedButtercream', buttercreamTexture: 'horizontalStripes' };
    const texturedPlan = buildBlueprintTierPlan(texturedConfig);
    const texturedSidePage = texturedPlan.groups[0].pages.find((p) => p.kind === 'side');
    expect(texturedSidePage.baseTypeDisplay).toBe('TEXTURE + SIDE');

    const frontStage = plan.stages.find((s) => s.key === 'side-front');
    const backStage = plan.stages.find((s) => s.key === 'side-back');
    expect(frontStage).toBeDefined();
    expect(frontStage.azimuth).toBe(18);
    expect(frontStage.fit).toBe(0.86);
    // Crucially: side stage must NOT include surface treatment!
    expect(frontStage.config.surfaceTreatment?.mode).toBeNull();
    expect(backStage).toBeDefined();
    expect(backStage.azimuth).toBe(198);
    expect(backStage.fit).toBe(0.86);
    expect(backStage.config.surfaceTreatment?.mode).toBeNull();

    const details = buildBlueprintDetails(config, null);
    const doc = buildBlueprintPdf({
      details,
      tiers: { groups: plan.groups, images: {}, anchors: {} },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('renders center decorations page with top view angle and concise placement details without pointing arrows', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    // 10 strawberries placed along the rear perimeter, matching user's case
    config.place = {
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `straw-${i}`,
        type: 'center-strawberry-default',
        x: -1.5 + (i * 3) / 9,
        z: -1.2 - Math.sin((i / 9) * Math.PI) * 0.4,
      })),
    };

    const plan = buildBlueprintTierPlan(config);
    const centerStage = plan.stages.find((s) => s.key === 'center');
    expect(centerStage).toBeDefined();
    expect(centerStage.tilt).toBe(90); // Top view
    expect(centerStage.azimuth).toBe(0);
    expect(centerStage.fit).toBe(0.85);

    const centerPage = plan.groups.flatMap((g) => g.pages).find((p) => p.kind === 'center');
    expect(centerPage).toBeDefined();
    // Must NOT have pointing callouts/arrows
    expect(centerPage.callouts).toHaveLength(0);
    // 10 identical strawberries are grouped into 1 concise row instead of 10 repeated lines
    expect(centerPage.details).toHaveLength(1);
    expect(centerPage.details[0][0]).toBe('Strawberry (×10)');
    expect(centerPage.details[0][1]).toContain('Circular arc along rear perimeter');

    const details = buildBlueprintDetails(config, null);
    const doc = buildBlueprintPdf({
      details,
      tiers: { groups: plan.groups, images: {}, anchors: {} },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

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
