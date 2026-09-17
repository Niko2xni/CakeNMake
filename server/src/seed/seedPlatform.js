require('dotenv').config();
const connectDB = require('../config/db');
const Platform = require('../models/Platform');

async function seed() {
  await connectDB();

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