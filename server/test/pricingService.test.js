const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQuote } = require('../src/services/pricingService');
const { nextManilaTenPm } = require('../src/controllers/priceBookController');

function item(componentKey, amount, displayName = componentKey, billingUnit = 'per_cake') {
  return { componentKey, displayName, billingUnit, costBasisMinor: amount, markupMinor: 0, isActive: true };
}

test('cake quote prices selected options and quantities from price book rates', () => {
  const priceBook = {
    version: 4,
    effectiveAt: new Date('2026-09-24T14:00:00.000Z'),
    rates: {
      sponge: {
        naked: { big: 1500, small: 700 },
        frosted: { big: 1700, small: 1000 },
      },
      twoTier: { naked: 2200, frosted: 2700 },
      glazePerTier: 100,
      sideEdge: { small: 100, big: 150 },
      center: {
        brackets: {
          cherry: [{ maxQty: 4, price: 175 }, { maxQty: 10, price: 250 }],
        },
        perPiece: {
          chocolateBear: 200,
        },
      },
    },
  };
  const quote = buildQuote({
    structure: { size: 'big', layers: 2 },
    sponge: { flavor: 'chocolate' },
    filling: { enabled: false },
    exteriorFinish: { style: 'fullyFrosted', flavor: 'vanilla' },
    place: { items: [{ type: 'center-cherry-default' }, { type: 'center-cherry-default' }] },
  }, priceBook);

  assert.equal(quote.pricingVersion, 4);
  // 2-tier frosted (₱2,700 = 270,000 centavos) + 2 cherries (1-4 bracket = ₱175 = 17,500 centavos) = 287,500 centav  assert.equal(quote.totalMinor, 287500);
  assert.equal(quote.lineItems.find((line) => line.componentKey === 'sponge').lineTotalMinor, 170000);
  assert.equal(quote.lineItems.find((line) => line.componentKey === 'sponge-top').lineTotalMinor, 100000);
  const cherryLine = quote.lineItems.find((line) => line.componentKey === 'center-decorations');
  assert.equal(cherryLine.lineTotalMinor, 17500);
  assert.deepEqual(cherryLine.details, ['Center Decorations:', 'Cherry x 2']);
  assert.deepEqual(quote.warnings, []);
});

test('square Bento sizes use their configured rates and show the correct dimensions', () => {
  for (const [size, dimension, nakedPrice, frostedPrice] of [
    ['squareBento2x2', '2x2', 40000, 50000],
    ['squareBento3x3', '3x3', 50000, 65000],
  ]) {
    const naked = buildQuote({
      structure: { cakeFormat: 'bento', format: 'bento', size, layers: 1, shape: 'square' },
      exteriorFinish: { style: 'naked' },
    });
    assert.equal(naked.lineItems[0].label, `1 Tier Naked Cake (${dimension})`);
    assert.equal(naked.lineItems[0].lineTotalMinor, nakedPrice);

    const frosted = buildQuote({
      structure: { cakeFormat: 'bento', format: 'bento', size, layers: 1, shape: 'square' },
      exteriorFinish: { style: 'fullyFrosted' },
    });
    assert.equal(frosted.lineItems[0].label, `1 Tier Frosted Cake (${dimension})`);
    assert.equal(frosted.lineItems[0].lineTotalMinor, frostedPrice);
  }
});

