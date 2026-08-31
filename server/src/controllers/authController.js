const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { firebaseAdminAuth, firebaseAdminConfigured } = require('../config/firebaseAdmin');

const OTP_TTL_MS = 3 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const otpRequests = new Map();

const mailConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD &&
  process.env.AUTH_EMAIL_FROM
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

const invalidSetupMessage = 'Email OTP authentication is not configured on the server.';

exports.requestEmailOtp = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  if (!mailTransport || !firebaseAdminConfigured) {
    return res.status(503).json({ message: invalidSetupMessage });
  }

  const previousRequest = otpRequests.get(email);
  if (previousRequest && Date.now() - previousRequest.sentAt < RESEND_COOLDOWN_MS) {
    return res.status(429).json({ message: 'Please wait before requesting another code.' });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const passwordHash = await bcrypt.hash(code, 10);
  otpRequests.set(email, {
    passwordHash,
    sentAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  const expiresAt = Date.now() + OTP_TTL_MS;

  try {
    await mailTransport.sendMail({
      from: process.env.AUTH_EMAIL_FROM,
      to: email,
      subject: 'Your CakeNMake login code',
      text: `Your CakeNMake login code is ${code}. It expires in 3 minutes.`,
      html: `<p>Your CakeNMake login code is:</p><h2>${code}</h2><p>This code expires in 3 minutes.</p>`,
    });
    return res.json({ message: 'A verification code was sent to your email.', expiresAt });
  } catch (error) {
    otpRequests.delete(email);
    console.error('Email OTP delivery failed:', error);
    return res.status(502).json({ message: 'We could not send the verification code.' });
  }
};

exports.cancelEmailOtp = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  otpRequests.delete(email);
  return res.json({ message: 'The active verification code was cleared.' });
};

exports.verifyEmailOtp = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const request = otpRequests.get(email);

  if (!/^\d{6}$/.test(code) || !request) {
    return res.status(400).json({ message: 'The verification code is invalid or expired.' });
  }

  if (Date.now() > request.expiresAt || request.attempts >= MAX_ATTEMPTS) {
    otpRequests.delete(email);
    return res.status(400).json({ message: 'The verification code is invalid or expired.' });
  }

  request.attempts += 1;
  if (!(await bcrypt.compare(code, request.passwordHash))) {
    return res.status(400).json({ message: 'The verification code is invalid or expired.' });
  }

  try {
    let user;
    try {
      user = await firebaseAdminAuth.getUserByEmail(email);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      user = await firebaseAdminAuth.createUser({ email, emailVerified: true });
    }

    const token = await firebaseAdminAuth.createCustomToken(user.uid);
    otpRequests.delete(email);
    return res.json({ token });
  } catch (error) {
    console.error('Firebase OTP sign-in failed:', error);
    return res.status(500).json({ message: 'We could not complete sign-in.' });
  }
};
