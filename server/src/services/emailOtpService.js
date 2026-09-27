const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { OtpStore } = require('./otpStore');

const OTP_TTL_MS = 3 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_REQUEST_LIMIT = 5;
const IP_REQUEST_LIMIT = 20;
const EMAIL_VERIFY_LIMIT = 10;
const IP_VERIFY_LIMIT = 50;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

const otpStore = new OtpStore();

const mailConfigured = Boolean(
  process.env.SMTP_HOST
  && process.env.SMTP_PORT
  && process.env.SMTP_USER
  && process.env.SMTP_PASSWORD
  && process.env.AUTH_EMAIL_FROM
);

const mailTransport = mailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

function serviceError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) {
    throw serviceError('Enter a valid email address.', 'INVALID_EMAIL', 400);
  }
  return normalized;
}

async function requestOtp({ email, purpose = 'login', ip = 'unknown', metadata = {} }) {
  const normalizedEmail = normalizeEmail(email);
  if (!mailTransport) {
    throw serviceError('Email OTP authentication is not configured on the server.', 'EMAIL_OTP_NOT_CONFIGURED', 503);
  }

  const [emailLimit, ipLimit] = await Promise.all([
    otpStore.consumeLimit('email', normalizedEmail, EMAIL_REQUEST_LIMIT, RATE_LIMIT_WINDOW_SECONDS),
    otpStore.consumeLimit('ip', String(ip || 'unknown'), IP_REQUEST_LIMIT, RATE_LIMIT_WINDOW_SECONDS),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    throw serviceError('Too many verification requests. Please try again later.', 'OTP_RATE_LIMITED', 429);
  }

  const previousRequest = await otpStore.get(purpose, normalizedEmail);
  if (previousRequest && Date.now() - previousRequest.sentAt < RESEND_COOLDOWN_MS) {
    throw serviceError('Please wait before requesting another code.', 'OTP_RESEND_COOLDOWN', 429);
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const passwordHash = await bcrypt.hash(code, 10);
  const sentAt = Date.now();
  const expiresAt = sentAt + OTP_TTL_MS;

  await otpStore.set(purpose, normalizedEmail, {
    passwordHash,
    sentAt,
    expiresAt,
    attempts: 0,
    metadata,
  }, OTP_TTL_MS);

  const action = purpose === 'link-email' ? 'verify your email address' : 'sign in';
  try {
    await mailTransport.sendMail({
      from: process.env.AUTH_EMAIL_FROM,
      to: normalizedEmail,
      subject: 'Your CakeNMake verification code',
      text: `Use ${code} to ${action} to CakeNMake. It expires in 3 minutes.`,
      html: `<p>Use this code to ${action} to CakeNMake:</p><h2>${code}</h2><p>This code expires in 3 minutes.</p>`,
    });
  } catch (error) {
    await otpStore.delete(purpose, normalizedEmail);
    const deliveryError = serviceError('We could not send the verification code.', 'OTP_DELIVERY_FAILED', 502);
    deliveryError.cause = error;
    throw deliveryError;
  }

  return { email: normalizedEmail, expiresAt };
}

async function verifyOtp({ email, code, purpose = 'login', ip = 'unknown' }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = String(code || '').trim();
  const [emailLimit, ipLimit] = await Promise.all([
    otpStore.consumeLimit(`verify-email:${purpose}`, normalizedEmail, EMAIL_VERIFY_LIMIT, RATE_LIMIT_WINDOW_SECONDS),
    otpStore.consumeLimit(`verify-ip:${purpose}`, String(ip || 'unknown'), IP_VERIFY_LIMIT, RATE_LIMIT_WINDOW_SECONDS),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    throw serviceError('Too many verification attempts. Please try again later.', 'OTP_VERIFY_RATE_LIMITED', 429);
  }

  const request = await otpStore.get(purpose, normalizedEmail);

  if (!/^\d{6}$/.test(normalizedCode) || !request) {
    throw serviceError('The verification code is invalid or expired.', 'INVALID_OR_EXPIRED_OTP', 400);
  }

  if (Date.now() > request.expiresAt || request.attempts >= MAX_ATTEMPTS) {
    await otpStore.consumeIfCurrent(purpose, normalizedEmail, request.passwordHash);
    throw serviceError('The verification code is invalid or expired.', 'INVALID_OR_EXPIRED_OTP', 400);
  }

  const matches = await bcrypt.compare(normalizedCode, request.passwordHash);
  if (!matches) {
    await otpStore.incrementAttempts(purpose, normalizedEmail, request.passwordHash, MAX_ATTEMPTS);
    throw serviceError('The verification code is invalid or expired.', 'INVALID_OR_EXPIRED_OTP', 400);
  }

  const consumed = await otpStore.consumeIfCurrent(purpose, normalizedEmail, request.passwordHash);
  if (!consumed) {
    throw serviceError('The verification code is invalid or expired.', 'INVALID_OR_EXPIRED_OTP', 400);
  }
  return { email: normalizedEmail, metadata: request.metadata || {} };
}

module.exports = {
  OTP_TTL_MS,
  MAX_ATTEMPTS,
  EMAIL_VERIFY_LIMIT,
  IP_VERIFY_LIMIT,
  mailConfigured,
  normalizeEmail,
  requestOtp,
  verifyOtp,
};