test('cake quote prices textured buttercream finish for single and two-tier cakes', () => {
  const priceBook = {
    version: 5,
    effectiveAt: new Date('2026-09-24T14:00:00.000Z'),
    rates: {
      sponge: {
        naked: { big: 1500, small: 700 },
        frosted: { big: 1700, small: 1000 },
        textured: { big: 1700, small: 1000 },
      },
      twoTier: { naked: 2200, frosted: 2700, textured: 2700 },
    },
  };

  // 1-Tier Small textured buttercream (Ribbon Wrap)
  const quote1Tier = buildQuote({
    structure: { size: 'small', layers: 1 },
    sponge: { flavor: 'chocolate' },
    filling: { enabled: true, flavor: 'strawberry', layers: 2, piping: { tip: 'shell', colorId: 'pink' } },
    exteriorFinish: { style: 'texturedButtercream', buttercreamTexture: 'ribbonWrap' },
  }, priceBook);
  assert.equal(quote1Tier.totalMinor, 100000); // ₱1,000
  assert.equal(quote1Tier.lineItems[0].label, '1 Tier Textured Cake (6x4)');
  assert.deepEqual(quote1Tier.lineItems[0].details, [
    '1 Tier',
    '6x4',
    'Textured: Ribbon Wrap',
    'Chocolate Sponge',
    'Filling: Strawberry (2 Layers)',
    'Piping Design: Shell',
    'Piping Sugar Color: Pink',
  ]);

  // 2-Tier textured buttercream set (split into independent Bottom and Top tiers with Ridge Comb default)
  const quote2Tier = buildQuote({
    structure: { size: 'big', layers: 2 },
    sponge: { flavor: 'vanilla' },
    filling: { enabled: false },
    exteriorFinish: { style: 'texturedButtercream' },
  }, priceBook);
  assert.equal(quote2Tier.totalMinor, 270000); // ₱2,700
  assert.equal(quote2Tier.lineItems[0].label, 'Bottom Tier Textured Cake (8x6)');
  assert.equal(quote2Tier.lineItems[0].lineTotalMinor, 170000); // ₱1,700
  assert.deepEqual(quote2Tier.lineItems[0].details, [
    'Bottom Tier',
    '8x6',
    'Textured: Ridge Comb',
    'Vanilla Sponge',
    'Filling: None',
    'Piping Design: None',
    'Piping Sugar Color: Vanilla',
  ]);
  assert.equal(quote2Tier.lineItems[1].label, 'Top Tier Textured Cake (6x4)');
  assert.equal(quote2Tier.lineItems[1].lineTotalMinor, 100000); // ₱1,000
  assert.deepEqual(quote2Tier.lineItems[1].details, [
    'Top Tier',
    '6x4',
    'Textured: Ridge Comb',
    'Vanilla Sponge',
    'Filling: None',
    'Piping Design: None',
    'Piping Sugar Color: Vanilla',
  ]);
});

test('piping sugar color registers dynamically when sugar color or filling flavor changes', () => {
  const priceBook = {
    sponge: {
      naked: { big: 150000, small: 90000 },
      frosted: { big: 170000, small: 100000 },
    },
    tierAdditional: 20000,
    flavorSurcharge: {},
  };

  // Test override color
  const quoteWithOverride = buildQuote({
    structure: { size: 'big', layers: 1 },
    exteriorFinish: { style: 'naked' },
    filling: { enabled: true, flavor: 'vanilla', layers: 1, piping: { tip: null, colorId: 'vanilla' } },
    sugarColorOverrides: {
      filling: { mode: 'colorOverride', colorId: 'mocha' },
    },
  }, priceBook);

  assert.ok(quoteWithOverride.lineItems[0].details.includes('Piping Design: None'));
  assert.ok(quoteWithOverride.lineItems[0].details.includes('Piping Sugar Color: Mocha'));

  // Test flavor matching
  const quoteWithFlavor = buildQuote({
    structure: { size: 'big', layers: 1 },
    exteriorFinish: { style: 'naked' },
    filling: { enabled: true, flavor: 'strawberry', layers: 1, piping: { tip: null, colorId: 'vanilla' } },
  }, priceBook);

  assert.ok(quoteWithFlavor.lineItems[0].details.includes('Piping Sugar Color: Strawberry'));
});

