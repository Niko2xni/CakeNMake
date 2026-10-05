const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  identityFromUserRecord,
} = require('../src/services/accountSyncService');

test('canonical Firebase identity includes every linked provider and provider fallbacks', () => {
  const identity = identityFromUserRecord({
    uid: 'firebase-user-1',
    email: null,
    emailVerified: false,
    displayName: null,
    photoURL: null,
    providerData: [
      {
          providerId: 'password',
          email: 'User@Example.com',
          displayName: 'Cake User',
          photoURL: 'https://example.com/linked-account-avatar.jpg',
      },
      {
        providerId: 'google.com',
        email: 'user@example.com',
      },
    ],
  }, {
    uid: 'firebase-user-1',
    provider: 'google.com',
  });

  assert.equal(identity.email, 'user@example.com');
  assert.equal(identity.displayName, 'Cake User');
  assert.equal(identity.photoURL, 'https://example.com/linked-account-avatar.jpg');
  assert.deepEqual(identity.providers, ['password', 'google.com']);
  assert.equal(identity.canonical, true);
});
