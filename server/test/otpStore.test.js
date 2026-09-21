const assert = require('node:assert/strict');
const { test } = require('node:test');

const { OtpStore } = require('../src/services/otpStore');

test('development OTP store keeps records by purpose without exposing the email in its key', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'development' });
  const email = 'user@example.com';

  await store.set('login', email, { attempts: 0, value: 'hashed' }, 5_000);

  assert.deepEqual(await store.get('login', email), { attempts: 0, value: 'hashed' });
  assert.equal(await store.get('link-email', email), null);
  assert.equal(store.otpKey('login', email).includes(email), false);
});

test('development OTP store tracks attempts and deletes completed requests', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'development' });
  const email = 'attempts@example.com';

  await store.set('login', email, { attempts: 0 }, 5_000);
  assert.equal(await store.incrementAttempts('login', email), 1);
  assert.equal((await store.get('login', email)).attempts, 1);

  await store.delete('login', email);
  assert.equal(await store.get('login', email), null);
});

test('development OTP store enforces request windows', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'development' });
  const value = `limit-${Date.now()}@example.com`;

  assert.equal((await store.consumeLimit('email', value, 2, 60)).allowed, true);
  assert.equal((await store.consumeLimit('email', value, 2, 60)).allowed, true);
  assert.equal((await store.consumeLimit('email', value, 2, 60)).allowed, false);
});

test('production OTP store requires Redis', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'production' });

  await assert.rejects(
    store.get('login', 'user@example.com'),
    { code: 'OTP_STORE_UNAVAILABLE', status: 503 }
  );
});