test('drip breakdown is included in Size details at ₱0 and does not emit separate line item', () => {
  // 1-Tier Drip
  const quote1 = buildQuote({
    structure: { size: 'big', layers: 1 },
    surfaceTreatment: { mode: 'glaze', pattern: 'longGaps' },
    sugarColorOverrides: { surface: { colorId: 'vanilla' } },
  });
  const dripLine1 = quote1.lineItems.find((l) => l.componentKey === 'glaze');
  assert.equal(dripLine1, undefined);
  const sizeLine = quote1.lineItems.find((l) => l.componentKey === 'sponge-size');
  assert.ok(sizeLine.details.includes('Drip: Long Drips (Included)'));

  // 2-Tier Drip
  const quote2 = buildQuote({
    structure: { size: 'big', layers: 2 },
    surfaceTreatment: { mode: 'glaze', pattern: 'longGaps' },
  });
  const dripTop = quote2.lineItems.find((l) => l.componentKey === 'glaze-top');
  const dripBottom = quote2.lineItems.find((l) => l.componentKey === 'glaze-bottom');
  assert.equal(dripTop, undefined);
  assert.equal(dripBottom, undefined);
  const bSize = quote2.lineItems.find((l) => l.componentKey === 'sponge-size-bottom');
  assert.ok(bSize.details.includes('Drip: Long Drips (Included)'));
});

test('next publication time is the next 10 PM in Manila', () => {
  assert.equal(nextManilaTenPm(new Date('2026-09-24T12:00:00.000Z')).toISOString(), '2026-09-24T14:00:00.000Z');
  assert.equal(nextManilaTenPm(new Date('2026-09-24T15:00:00.000Z')).toISOString(), '2026-09-25T14:00:00.000Z');
});

