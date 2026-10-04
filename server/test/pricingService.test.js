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
  assert.equal(quote2Tier.lineItems[0].label, 'Bottom Tier Textured Cake (8x5)');
  assert.equal(quote2Tier.lineItems[0].lineTotalMinor, 170000); // ₱1,700
  assert.deepEqual(quote2Tier.lineItems[0].details, [
    'Bottom Tier',
    '8x5',
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

test('drip breakdown displays Drip with design and sugar color for 1-tier, and splits into Drip Top and Drip Bottom for 2-tier', () => {
  // 1-Tier Drip
  const quote1 = buildQuote({
    structure: { size: 'big', layers: 1 },
    surfaceTreatment: { mode: 'glaze', pattern: 'longGaps' },
    sugarColorOverrides: { surface: { colorId: 'vanilla' } },
  });
  const dripLine1 = quote1.lineItems.find((l) => l.componentKey === 'glaze');
  assert.equal(dripLine1.label, 'Drip — Long Drips');
  assert.equal(dripLine1.lineTotalMinor, 10000); // ₱100
  assert.deepEqual(dripLine1.details, [
    'Drip:',
    'Design: Long Drips',
    'Sugar Color: Vanilla',
  ]);

  // 2-Tier Drip
  const quote2 = buildQuote({
    structure: { size: 'big', layers: 2 },
    surfaceTreatment: { mode: 'glaze', pattern: 'longGaps' },
    sugarColorOverrides: {
      'surface-0': { colorId: 'vanilla' },
      'surface-1': { colorId: 'chocolate' },
    },
  });
  const dripTop = quote2.lineItems.find((l) => l.componentKey === 'glaze-top');
  const dripBottom = quote2.lineItems.find((l) => l.componentKey === 'glaze-bottom');

  assert.equal(dripTop.label, 'Drip Top — Long Drips');
  assert.equal(dripTop.lineTotalMinor, 10000); // ₱100
  assert.deepEqual(dripTop.details, [
    'Drip Top:',
    'Design: Long Drips',
    'Sugar Color: Chocolate',
  ]);

  assert.equal(dripBottom.label, 'Drip Bottom — Long Drips');
  assert.equal(dripBottom.lineTotalMinor, 10000); // ₱100
  assert.deepEqual(dripBottom.details, [
    'Drip Bottom:',
    'Design: Long Drips',
    'Sugar Color: Vanilla',
  ]);
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

test('edge breakdown details omit Sugar Color for Edible Delicates designs', () => {
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
  const edgeMiddle = quote.lineItems.find((l) => l.componentKey === 'edge-middle');
  const edgeBottom = quote.lineItems.find((l) => l.componentKey === 'edge-bottom');

  assert.deepEqual(edgeTop.details, ['Edge Top:', 'Design: Shell Border', 'Sugar Color: Vanilla']);
  assert.deepEqual(edgeMiddle.details, ['Edge Middle:', 'Design: Cherry and Hershey']);
  assert.deepEqual(edgeBottom.details, ['Edge Bottom:', 'Design: Shell Border', 'Sugar Color: Vanilla']);
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
  const uniformBottom = uniformQuote.lineItems.find((l) => l.componentKey === 'sponge');
  const uniformTop = uniformQuote.lineItems.find((l) => l.componentKey === 'sponge-top');

  assert.deepEqual(uniformBottom.details, [
    'Bottom Tier',
    '8x5',
    'Frosted Finish',
    'Chocolate Sponge',
    'Filling: Strawberry (2 Layers)',
    'Piping Design: None',
    'Piping Sugar Color: Rose Pink',
  ]);
  assert.deepEqual(uniformTop.details, [
    'Top Tier',
    '6x4',
    'Frosted Finish',
    'Chocolate Sponge',
    'Filling: Strawberry (2 Layers)',
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
  const indBottom = indQuote.lineItems.find((l) => l.componentKey === 'sponge');
  const indTop = indQuote.lineItems.find((l) => l.componentKey === 'sponge-top');

  assert.deepEqual(indBottom.details, [
    'Bottom Tier',
    '8x5',
    'Naked Finish',
    'Chocolate Sponge',
    'Filling: Vanilla (1 Layer)',
    'Piping Design: None',
    'Piping Sugar Color: Mocha',
  ]);
  assert.deepEqual(indTop.details, [
    'Top Tier',
    '6x4',
    'Textured: Ribbon Wrap',
    'Ube Sponge',
    'Filling: Lemon (1 Layer)',
    'Piping Design: None',
    'Piping Sugar Color: Lemon',
  ]);
});


