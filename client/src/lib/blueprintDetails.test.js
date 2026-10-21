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
    expect(sidePage.treatmentId).toBe('sunshinePlay');
    expect(sidePage.variantId).toBe('skyChumps');
    expect(sidePage.pattern.treatmentId).toBe('sunshinePlay');
    expect(sidePage.pattern.variantId).toBe('skyChumps');

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

  it('renders exterior finish page just like fundamentals with flavor and finish bubbles', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.exteriorFinish = { style: 'texturedButtercream', flavor: 'chocolate', buttercreamTexture: 'horizontalStripes' };
    config.sugarColorOverrides = { exterior: { mode: 'colorOverride', colorId: 'pink' } };

    const plan = buildBlueprintTierPlan(config);
    const finishPage = plan.groups[0].pages.find((p) => p.kind === 'finish');
    expect(finishPage).toBeDefined();
    expect(finishPage.section).toBe('EXTERIOR FINISH');
    expect(finishPage.flavorName).toBe('Pink');
    expect(finishPage.crops[0].label).toBe('FLAVOR');
    expect(finishPage.crops[0].sub).toBe('Pink');
    expect(finishPage.crops[0].chipColor).toBe('#F5A9C0'); // Pink sugar color
    expect(finishPage.finish.label).toBe('EXTERIOR FINISH');
    expect(finishPage.finish.sub).toContain('Textured');
    expect(finishPage.finish.sub).toContain('Horizontal Stripes');

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
    expect(details.sections.find((s) => s.title === 'Center').items[0].label).toBe("Letter 'H'");
    expect(details.sections.find((s) => s.title === 'Center').items[0].detail).toContain('placed on top of the cake');
    expect(details.sections[0].items[0].priceMinor).toBe(195000);
    expect(details.sections.some((s) => s.title.startsWith('Pricing quote'))).toBe(false);
    expect(details.sections.flatMap((s) => s.items).some((r) => r.priceText === 'See quote')).toBe(false);
    expect(buildBlueprintPdf({ details }).getNumberOfPages()).toBe(3);
  });

  it('compacts repeated center decorations by decoration kind and shows N times count', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.place.items = Array.from({ length: 10 }, () => ({
      type: 'center-strawberry-default',
      designId: 'strawberry',
      x: 0,
      z: 0,
    }));
    const details = buildBlueprintDetails(config, null);
    const centerSection = details.sections.find((s) => s.title === 'Center');
    expect(centerSection).toBeDefined();
    expect(centerSection.items).toHaveLength(1);
    expect(centerSection.items[0].label).toBe('Strawberry');
    expect(centerSection.items[0].detail).toBe('10×, placed on top of the cake');
  });

  it('groups multiple center decoration kinds separately with their respective counts', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.place.items = [
      ...Array.from({ length: 6 }, () => ({ type: 'center-strawberry-default', designId: 'strawberry', x: 0, z: 0 })),
      ...Array.from({ length: 4 }, () => ({ type: 'center-blueberry-default', designId: 'blueberry', x: 0, z: 0 })),
    ];
    const details = buildBlueprintDetails(config, null);
    const centerSection = details.sections.find((s) => s.title === 'Center');
    expect(centerSection).toBeDefined();
    expect(centerSection.items).toHaveLength(2);
    expect(centerSection.items[0].label).toBe('Strawberry');
    expect(centerSection.items[0].detail).toBe('6×, placed on top of the cake');
    expect(centerSection.items[1].label).toBe('Blueberry');
    expect(centerSection.items[1].detail).toBe('4×, placed on top of the cake');
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
  it('configures close-up pattern zoom focusing from top to bottom on pattern stages', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.side = { mode: 'chevronPattern', chevronPattern: { setId: 'singleColor', colorId: 'vanilla' } };
    config.surfaceTreatment = { mode: 'glaze', pattern: 'longGaps' };
    config.filling = { enabled: true, layers: 1, flavor: 'vanilla', piping: { tip: 'mashedCircles' } };
    const plan = buildBlueprintTierPlan(config);

    const sideBack = plan.stages.find((s) => s.key === 'side-back');
    expect(sideBack?.zoom).toBeDefined();
    expect(sideBack.zoom.mode).toBe('pattern');
    expect(sideBack.zoom.fullHeight).toBe(true);
    expect(sideBack.zoom.fit).toBe(1.0);

    const surfaceBack = plan.stages.find((s) => s.key === 'surface-back');
    expect(surfaceBack?.zoom).toBeDefined();
    expect(surfaceBack.zoom.mode).toBe('pattern');
    expect(surfaceBack.zoom.fullHeight).toBe(true);
    expect(surfaceBack.zoom.fit).toBe(1.0);

    const fillingZoom = plan.stages.find((s) => s.key === 'filling-zoom-0');
    expect(fillingZoom?.zoom).toBeDefined();
    expect(fillingZoom.zoom.fit).toBe(1.0);

    const details = buildBlueprintDetails(config, null);
    const doc = buildBlueprintPdf({
      details,
      tiers: { groups: plan.groups, images: {}, anchors: {} },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('renders pattern icon bubbles representing each side design cleanly in blueprint PDF', () => {
    const treatments = [
      { mode: 'checkeredPattern', set: 'rightDiagonal' },
      { mode: 'trianglePattern', set: 'xPattern' },
      { mode: 'chevronPattern', set: 'wideZigzag' },
      { mode: 'scatterPearls', set: 'diamondGrid' },
      { mode: 'pipingScrolls', set: 'fleurDeLisRow' },
      { mode: 'sunshinePlay', set: 'starBurst' },
      { mode: 'victorianLambeth', set: 'doubleBand' },
    ];

    for (const t of treatments) {
      const config = structuredClone(DEFAULT_CONFIG);
      config.side = { mode: t.mode, [t.mode]: { setId: t.set, colorId: 'chocolate' } };
      const plan = buildBlueprintTierPlan(config);
      const sidePage = plan.groups[0].pages.find((p) => p.kind === 'side');
      expect(sidePage).toBeDefined();
      expect(sidePage.treatmentId).toBe(t.mode);
      expect(sidePage.variantId).toBe(t.set);
      expect(sidePage.pattern.treatmentId).toBe(t.mode);
      expect(sidePage.pattern.variantId).toBe(t.set);

      const details = buildBlueprintDetails(config, null);
      const doc = buildBlueprintPdf({
        details,
        tiers: { groups: plan.groups, images: {}, anchors: {} },
      });
      expect(doc.getNumberOfPages()).toBeGreaterThan(3);
    }
  });

  it('resolves actual flavor color for drip surface treatment, side design, and exterior finish', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.surfaceTreatment = { mode: 'glaze', pattern: 'longGaps' };
    config.sugarColorOverrides = { surface: { mode: 'default', colorId: 'chocolate' } };
    config.side = { mode: 'checkeredPattern', checkeredPattern: { setId: 'straightGrid', colorId: 'strawberry' } };
    config.exteriorFinish = { style: 'smoothButtercream', flavor: 'ube' };

    const plan = buildBlueprintTierPlan(config);
    const surfacePage = plan.groups[0].pages.find((p) => p.kind === 'surface');
    const sidePage = plan.groups[0].pages.find((p) => p.kind === 'side');
    const finishPage = plan.groups[0].pages.find((p) => p.kind === 'finish');

    expect(surfacePage.flavorName).toBe('Chocolate');
    expect(surfacePage.flavorChipColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(surfacePage.flavorChipColor).not.toBe('#F6DEAB');

    expect(sidePage.flavorName).toBe('Strawberry');
    expect(sidePage.flavorChipColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(sidePage.flavorChipColor).not.toBe('#F6DEAB');

    expect(finishPage.flavorName).toBe('Ube');
    expect(finishPage.flavorChipColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(finishPage.flavorChipColor).not.toBe('#F6DEAB');

    const details = buildBlueprintDetails(config, null);
    const doc = buildBlueprintPdf({
      details,
      tiers: {
        groups: plan.groups,
        images: {},
        anchors: {
          'surface-front': { [surfacePage.crops[0].anchorId]: { color: '#3D2314', x: 0.5, y: 0.3 } },
        },
        fillColors: {
          'surface-front': '#3D2314',
          'side-front': '#E85B7A',
          finish: '#7D4194',
        },
      },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('renders side-by-side 2D schematics vs 3D render across all side design treatments and drip patterns', () => {
    const treatments = [
      { mode: 'checkeredPattern', set: 'straightGrid', drip: 'longGaps' },
      { mode: 'trianglePattern', set: 'rightDiagonal', drip: 'naturalTear2' },
      { mode: 'chevronPattern', set: 'tightZigzag', drip: 'shortWave' },
      { mode: 'scatterPearls', set: 'diamondGrid', drip: 'draped' },
      { mode: 'pipingScrolls', set: 'fleurDeLisRow', drip: 'tinyTip' },
      { mode: 'sunshinePlay', set: 'skyChumps', drip: 'longGaps' },
      { mode: 'victorianLambeth', set: 'classic', drip: 'shortWave' },
    ];

    for (const t of treatments) {
      const config = structuredClone(DEFAULT_CONFIG);
      config.side = { mode: t.mode, [t.mode]: { setId: t.set, colorId: 'chocolate' } };
      config.surfaceTreatment = { mode: 'glaze', pattern: t.drip };
      config.sugarColorOverrides = {
        surface: { mode: 'default', colorId: 'chocolate' },
        side: { mode: 'colorOverride', colorId: 'strawberry' },
      };

      const plan = buildBlueprintTierPlan(config);
      const details = buildBlueprintDetails(config, null);
      const doc = buildBlueprintPdf({
        details,
        tiers: {
          groups: plan.groups,
          images: {
            'surface-front': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'side-front': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
          anchors: {},
          fillColors: { 'surface-front': '#3D2314', 'side-front': '#E85B7A' },
        },
      });

      expect(doc.getNumberOfPages()).toBeGreaterThan(4);
    }
  });

  it('renders 2D pattern drawing based on actual 3D render contour array', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.surfaceTreatment = { mode: 'glaze', pattern: 'longGaps' };
    config.sugarColorOverrides = { surface: { mode: 'default', colorId: 'chocolate' } };

    const plan = buildBlueprintTierPlan(config);
    const details = buildBlueprintDetails(config, null);

    // Simulate 3D render contour points extracted from roleMask['pattern']
    const mock3DRenderContour = [];
    for (let i = 0; i <= 50; i++) {
      const x = i / 50;
      // Wavy drip profile with crests and drops
      const y = 0.2 + 0.35 * Math.sin(x * Math.PI * 4) ** 2;
      mock3DRenderContour.push({ x, y });
    }

    const doc = buildBlueprintPdf({
      details,
      tiers: {
        groups: plan.groups,
        images: {
          'surface-front': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
        anchors: {},
        fillColors: { 'surface-front': '#3D2314' },
        contours: { 'surface-front': mock3DRenderContour },
      },
    });

    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('uses rich dark chocolate drip color for chocolate surface treatment in 2D pattern drawing', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.surfaceTreatment = { mode: 'glaze', pattern: 'longGaps' };
    config.sugarColorOverrides = { surface: { mode: 'colorOverride', colorId: 'chocolate' } };

    const plan = buildBlueprintTierPlan(config);
    const surfacePage = plan.groups[0].pages.find((p) => p.kind === 'surface');
    expect(surfacePage).toBeDefined();
    expect(surfacePage.flavorName).toBe('Chocolate');
    // Dark chocolate color #301009 instead of crumbBase #7A4433
    expect(surfacePage.flavorChipColor).toBe('#301009');
    expect(surfacePage.crops[0].chipColor).toBe('#301009');

    const details = buildBlueprintDetails(config, null);
    // When 3D render samples actual dark drip pixel #301009
    const doc = buildBlueprintPdf({
      details,
      tiers: {
        groups: plan.groups,
        images: {
          'surface-front': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
        anchors: {},
        fillColors: { 'surface-front': '#301009' },
      },
    });

    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('accurately resolves every selected color in surface treatment for the 2D pattern drawing', () => {
    const testCases = [
      { mode: 'default', colorId: 'strawberry', expectedName: 'Strawberry', expectedHex: '#F4A8A0' },
      { mode: 'default', colorId: 'ube', expectedName: 'Ube', expectedHex: '#6B4F82' },
      { mode: 'default', colorId: 'cheese', expectedName: 'Cheese', expectedHex: '#FFF4C2' },
      { mode: 'default', colorId: 'vanilla', expectedName: 'Vanilla', expectedHex: '#F5E6C8' },
      { mode: 'default', colorId: 'mocha', expectedName: 'Mocha', expectedHex: '#C08A5C' },
      { mode: 'colorOverride', colorId: 'pink', expectedName: 'Pink', expectedHex: '#F5A9C0' },
      { mode: 'colorOverride', colorId: 'red', expectedName: 'Red', expectedHex: '#D6293E' },
      { mode: 'colorOverride', colorId: 'black', expectedName: 'Black', expectedHex: '#2B2B2B' },
      { mode: 'colorOverride', colorId: 'gold', expectedName: 'Gold', expectedHex: '#C9A24B' },
      { mode: 'colorOverride', colorId: '#FF69B4', expectedName: '#FF69B4', expectedHex: '#FF69B4' },
    ];

    for (const tc of testCases) {
      const config = structuredClone(DEFAULT_CONFIG);
      config.surfaceTreatment = { mode: 'glaze', pattern: 'longGaps' };
      config.sugarColorOverrides = { surface: { mode: tc.mode, colorId: tc.colorId } };

      const plan = buildBlueprintTierPlan(config);
      const surfacePage = plan.groups[0].pages.find((p) => p.kind === 'surface');
      expect(surfacePage).toBeDefined();
      expect(surfacePage.flavorName).toBe(tc.expectedName);
      expect(surfacePage.flavorChipColor).toBe(tc.expectedHex);
      expect(surfacePage.crops[0].chipColor).toBe(tc.expectedHex);
      expect(surfacePage.patternId).toBe('longGaps');

      const details = buildBlueprintDetails(config, null);
      const doc = buildBlueprintPdf({
        details,
        tiers: {
          groups: plan.groups,
          images: {
            'surface-front': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          },
          anchors: {},
          fillColors: {},
        },
      });

      expect(doc.getNumberOfPages()).toBeGreaterThan(3);
    }
  });

  it('applies 2D pattern schematic for exterior finish only when textured, fundamentals style otherwise', () => {
    // 1. Textured Buttercream: should have isTextured = true
    const texturedConfig = structuredClone(DEFAULT_CONFIG);
    texturedConfig.exteriorFinish = { style: 'texturedButtercream', buttercreamTexture: 'ribbonWrap', flavor: 'strawberry' };
    const texturedPlan = buildBlueprintTierPlan(texturedConfig);
    const texturedFinishPage = texturedPlan.groups[0].pages.find((p) => p.kind === 'finish');
    expect(texturedFinishPage.isTextured).toBe(true);
    expect(texturedFinishPage.textureName).toBe('Ribbon Wrap');

    const texturedDoc = buildBlueprintPdf({
      details: buildBlueprintDetails(texturedConfig, null),
      tiers: { groups: texturedPlan.groups, images: {}, anchors: {} },
    });
    expect(texturedDoc.getNumberOfPages()).toBeGreaterThan(3);

    // 2. Fully Frosted: non-textured, displayed like Fundamentals
    const frostedConfig = structuredClone(DEFAULT_CONFIG);
    frostedConfig.exteriorFinish = { style: 'fullyFrosted', flavor: 'chocolate' };
    const frostedPlan = buildBlueprintTierPlan(frostedConfig);
    const frostedFinishPage = frostedPlan.groups[0].pages.find((p) => p.kind === 'finish');
    expect(frostedFinishPage.isTextured).toBe(false);

    const frostedDoc = buildBlueprintPdf({
      details: buildBlueprintDetails(frostedConfig, null),
      tiers: { groups: frostedPlan.groups, images: {}, anchors: {} },
    });
    expect(frostedDoc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('applies 2D pattern schematic for filling when piping is mashedCircles or mashedSwirls, fundamentals style when none', () => {
    // 1. Mashed Circles piping: 2D pattern schematic
    const circlesConfig = structuredClone(DEFAULT_CONFIG);
    circlesConfig.filling = { enabled: true, layers: 2, flavor: 'chocolate', piping: { tip: 'mashedCircles', colorId: 'vanilla' } };
    const circlesPlan = buildBlueprintTierPlan(circlesConfig);
    const circlesFillingPage = circlesPlan.groups[0].pages.find((p) => p.kind === 'filling');
    expect(circlesFillingPage.pipingTip).toBe('mashedCircles');

    const circlesDoc = buildBlueprintPdf({
      details: buildBlueprintDetails(circlesConfig, null),
      tiers: { groups: circlesPlan.groups, images: {}, anchors: {} },
    });
    expect(circlesDoc.getNumberOfPages()).toBeGreaterThan(3);

    // 2. Mashed Swirls piping: 2D pattern schematic
    const swirlsConfig = structuredClone(DEFAULT_CONFIG);
    swirlsConfig.filling = { enabled: true, layers: 1, flavor: 'ube', piping: { tip: 'mashedSwirls', colorId: 'strawberry' } };
    const swirlsPlan = buildBlueprintTierPlan(swirlsConfig);
    const swirlsFillingPage = swirlsPlan.groups[0].pages.find((p) => p.kind === 'filling');
    expect(swirlsFillingPage.pipingTip).toBe('mashedSwirls');

    const swirlsDoc = buildBlueprintPdf({
      details: buildBlueprintDetails(swirlsConfig, null),
      tiers: { groups: swirlsPlan.groups, images: {}, anchors: {} },
    });
    expect(swirlsDoc.getNumberOfPages()).toBeGreaterThan(3);

    // 3. No piping (Plain / None): Fundamentals style
    const plainConfig = structuredClone(DEFAULT_CONFIG);
    plainConfig.filling = { enabled: true, layers: 1, flavor: 'vanilla', piping: null };
    const plainPlan = buildBlueprintTierPlan(plainConfig);
    const plainFillingPage = plainPlan.groups[0].pages.find((p) => p.kind === 'filling');
    expect(plainFillingPage.pipingTip).toBeNull();

    const plainDoc = buildBlueprintPdf({
      details: buildBlueprintDetails(plainConfig, null),
      tiers: { groups: plainPlan.groups, images: {}, anchors: {} },
    });
    expect(plainDoc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('applies 2D pattern schematic for side and edge borders', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.side = { mode: 'victorianLambeth', victorianLambeth: { setId: 'doubleBand', colorId: 'pink' } };
    config.edge = {
      mode: 'both',
      top: { piping: { tip: 'shell', colorId: 'chocolate' } },
      bottom: { piping: { tip: 'ropeTwist', colorId: 'vanilla', secondaryColorId: 'chocolate' } },
      both: { piping: { tip: 'shell', colorId: 'chocolate' } },
    };

    const plan = buildBlueprintTierPlan(config);
    const sidePage = plan.groups[0].pages.find((p) => p.kind === 'side');
    expect(sidePage).toBeDefined();

    const edgePages = plan.groups[plan.groups.length - 1].pages.filter((p) => p.kind === 'edge');
    expect(edgePages.length).toBe(2);
    expect(edgePages[0].slot).toBe('top');
    expect(edgePages[0].designId).toBe('shell');
    expect(edgePages[1].slot).toBe('bottom');
    expect(edgePages[1].designId).toBe('shell');

    const doc = buildBlueprintPdf({
      details: buildBlueprintDetails(config, null),
      tiers: { groups: plan.groups, images: {}, anchors: {} },
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
  });

  it('correctly handles edge colors (only alternating variants have secondary color) and configures close-up zooms for finish and edges', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.exteriorFinish = { style: 'texturedButtercream', buttercreamTexture: 'ribbonWrap', flavor: 'mocha' };
    config.edge = {
      mode: 'individual',
      top: { piping: { tip: 'ropeTwistClassic', colorId: 'vanilla', secondaryColorId: 'red' } },
      bottom: { piping: { tip: 'ropeTwistAlt', colorId: 'vanilla', secondaryColorId: 'red' } },
    };

    const plan = buildBlueprintTierPlan(config);

    // Textured finish stage has close-up zoom
    const finishStage = plan.stages.find((s) => s.key === 'finish');
    expect(finishStage?.zoom).toBeDefined();
    expect(finishStage.zoom.mode).toBe('pattern');
    expect(finishStage.zoom.fullHeight).toBe(true);

    // Edge stages have close-up zoom
    const topEdgeStage = plan.stages.find((s) => s.key === 'edge-top');
    expect(topEdgeStage?.zoom).toBeDefined();
    expect(topEdgeStage.zoom.mode).toBe('edge');
    expect(topEdgeStage.zoom.position).toBe('top');

    const botEdgeStage = plan.stages.find((s) => s.key === 'edge-bottom');
    expect(botEdgeStage?.zoom).toBeDefined();
    expect(botEdgeStage.zoom.position).toBe('bottom');

    // Edge pages: ropeTwistClassic is not alternating, so secondary color is ignored
    const edgePages = plan.groups[plan.groups.length - 1].pages.filter((p) => p.kind === 'edge');
    const topPage = edgePages.find((p) => p.slot === 'top');
    expect(topPage.colorName).toBe('Vanilla');
    expect(topPage.secondaryColor).toBeNull();

    // ropeTwistAlt is alternating, so secondary color is included
    const botPage = edgePages.find((p) => p.slot === 'bottom');
    expect(botPage.colorName).toBe('Vanilla / Red');
    expect(botPage.secondaryColor).toBe('#D6293E');

    const details = buildBlueprintDetails(config, null);
    const topEdgeDetail = details.sections.find((s) => s.title === 'Edge').items.find((i) => i.label.includes('Top Border Piping'));
    expect(topEdgeDetail.detail).toBe('Rope Twist Classic · Vanilla');
  });
});


