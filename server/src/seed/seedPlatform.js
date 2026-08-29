require('dotenv').config();
const mongoose = require('mongoose');
const Platform = require('../models/Platform');

async function seed() {
  // TODO: replace MONGO_URI with whatever env var name your existing db
  // connection actually uses — check server.js/app.js for the real key.
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await Platform.findOne({ slug: 'mamshie-bakery' });
  if (existing) {
    console.log('Already exists:', existing._id);
    process.exit(0);
  }

  const platform = await Platform.create({
    name: 'Mamshie Bakery',
    slug: 'mamshie-bakery',
    email: 'mamshiebakery@example.com',
  });

  console.log('Created Mamshie Bakery platform:', platform._id);
  process.exit(0);
}

seed();