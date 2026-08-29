require('dotenv').config();
const mongoose = require('mongoose');
const PricingPreset = require('../models/PricingPreset');
const Platform = require('../models/Platform');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const platform = await Platform.findOne({ slug: 'mamshie-bakery' });
  if (!platform) {
    console.error('No Platform found — run seedPlatform.js first.');
    process.exit(1);
  }

  const existing = await PricingPreset.findOne({ platform: platform._id });
  if (existing) {
    console.log('Pricing presets already exist — skipping.');
    process.exit(0);
  }

  const presets = [
    { platform: platform._id, category: 'base', name: 'Base Price (includes basic icing & frosting)', price: 1700 },
    { platform: platform._id, category: 'tier', name: 'Additional Tier', price: 1000 },
    { platform: platform._id, category: 'topping', name: 'Strawberries', price: 150 },
    { platform: platform._id, category: 'topping', name: 'Mangoes', price: 150 },
    { platform: platform._id, category: 'topping', name: 'Candy Flowers', price: 100 },
  ];

  await PricingPreset.insertMany(presets);
  console.log(`Created ${presets.length} pricing presets.`);
  process.exit(0);
}

seed();