test('cake quote excludes center items colliding with Edge Ferrero Rocher from pricing', () => {
  const priceBook = {
    version: 1,
    effectiveAt: new Date('2026-09-24T14:00:00.000Z'),
    rates: {
      sponge: {
        frosted: { big: 1700, small: 1000 },
      },
      center: {
        brackets: {
          strawberry: [{ maxQty: 4, price: 150 }, { maxQty: 10, price: 200 }],
        },
      },
    },
  };

  // 1-Tier Big cake (top radius 4.0).
  // Item 1: at x=0, z=0 (Safe center)
  // Item 2: at x=3.4, z=0 (Outer rim, collides with Edge Ferrero)
  const configWithEdgeFerrero = {
    structure: { size: 'big', layers: 1 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
    edge: { mode: 'both', both: { pipingTip: 'ferreroRocherRim' } },
    place: {
      items: [
        { type: 'center-strawberry-default', x: 0, z: 0 },
        { type: 'center-strawberry-default', x: 3.4, z: 0 },
      ],
    },
  };

  const quote = buildQuote(configWithEdgeFerrero, priceBook);
  const strawberryLine = quote.lineItems.find((l) => l.componentKey === 'center-decorations');
  assert.ok(strawberryLine);
  // Only 1 safe strawberry is priced (quantity 1 in 1-4 bracket = ₱150 = 15,000 centavos)
  assert.deepEqual(strawberryLine.details, ['Center Decorations:', 'Strawberry x 1']);
  assert.equal(strawberryLine.lineTotalMinor, 15000);
});

test('cake quote excludes center items colliding with Hershey Kisses Rim and Cherry Rim from pricing', () => {
  const priceBook = {
    version: 1,
    effectiveAt: new Date('2026-09-24T14:00:00.000Z'),
    rates: {
      sponge: { frosted: { big: 1700, small: 1000 } },
      center: {
        brackets: {
          strawberry: [{ maxQty: 4, price: 150 }, { maxQty: 10, price: 200 }],
        },
      },
    },
  };

  // 1. Hershey's Kisses Rim
  const configKisses = {
    structure: { size: 'big', layers: 1 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
    edge: { mode: 'both', both: { pipingTip: 'hersheysKissRim' } },
    place: {
      items: [
        { type: 'center-strawberry-default', x: 0, z: 0 },
        { type: 'center-strawberry-default', x: 3.5, z: 0 }, // collides with kisses
      ],
    },
  };
  const quoteKisses = buildQuote(configKisses, priceBook);
  const strawbKisses = quoteKisses.lineItems.find((l) => l.componentKey === 'center-decorations');
  assert.deepEqual(strawbKisses.details, ['Center Decorations:', 'Strawberry x 1']);
  assert.equal(strawbKisses.lineTotalMinor, 15000);

  // 2. Cherry Rim
  const configCherry = {
    structure: { size: 'big', layers: 1 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
    edge: { mode: 'both', both: { pipingTip: 'cherryRim' } },
    place: {
      items: [
        { type: 'center-strawberry-default', x: 0, z: 0 },
        { type: 'center-strawberry-default', x: 3.6, z: 0 }, // collides with cherry rim
      ],
    },
  };
  const quoteCherry = buildQuote(configCherry, priceBook);
  const strawbCherry = quoteCherry.lineItems.find((l) => l.componentKey === 'center-decorations');
  assert.deepEqual(strawbCherry.details, ['Center Decorations:', 'Strawberry x 1']);
  assert.equal(strawbCherry.lineTotalMinor, 15000);
});

test('cake quote prices buttercream text across 1-10, 11-20, 21-30, 31-40, and 41-50 letter brackets without warnings', () => {
  // Test 15 letters (11-20 bracket = ₱100)
  const letters15 = Array.from({ length: 15 }, (_, i) => ({
    type: `center-letterUpperA-default`,
    x: (i % 5) * 0.4 - 0.8,
    z: Math.floor(i / 5) * 0.4 - 0.4,
  }));
  const quote15 = buildQuote({
    structure: { size: 'big', layers: 1 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
    center: { mode: 'text', textCategory: 'buttercream' },
    place: { items: letters15 },
  });
  assert.deepEqual(quote15.warnings, []);
  const text15 = quote15.lineItems.find((l) => l.componentKey === 'center-buttercreamText');
  assert.equal(text15.label, 'Center Text:');
  assert.deepEqual(text15.details, ['Letters x 15']);
  assert.equal(text15.lineTotalMinor, 10000); // ₱100

  // Test 25 letters (21-30 bracket = ₱150)
  const letters25 = Array.from({ length: 25 }, () => ({ type: 'center-letterUpperB-default', x: 0, z: 0 }));
  const quote25 = buildQuote({ structure: { size: 'big', layers: 1 }, place: { items: letters25 } });
  assert.deepEqual(quote25.warnings, []);
  const text25 = quote25.lineItems.find((l) => l.componentKey === 'center-buttercreamText');
  assert.equal(text25.label, 'Center Text:');
  assert.deepEqual(text25.details, ['Letters x 25']);
  assert.equal(text25.lineTotalMinor, 15000); // ₱150

  // Test 35 letters (31-40 bracket = ₱200)
  const letters35 = Array.from({ length: 35 }, () => ({ type: 'center-letterUpperC-default', x: 0, z: 0 }));
  const quote35 = buildQuote({ structure: { size: 'big', layers: 1 }, place: { items: letters35 } });
  assert.deepEqual(quote35.warnings, []);
  const text35 = quote35.lineItems.find((l) => l.componentKey === 'center-buttercreamText');
  assert.equal(text35.label, 'Center Text:');
  assert.deepEqual(text35.details, ['Letters x 35']);
  assert.equal(text35.lineTotalMinor, 20000); // ₱200

  // Test 45 letters (41-50 bracket = ₱250)
  const letters45 = Array.from({ length: 45 }, () => ({ type: 'center-letterUpperD-default', x: 0, z: 0 }));
  const quote45 = buildQuote({ structure: { size: 'big', layers: 1 }, place: { items: letters45 } });
  assert.deepEqual(quote45.warnings, []);
  const text45 = quote45.lineItems.find((l) => l.componentKey === 'center-buttercreamText');
  assert.equal(text45.label, 'Center Text:');
  assert.deepEqual(text45.details, ['Letters x 45']);
  assert.equal(text45.lineTotalMinor, 25000); // ₱250
});

test('edge borders are included in Size details at ₱0 and do not emit separate line item', () => {
  const config = {
    structure: { size: 'big', layers: 2 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
    edge: {
      mode: 'independent',
      top: { piping: { tip: 'shell', colorId: 'vanilla' } },
      middle: { piping: { tip: 'cherryRimSparse', colorId: 'chocolate' } },
      bottom: { piping: { tip: 'shell', colorId: 'vanilla' } },
    },
  };
  const quote = buildQuote(config);
  const edgeTop = quote.lineItems.find((l) => l.componentKey === 'edge-top');
  assert.equal(edgeTop, undefined);
  const bSize = quote.lineItems.find((l) => l.componentKey === 'sponge-size-bottom');
  assert.ok(bSize.details.includes('Edge Top: Shell Border (Included)'));
  assert.ok(bSize.details.includes('Edge Bottom: Shell Border (Included)'));
});

test('two-tier quote prices and generates accurate specs for Uniform vs Individual configurations', () => {
  // 1. Uniform 2-Tier
  const uniformConfig = {
    structure: { size: 'big', layers: 2, layerDesign: 'uniform' },
    sponge: { flavor: 'chocolate' },
    filling: { enabled: true, flavor: 'strawberry', layers: 2, piping: { tip: null } },
    exteriorFinish: { style: 'fullyFrosted', flavor: 'vanilla' },
    sugarColorOverrides: {
      filling: { mode: 'colorOverride', colorId: 'rosePink' },
    },
  };
  const uniformQuote = buildQuote(uniformConfig);
  const uniformBottom = uniformQuote.lineItems.find((l) => l.componentKey === 'sponge-size-bottom');
  const uniformTop = uniformQuote.lineItems.find((l) => l.componentKey === 'sponge-size-top');

  assert.deepEqual(uniformBottom.details, [
    'Size: 8x6 (Bottom Tier)',
    'Frosted Finish (Included)',
    'Filling: Strawberry (2 Layers) (Included)',
    'Piping Design: None',
    'Piping Sugar Color: Rose Pink',
  ]);
  assert.deepEqual(uniformTop.details, [
    'Size: 6x4 (Top Tier)',
    'Frosted Finish (Included)',
    'Filling: Strawberry (2 Layers) (Included)',
    'Piping Design: None',
    'Piping Sugar Color: Rose Pink',
  ]);

  // 2. Individual 2-Tier
  const individualConfig = {
    structure: { size: 'big', layers: 2, layerDesign: 'individual' },
    sponge: { layerFlavors: ['chocolate', 'ube'] },
    filling: { enabled: true, layerFlavors: ['vanilla', 'lemon'], layers: 1, piping: { tip: null } },
    exteriorFinish: {
      layerStyles: ['naked', 'texturedButtercream'],
      layerButtercreamTextures: ['ridged', 'ribbonWrap'],
    },
    sugarColorOverrides: {
      'filling-0': { mode: 'colorOverride', colorId: 'mocha' },
      'filling-1': { mode: 'default' }, // Should match Tier 2 filling flavor ('lemon')
    },
  };
  const indQuote = buildQuote(individualConfig);
  const indBottom = indQuote.lineItems.find((l) => l.componentKey === 'sponge-size-bottom');
  const indTop = indQuote.lineItems.find((l) => l.componentKey === 'sponge-size-top');

  assert.deepEqual(indBottom.details, [
    'Size: 8x6 (Bottom Tier)',
    'Naked Finish (Included)',
    'Filling: Vanilla (1 Layer) (Included)',
    'Piping Design: None',
    'Piping Sugar Color: Mocha',
  ]);
  assert.deepEqual(indTop.details, [
    'Size: 6x4 (Top Tier)',
    'Textured: Ribbon Wrap (Included)',
    'Filling: Lemon (1 Layer) (Included)',
    'Piping Design: None',
    'Piping Sugar Color: Lemon',
  ]);
});



test('petits fours quote prices a 4-piece set and each individually configured variation', () => {
  const priceBook = {
    version: 6,
    effectiveAt: new Date('2026-09-24T14:00:00.000Z'),
    rates: {
      sponge: {
        naked: { classicCube: 400 },
        frosted: { classicCube: 500, largeCube: 800 },
      },
    },
  };

  // Uniform: one set line priced from the whole 4-pack rate. Detection must
  // come from the new cakeFormat model, not the retired shape marker.
  const uniformQuote = buildQuote({
    structure: { cakeFormat: 'petitsFour', format: 'petitsFour', size: 'classicCube', layers: 1, shape: 'rectangle', layerDesign: 'uniform' },
    sponge: { flavor: 'chocolate' },
    filling: { enabled: false },
    exteriorFinish: { style: 'fullyFrosted' },
  }, priceBook);
  const setLine = uniformQuote.lineItems.find((line) => line.componentKey === 'sponge');
  assert.equal(setLine.label, 'Petits Four Set — Frosted (1" Cube (4 pcs))');
  assert.equal(setLine.lineTotalMinor, 50000); // ₱500 for the set
  assert.deepEqual(setLine.details, [
    'Petits Four (4 pcs)',
    '1x1',
    'Frosted Finish',
    'Chocolate Sponge',
    'Filling: None',
    'Piping Design: None',
    'Piping Sugar Color: Vanilla',
  ]);
  assert.deepEqual(uniformQuote.warnings, []);

  // Individual: four variant lines split from the same 4-pack rate. The
  // shape stays 'rectangle' and no format marker is set — the cube size must
  // be enough to keep the Petit Fours pricing path.
  const individualQuote = buildQuote({
    structure: { size: 'largeCube', layers: 1, shape: 'rectangle', layerDesign: 'individual' },
    sponge: { layerFlavors: ['vanilla', 'chocolate', 'ube', 'vanilla'] },
    filling: { enabled: false },
    exteriorFinish: { layerStyles: ['fullyFrosted', 'fullyFrosted', 'naked', 'naked'] },
  }, priceBook);
  const variationLines = [0, 1, 2, 3].map((p) => individualQuote.lineItems.find((line) => line.componentKey === `sponge-variation-${p}`));
  assert.equal(variationLines[0].label, 'Petit Four — Variant 1 (Frosted, 2" Cube)');
  assert.equal(variationLines[0].lineTotalMinor, 20000); // ₱800 / 4 pieces
  assert.deepEqual(variationLines[0].details, [
    'Variant 1',
    '2x2',
    'Frosted Finish',
    'Vanilla Sponge',
    'Filling: None',
    'Piping Design: None',
    'Piping Sugar Color: Vanilla',
  ]);
  assert.equal(variationLines[2].lineTotalMinor, 10000); // naked falls back to the 4-pack naked rate
  assert.equal(individualQuote.lineItems.some((line) => line.componentKey === 'sponge'), false);

  const individualQuoteWithFilling = buildQuote({
    structure: { size: 'largeCube', layers: 1, shape: 'rectangle', layerDesign: 'individual' },
    sponge: { layerFlavors: ['chocolate', 'cheese', 'strawberry', 'ube'] },
    filling: {
      enabled: true,
      layerEnabled: [true, true, false, true],
      layerLayers: [1, 2, 1, 3],
      layerFlavors: ['chocolate', 'cheese', 'strawberry', 'ube'],
      layerPipings: [
        { tip: null, colorId: 'vanilla' },
        { tip: 'mashedCircles', colorId: 'cheese' },
        { tip: null, colorId: 'strawberry' },
        { tip: 'mashedSwirls', colorId: 'ube' },
      ],
    },
    exteriorFinish: { layerStyles: ['naked', 'naked', 'naked', 'naked'] },
  }, priceBook);

  const varLines = [0, 1, 2, 3].map((p) => individualQuoteWithFilling.lineItems.find((line) => line.componentKey === `sponge-variation-${p}`));
  assert.equal(varLines[0].details[4], 'Filling: Chocolate (1 Layer)');
  assert.equal(varLines[1].details[4], 'Filling: Cheese (2 Layers)');
  assert.equal(varLines[1].details[5], 'Piping Design: Mashed Circles');
  assert.equal(varLines[2].details[4], 'Filling: None');
  assert.equal(varLines[3].details[4], 'Filling: Ube (3 Layers)');
  assert.equal(varLines[3].details[5], 'Piping Design: Mashed Swirls');
});

test('retired flat inscriptions are ignored while placed letters remain priced', () => {
  const config = { structure: { size: 'big', layers: 1 }, center: { mode: 'text', text: { middle: 'Legacy inscription' } } };
  const base = buildQuote({ structure: config.structure });
  const legacy = buildQuote(config);
  assert.equal(legacy.totalMinor, base.totalMinor);
  assert.equal(legacy.lineItems.some(line => line.componentKey === 'center-pipingText'), false);
  const letters = buildQuote({ ...config, place: { items: [{ type: 'center-letterUpperA-default', x: 0, z: 0 }] } });
  assert.ok(letters.lineItems.some(line => line.componentKey === 'center-buttercreamText'));
});

test('pricing formula: only Size, Flavor, and Center are highlighted; finish is included (+₱0)', () => {
  // 6x4 Plain Naked = 300
  const plain6x4 = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'plain' },
    exteriorFinish: { style: 'naked' },
  });
  assert.equal(plain6x4.totalMinor, 30000);

  // 6x4 Vanilla Naked = 350
  const vanilla6x4Naked = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'naked' },
  });
  assert.equal(vanilla6x4Naked.totalMinor, 35000);

  // 6x4 Vanilla Frosted = 350 (sponge) + 0 (size) + 0 (finish included) = 350
  const vanilla6x4Frosted = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
  });
  assert.equal(vanilla6x4Frosted.totalMinor, 35000);

  // 8x6 Chocolate Frosted = 500 (sponge) + 200 (8x6) + 0 (finish included) = 700
  const choc8x6 = buildQuote({
    structure: { size: '8x6', layers: 1 },
    sponge: { flavor: 'chocolate' },
    exteriorFinish: { style: 'fullyFrosted' },
  });
  assert.equal(choc8x6.totalMinor, 70000);

  // 10x8 Plain Textured = 300 (sponge) + 400 (10x8) + 0 (finish included) = 700
  const plain10x8Textured = buildQuote({
    structure: { size: '10x8', layers: 1 },
    sponge: { flavor: 'plain' },
    exteriorFinish: { style: 'texturedButtercream' },
  });
  assert.equal(plain10x8Textured.totalMinor, 70000);

  // 12x10 Strawberry Frosted = 500 (sponge) + 600 (12x10) + 0 (finish included) = 1100
  const straw12x10 = buildQuote({
    structure: { size: '12x10', layers: 1 },
    sponge: { flavor: 'strawberry' },
    exteriorFinish: { style: 'fullyFrosted' },
  });
  assert.equal(straw12x10.totalMinor, 110000);

  // 6x4 Vanilla Frosted with Pick Color = 350 (sponge) + 0 (size) + 0 (finish included) = 350
  const vanillaPickColor = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
    sugarColor: { mode: 'colorOverride', colorId: 'skyBlue' },
  });
  assert.equal(vanillaPickColor.totalMinor, 35000);

  // Cheese 6x4 Naked = 400
  const cheese6x4 = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'cheese' },
    exteriorFinish: { style: 'naked' },
  });
  assert.equal(cheese6x4.totalMinor, 40000);

  // Ube 6x4 Naked = 500
  const ube6x4 = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'ube' },
    exteriorFinish: { style: 'naked' },
  });
  assert.equal(ube6x4.totalMinor, 50000);

  // Mocha 6x4 Naked = 500
  const mocha6x4 = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'mocha' },
    exteriorFinish: { style: 'naked' },
  });
  assert.equal(mocha6x4.totalMinor, 50000);
});

