require('dotenv').config();
const mongoose = require('mongoose');
const configureDns = require('../config/dns');
const Design = require('../models/Design');
const User = require('../models/User');

const apply = process.argv.includes('--apply');

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email && email !== 'guest-user' ? email : null;
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  configureDns();
  await mongoose.connect(process.env.MONGO_URI);

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    total: 0,
    alreadyOwned: 0,
    matched: 0,
    updated: 0,
    unmatched: [],
    ambiguous: [],
  };

  const cursor = Design.find({}).select('_id owner userId').lean().cursor();
  for await (const design of cursor) {
    report.total += 1;
    if (design.owner) {
      report.alreadyOwned += 1;
      continue;
    }

    const email = normalizeEmail(design.userId);
    if (!email) {
      report.unmatched.push({ designId: String(design._id), legacyUserId: design.userId || null });
      continue;
    }

    const users = await User.find({ email }).select('_id').limit(2).lean();
    if (users.length === 0) {
      report.unmatched.push({ designId: String(design._id), legacyUserId: design.userId });
      continue;
    }
    if (users.length > 1) {
      report.ambiguous.push({ designId: String(design._id), legacyUserId: design.userId });
      continue;
    }

    report.matched += 1;
    if (apply) {
      const result = await Design.updateOne(
        { _id: design._id, owner: null },
        { $set: { owner: users[0]._id } }
      );
      report.updated += result.modifiedCount;
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.unmatched.length || report.ambiguous.length) process.exitCode = 2;
}

run()
  .catch((error) => {
    console.error('Design ownership migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
