const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createAuthEmailDelivery } = require('../src/services/authEmailDelivery');

const brevoEnv = { AUTH_EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'test-key', AUTH_EMAIL_FROM: 'sender@example.com' };
const message = { to: 'customer@example.com', subject: 'Verification', text: '123456', html: '<h2>123456</h2>' };

test('Brevo sends OTP content over HTTPS with a verified sender and timeout', async () => {
  let request;
  const delivery = createAuthEmailDelivery({ env: brevoEnv, fetchImpl: async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ messageId: 'accepted' }) };
  }, createTransport: () => assert.fail('Brevo must not initialize SMTP') });
  assert.equal(delivery.configured, true);
  assert.deepEqual(await delivery.send(message), { messageId: 'accepted' });
  assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['api-key'], 'test-key');
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(request.options.body), {
    sender: { name: 'CakeNMake', email: 'sender@example.com' },
    to: [{ email: message.to }], subject: message.subject, htmlContent: message.html,
  });
});

test('missing Brevo credentials, invalid sender, and unknown provider fail closed without SMTP fallback', async () => {
  for (const env of [
    { ...brevoEnv, BREVO_API_KEY: '' },
    { ...brevoEnv, AUTH_EMAIL_FROM: '' },
    { ...brevoEnv, AUTH_EMAIL_FROM: 'CakeNMake <sender@example.com>' },
    { ...brevoEnv, AUTH_EMAIL_PROVIDER: 'unknown' },
  ]) {
    const delivery = createAuthEmailDelivery({ env, fetchImpl: () => assert.fail('must not send') });
    assert.equal(delivery.configured, false);
    await assert.rejects(delivery.send(message), /not configured/);
  }
});

test('Brevo rejection is sanitized and unsuccessful acceptance is rejected', async () => {
  const rejected = createAuthEmailDelivery({ env: brevoEnv, fetchImpl: async () => ({
    ok: false, status: 429, json: () => assert.fail('must not read sensitive error body'),
  }) });
  await assert.rejects(rejected.send(message), /HTTP 429/);
  const malformed = createAuthEmailDelivery({ env: brevoEnv, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  await assert.rejects(malformed.send(message), /did not confirm/);
  const timeout = createAuthEmailDelivery({ env: brevoEnv, fetchImpl: async () => { throw new Error('timeout'); } });
  await assert.rejects(timeout.send(message), /timeout/);
});

test('existing SMTP configuration remains supported when provider is absent', async () => {
  let sent;
  let settings;
  const delivery = createAuthEmailDelivery({
    env: { AUTH_EMAIL_FROM: 'CakeNMake <sender@example.com>', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'user', SMTP_PASSWORD: 'password' },
    createTransport: (options) => {
      settings = options;
      return { sendMail: async (payload) => { sent = payload; } };
    },
    fetchImpl: () => assert.fail('SMTP must not call Brevo'),
  });
  await delivery.send(message);
  assert.equal(settings.secure, true);
  assert.equal(settings.port, 465);
  assert.deepEqual(sent, { from: 'CakeNMake <sender@example.com>', ...message });
});