test('2-tier cake prices each tier based on size + flavor (finish is included at ₱0)', () => {
  // Uniform design 2-tier: Base 8x6 Vanilla Frosted (350+200 = 550) + Top 6x4 Vanilla Frosted (350+0 = 350) = 900
  const quoteUniform2Tier = buildQuote({
    structure: { size: '8x6', layers: 2, layerDesign: 'uniform' },
    sponge: { flavor: 'vanilla' },
    exteriorFinish: { style: 'fullyFrosted' },
  });
  assert.equal(quoteUniform2Tier.totalMinor, 90000);

  // Individual design 2-tier:
  // Bottom: 8x6 Chocolate Frosted = 500 + 200 = 700
  // Top: 6x4 Vanilla Naked = 350 + 0 = 350
  // Total = 1050 (105000 minor)
  const quoteIndividual2Tier = buildQuote({
    structure: { size: '8x6', layers: 2, layerDesign: 'individual' },
    sponge: { layerFlavors: ['chocolate', 'vanilla'] },
    exteriorFinish: { layerStyles: ['fullyFrosted', 'naked'], layerFlavors: ['chocolate', 'vanilla'] },
  });
  assert.equal(quoteIndividual2Tier.totalMinor, 105000);
});

test('center toppings bracket pricing: 1-4 = +200, 5+ = +300', () => {
  // 3 cherries: bracket 1-4 => 200 (20000 minor)
  const quote3 = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'plain' },
    exteriorFinish: { style: 'naked' },
    place: {
      items: [
        { type: 'center-cherry-default', x: 0, z: 0 },
        { type: 'center-cherry-default', x: 1, z: 0 },
        { type: 'center-cherry-default', x: 2, z: 0 },
      ],
    },
  });
  // 300 (sponge) + 200 (toppings) = 500
  assert.equal(quote3.totalMinor, 50000);
  const decoLine3 = quote3.lineItems.find((l) => l.componentKey === 'center-decorations');
  assert.equal(decoLine3.lineTotalMinor, 20000);

  // 6 cherries: bracket 5+ => 300 (30000 minor)
  const quote6 = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'plain' },
    exteriorFinish: { style: 'naked' },
    place: {
      items: [
        { type: 'center-cherry-default', x: 0, z: 0 },
        { type: 'center-cherry-default', x: 1, z: 0 },
        { type: 'center-cherry-default', x: 2, z: 0 },
        { type: 'center-cherry-default', x: -1, z: 0 },
        { type: 'center-cherry-default', x: -2, z: 0 },
        { type: 'center-cherry-default', x: 0, z: 1 },
      ],
    },
  });
  // 300 (sponge) + 300 (toppings) = 600
  assert.equal(quote6.totalMinor, 60000);
  const decoLine6 = quote6.lineItems.find((l) => l.componentKey === 'center-decorations');
  assert.equal(decoLine6.lineTotalMinor, 30000);
});

