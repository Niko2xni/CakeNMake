const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQuote } = require('../src/services/pricingService');
const { nextManilaTenPm } = require('../src/controllers/priceBookController');

function item(componentKey, amount, displayName = componentKey, billingUnit = 'per_cake') {
  return { componentKey, displayName, billingUnit, costBasisMinor: amount, markupMinor: 0, isActive: true };
}

test('cake quote prices selected options and quantities from one price book', () => {
  const priceBook = {
    version: 4,
    effectiveAt: new Date('2026-09-24T14:00:00.000Z'),
    items: [
      item('base.standard', 10000),
      item('size.big', 2000),
      item('tier.additional', 3000, 'Additional tier', 'per_tier'),
      item('sponge.chocolate', 500, 'Chocolate sponge', 'per_tier'),
      item('finish.fullyFrosted', 1000),
      item('frosting.vanilla', 400, 'Vanilla frosting', 'per_tier'),
      item('placed.cherry', 100, 'Cherry', 'per_piece'),
    ],
  };
  const quote = buildQuote({
    structure: { size: 'big', layers: 2 },
    sponge: { flavor: 'chocolate' },
    filling: { enabled: false },
    exteriorFinish: { style: 'fullyFrosted', flavor: 'vanilla' },
    place: { items: [{ type: 'cherry' }, { type: 'cherry' }] },
  }, priceBook);

  assert.equal(quote.pricingVersion, 4);
  assert.equal(quote.totalMinor, 18000);
  assert.equal(quote.lineItems.find((line) => line.componentKey === 'placed.cherry').quantity, 2);
  assert.deepEqual(quote.warnings, []);
});

test('next publication time is the next 10 PM in Manila', () => {
  assert.equal(nextManilaTenPm(new Date('2026-09-24T12:00:00.000Z')).toISOString(), '2026-09-24T14:00:00.000Z');
  assert.equal(nextManilaTenPm(new Date('2026-09-24T15:00:00.000Z')).toISOString(), '2026-09-25T14:00:00.000Z');
});
