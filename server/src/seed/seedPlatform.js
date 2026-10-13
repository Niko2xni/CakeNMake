require('dotenv').config();
const connectDB = require('../config/db');
const Platform = require('../models/Platform');

async function seed() {
  await connectDB();

  const existing = await Platform.findOne({ slug: 'mamshie-bakery' });
  if (existing) {
    if (existing.name !== 'AH TINAPS BAKESHOP') {
      existing.name = 'AH TINAPS BAKESHOP';
      await existing.save();
      console.log('Updated platform name to AH TINAPS BAKESHOP:', existing._id);
    } else {
      console.log('Already exists:', existing._id);
    }
    process.exit(0);
  }

  const platform = await Platform.create({
    name: 'AH TINAPS BAKESHOP',
    slug: 'mamshie-bakery',
    email: 'ahtinapsbakeshop@example.com',
  });

  console.log('Created AH TINAPS BAKESHOP platform:', platform._id);
  process.exit(0);
}

seed();