test('filling, drip, side, and edge are included (₱0)', () => {
  const quoteWithAll = buildQuote({
    structure: { size: '6x4', layers: 1 },
    sponge: { flavor: 'plain' },
    exteriorFinish: { style: 'naked' },
    filling: { enabled: true, flavor: 'chocolate', layers: 1 },
    surfaceTreatment: { mode: 'glaze', pattern: 'longGaps' },
    sideTreatment: { mode: 'pipingScrolls', setId: 'scrolls1' },
    edge: { mode: 'both', both: { piping: { tip: 'shell' } } },
  });

  const fillingLine = quoteWithAll.lineItems.find((l) => l.componentKey === 'filling');
  const dripLine = quoteWithAll.lineItems.find((l) => l.componentKey === 'glaze');
  const sideLine = quoteWithAll.lineItems.find((l) => l.componentKey === 'side');
  const edgeLine = quoteWithAll.lineItems.find((l) => l.componentKey === 'edgeBoth');

  // They must NOT appear as separate line items in the price breakdown
  assert.equal(fillingLine, undefined);
  assert.equal(dripLine, undefined);
  assert.equal(sideLine, undefined);
  assert.equal(edgeLine, undefined);

  // They are included inside the Size line item details marked as (Included)
  const sizeLine = quoteWithAll.lineItems.find((l) => l.componentKey === 'sponge-size');
  assert.ok(sizeLine);
  assert.ok(sizeLine.details.some((d) => d.includes('Drip: Long Drips (Included)')));
  assert.ok(sizeLine.details.some((d) => d.includes('Edge Top: Shell Border (Included)')));
  assert.ok(sizeLine.details.some((d) => d.includes('Edge Bottom: Shell Border (Included)')));

  // Total should still just be 300 (plain 6x4 naked)
  assert.equal(quoteWithAll.totalMinor, 30000);
});

