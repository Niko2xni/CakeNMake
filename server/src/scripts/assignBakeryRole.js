require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Platform = require('../models/Platform');
const User = require('../models/User');

const ASSIGNABLE_ROLES = new Set([
  'customer',
  'bakery_staff',
  'bakery_admin',
  'platform_admin',
]);

function readArguments(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--apply') {
      result.apply = true;
      continue;
    }

    if (argument.startsWith('--')) {
      result[argument.slice(2)] = argv[index + 1];
      index += 1;
    }
  }

  return result;
}

async function main() {
  const args = readArguments(process.argv.slice(2));
  const role = args.role;
  const email = args.email?.trim().toLowerCase();
  const firebaseUid = args['firebase-uid']?.trim();
  const platformSlug = args.platform?.trim();

  if ((!email && !firebaseUid) || (email && firebaseUid)) {
    throw new Error('Provide exactly one of --email or --firebase-uid.');
  }

  if (!ASSIGNABLE_ROLES.has(role)) {
    throw new Error(`--role must be one of: ${[...ASSIGNABLE_ROLES].join(', ')}`);
  }

  const needsPlatform = role === 'bakery_staff' || role === 'bakery_admin' || role === 'platform_admin';
  if (needsPlatform && !platformSlug) {
    throw new Error(`--platform is required for the ${role} role.`);
  }

  await connectDB();

  const user = await User.findOne(email ? { email } : { firebaseUid });
  if (!user) throw new Error('No matching application user was found. The user must sign in once before role assignment.');

  let platform = null;
  if (platformSlug) {
    platform = await Platform.findOne({ slug: platformSlug });
    if (!platform) throw new Error(`No platform exists with slug "${platformSlug}".`);
  }

  const proposed = {
    userId: user._id.toString(),
    firebaseUid: user.firebaseUid,
    email: user.email,
    currentRole: user.role,
    newRole: role,
    currentPlatform: user.platform?.toString() || null,
    newPlatform: platform?._id.toString() || null,
  };

  console.log(JSON.stringify(proposed, null, 2));

  if (!args.apply) {
    console.log('Dry run only. Add --apply to perform this assignment.');
    return;
  }

  user.role = role;
  user.platform = platform?._id || null;
  await user.save();
  console.log('Role assignment completed.');
}

main()
  .catch((error) => {
    console.error(`Role assignment failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
