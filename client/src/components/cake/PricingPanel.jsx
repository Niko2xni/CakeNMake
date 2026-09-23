import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { adaptConfigToLegacy } from '@/lib/configAdapter';

const CAKE_FLAVOR_PRICES = {
  vanilla: 15,
  chocolate: 18,
  strawberry: 18,
  cheese: 20,
  ube: 22,
  mocha: 20,
};

const FILLING_PRICES = {
  vanilla: 8,
  chocolate: 10,
  strawberry: 10,
  cheese: 12,
  ube: 14,
  mocha: 12,
};

const FROSTING_PRICES = {
  vanilla: 5,
  chocolate: 7,
  strawberry: 7,
  cheese: 8,
  ube: 9,
  mocha: 8,
};

const LAYER_PRICES = { 1: 10, 2: 15 };
const SIZE_PRICES = { big: 20, small: 10 };

// Tier dimensions per size and layer count
const SIZE_LABELS = {
  big:   { 1: '8"×5"', 2: '8"×5" + 6"×4"' },
  small: { 1: '6"×4"', 2: '6"×4" + 4"×3"' },
};

const TOPPING_PRICES = {
  cherry: 3,
  sprinkles: 2,
  candles: 4,
  strawberries: 5,
  chocolateChips: 3,
  rosettes: 6,
};

const PLACED_ITEM_PRICES = {
  cherry: 3,
  strawberry: 4,
  candle: 4,
  chocolateChip: 2,
  rosette: 5,
};

const PIPING_PRICE = 5;

export default function PricingPanel({ config }) {
  const [modalOpen, setModalOpen] = useState(false);
  // Adapt new config to legacy format for pricing calculation
  const legacyConfig = adaptConfigToLegacy(config);
  const { layers = 2, cakeSize = 'big', frostingColor = 'vanilla', cakeColor = 'vanilla', fillingColor = 'vanilla', toppings = [], placedItems = [] } = legacyConfig;

  const layerCost = LAYER_PRICES[Math.min(layers, 2)] || 10;
  const sizeCost = SIZE_PRICES[cakeSize] || 20;
  const cakeCost = CAKE_FLAVOR_PRICES[cakeColor] || 15;
  const fillingCost = FILLING_PRICES[fillingColor] || 8;
  const frostingCost = FROSTING_PRICES[frostingColor] || 5;

  const toppingsCost = toppings.reduce((sum, t) => sum + (TOPPING_PRICES[t] || 0), 0);

  const placedCost = (placedItems || []).reduce((sum, item) => {
    if (item.type === 'piping') return sum + PIPING_PRICE;
    return sum + (PLACED_ITEM_PRICES[item.type] || 0);
  }, 0);

  const total = layerCost + sizeCost + cakeCost + fillingCost + frostingCost + toppingsCost + placedCost;

  const sizeLabel = SIZE_LABELS[cakeSize]?.[Math.min(layers, 2)] || '';

  const allItems = [
    { label: `Size: ${cakeSize === 'big' ? 'Big' : 'Small'} — ${sizeLabel}`, amount: sizeCost },
    { label: `${layers} Layer${layers > 1 ? 's' : ''}`, amount: layerCost },
    { label: `${cakeColor} sponge`, amount: cakeCost },
    { label: `${fillingColor} filling`, amount: fillingCost },
    { label: `${frostingColor} frosting`, amount: frostingCost },
    ...toppings.map((t) => ({ label: t, amount: TOPPING_PRICES[t] || 0, indent: true })),
    ...(placedItems || []).map((item) => {
      const label = item.type === 'piping' ? `piping (${item.pattern})` : item.type;
      const amount = item.type === 'piping' ? PIPING_PRICE : (PLACED_ITEM_PRICES[item.type] || 0);
      return { label, amount, indent: true };
    }),
  ];

  const LineItem = ({ label, amount, indent }) => (
    <div className={`flex justify-between items-center text-xs ${indent ? 'pl-3' : ''}`}>
      <span className="text-foreground/70 truncate mr-2">{label}</span>
      <span className="font-medium tabular-nums shrink-0">₱{amount}</span>
    </div>
  );

  const hasOverflow = allItems.length > 5;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card/90 backdrop-blur-md rounded-2xl shadow-lg border border-border/40 p-4 w-[220px] cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-heading font-bold text-sm">Pricing</h3>
        </div>

        <div className={`space-y-1.5 ${hasOverflow ? 'max-h-[140px] overflow-hidden relative' : ''}`}>
          {allItems.map((item, i) => (
            <LineItem key={i} {...item} />
          ))}
          {hasOverflow && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/90 to-transparent" />
              <p className="text-[11px] text-muted-foreground text-center pt-1">...</p>
            </>
          )}
        </div>

        <Separator className="my-2.5" />

        <div className="flex justify-between items-center">
          <span className="font-heading font-bold text-sm">Total</span>
          <span className="font-heading font-bold text-lg text-primary tabular-nums">₱{total}</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl shadow-2xl border border-border/40 p-6 w-[300px] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-sm">Price Breakdown</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-1 hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {allItems.map((item, i) => (
                  <LineItem key={i} {...item} />
                ))}
              </div>

              <Separator className="my-3" />

              <div className="flex justify-between items-center">
                <span className="font-heading font-bold text-base">Total</span>
                <span className="font-heading font-bold text-2xl text-primary tabular-nums">₱{total}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
