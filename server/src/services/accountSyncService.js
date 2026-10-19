const User = require('../models/User');
const {
  firebaseAdminAuth,
  firebaseAdminConfigured,
} = require('../config/firebaseAdmin');

function normalizeEmail(email) {
  return typeof email === 'string' && email.trim()
    ? email.trim().toLowerCase()
    : null;
}

function identityFromClaims(claims) {
  return {
    uid: claims.uid,
    email: normalizeEmail(claims.email),
    emailVerified: Boolean(claims.emailVerified),
    displayName: claims.name || '',
    photoURL: claims.picture || null,
    providers: claims.provider ? [claims.provider] : [],
    canonical: false,
  };
}

function identityFromUserRecord(userRecord, claims) {
  const providerData = userRecord.providerData || [];
  const providerWithEmail = providerData.find((provider) => provider.email);
  const providerWithName = providerData.find((provider) => provider.displayName);
  const providerWithPhoto = providerData.find((provider) => provider.photoURL);

  return {
    uid: userRecord.uid,
    email: normalizeEmail(userRecord.email || providerWithEmail?.email || claims.email),
    emailVerified: Boolean(userRecord.emailVerified),
    displayName: userRecord.displayName || providerWithName?.displayName || claims.name || '',
    photoURL: userRecord.photoURL || providerWithPhoto?.photoURL || claims.picture || null,
    providers: [...new Set([
      ...providerData.map((provider) => provider.providerId).filter(Boolean),
      claims.provider,
    ].filter(Boolean))],
    canonical: true,
  };
}

async function resolveFirebaseIdentity(claims) {
  if (!firebaseAdminConfigured || !firebaseAdminAuth) {
    return identityFromClaims(claims);
  }

  try {
    const userRecord = await firebaseAdminAuth.getUser(claims.uid);
    return identityFromUserRecord(userRecord, claims);
  } catch (error) {
    // The ID token has already been verified. Falling back keeps sign-in
    // available during a transient Admin API failure; the next sync will
    // reconcile the complete provider data.
    console.warn('Could not load canonical Firebase user record:', error.code || error.message);
    return identityFromClaims(claims);
  }
}

async function synchronizeAccount(claims) {
  const existingUser = await User.findOne({ firebaseUid: claims.uid });

  if (existingUser?.status === 'suspended') {
    const error = new Error('This account has been suspended.');
    error.code = 'ACCOUNT_SUSPENDED';
    error.status = 403;
    throw error;
  }

  if (existingUser?.status === 'disabled') {
    const error = new Error('This account has been disabled.');
    error.code = 'ACCOUNT_DISABLED';
    error.status = 403;
    throw error;
  }

  const identity = await resolveFirebaseIdentity(claims);
  if (identity.providers.includes('password') && !identity.emailVerified) {
    const error = new Error('Verify your email address before signing in.');
    error.code = 'EMAIL_VERIFICATION_REQUIRED';
    error.status = 403;
    throw error;
  }

  const synchronizedFields = {
    emailVerified: identity.emailVerified,
    lastLoginAt: new Date(),
  };

  if (identity.email) synchronizedFields.email = identity.email;
  if (identity.displayName) synchronizedFields.displayName = identity.displayName;

  // A canonical Firebase record can authoritatively clear a removed photo or
  // provider. Token-only fallback data must never erase stored profile data.
  if (identity.canonical) {
    synchronizedFields.photoURL = identity.photoURL;
    synchronizedFields.providers = identity.providers;
  } else {
    if (identity.photoURL) synchronizedFields.photoURL = identity.photoURL;
    if (identity.providers.length) {
      synchronizedFields.providers = [...new Set([
        ...(existingUser?.providers || []),
        ...identity.providers,
      ])];
    }
  }

  return User.findOneAndUpdate(
    { firebaseUid: identity.uid },
    {
      $set: synchronizedFields,
      $setOnInsert: {
        role: 'customer',
        status: 'active',
        registrationFee: {
          isPaid: false,
          amount: 25,
          paidAt: null,
          paymentReference: null,
          method: 'gcash',
          paymentMode: 'simulated',
          agreedToTerms: false,
          agreedToTermsAt: null,
        },
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}

module.exports = {
  identityFromClaims,
  identityFromUserRecord,
  resolveFirebaseIdentity,
  synchronizeAccount,
};
