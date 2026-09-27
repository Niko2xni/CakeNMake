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

test('development OTP store tracks attempts and atomically consumes completed requests', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'development' });
  const email = 'attempts@example.com';

  await store.set('login', email, { attempts: 0, passwordHash: 'hash-1' }, 5_000);
  assert.equal(await store.incrementAttempts('login', email, 'hash-1'), 1);
  assert.equal((await store.get('login', email)).attempts, 1);

  assert.equal(await store.consumeIfCurrent('login', email, 'wrong-hash'), false);
  assert.equal(await store.consumeIfCurrent('login', email, 'hash-1'), true);
  assert.equal(await store.get('login', email), null);
});

test('development OTP store cannot consume or increment a replacement record', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'development' });
  const email = `replacement-${Date.now()}@example.com`;

  await store.set('login', email, { attempts: 0, passwordHash: 'new-hash' }, 5_000);

  assert.equal(await store.incrementAttempts('login', email, 'old-hash', 5), null);
  assert.equal(await store.consumeIfCurrent('login', email, 'old-hash'), false);
  assert.deepEqual(await store.get('login', email), { attempts: 0, passwordHash: 'new-hash' });
});

test('development OTP store atomically deletes a record at the attempt limit', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'development' });
  const email = `max-attempts-${Date.now()}@example.com`;

  await store.set('login', email, { attempts: 4, passwordHash: 'hash' }, 5_000);
  assert.equal(await store.incrementAttempts('login', email, 'hash', 5), 5);
  assert.equal(await store.get('login', email), null);
});

test('development OTP store allows only one concurrent consumption', async () => {
  const store = new OtpStore({ redisUrl: '', nodeEnv: 'development' });
  const email = `concurrent-${Date.now()}@example.com`;

  await store.set('login', email, { attempts: 0, passwordHash: 'hash' }, 5_000);
  const results = await Promise.all([
    store.consumeIfCurrent('login', email, 'hash'),
    store.consumeIfCurrent('login', email, 'hash'),
  ]);

  assert.deepEqual(results.sort(), [false, true]);
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
