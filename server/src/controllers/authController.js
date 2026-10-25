const { firebaseAdminAuth, firebaseAdminConfigured } = require('../config/firebaseAdmin');
const {
  requestOtp,
  verifyOtp,
} = require('../services/emailOtpService');

function sendServiceError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error.cause || error);
  return res.status(error.status || 500).json({
    code: error.code || 'AUTHENTICATION_FAILED',
    message: error.status ? error.message : fallbackMessage,
  });
}

exports.requestEmailOtp = async (req, res) => {
  if (!firebaseAdminConfigured) {
    return res.status(503).json({
      code: 'EMAIL_OTP_NOT_CONFIGURED',
      message: 'Email OTP authentication is not configured on the server.',
    });
  }

  try {
    const { expiresAt } = await requestOtp({
      email: req.body.email,
      purpose: 'login',
      ip: req.ip,
    });
    return res.json({ message: 'A verification code was sent to your email.', expiresAt });
  } catch (error) {
    return sendServiceError(res, error, 'We could not send the verification code.');
  }
};

exports.verifyEmailOtp = async (req, res) => {
  if (!firebaseAdminConfigured || !firebaseAdminAuth) {
    return res.status(503).json({
      code: 'EMAIL_OTP_NOT_CONFIGURED',
      message: 'Email OTP authentication is not configured on the server.',
    });
  }

  try {
    const { email } = await verifyOtp({
      email: req.body.email,
      code: req.body.code,
      purpose: 'login',
      ip: req.ip,
    });

    let user;
    try {
      user = await firebaseAdminAuth.getUserByEmail(email);
      if (!user.emailVerified) {
        user = await firebaseAdminAuth.updateUser(user.uid, { emailVerified: true });
      }
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      user = await firebaseAdminAuth.createUser({ email, emailVerified: true });
    }

    const User = require('../models/User');
    await User.findOneAndUpdate(
      { firebaseUid: user.uid },
      { $addToSet: { providers: 'email-otp' } }
    );

    const token = await firebaseAdminAuth.createCustomToken(user.uid, { provider: 'email-otp' });
    return res.json({ token });
  } catch (error) {
    return sendServiceError(res, error, 'We could not complete sign-in.');
  }
};

exports.handleGoogleOAuth = async (req, res) => {
  const { code, redirectUri } = req.body || {};
  if (!code || !redirectUri) {
    return res.status(400).json({ message: 'Authorization code and redirectUri are required.' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !firebaseAdminConfigured || !firebaseAdminAuth) {
    return res.status(503).json({ message: 'Google OAuth is not configured on the server.' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Google token exchange error:', tokenData);
      return res.status(401).json({ message: tokenData.error_description || 'Failed to exchange Google code.' });
    }

    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userinfoResponse.json();

    if (!profile.email) {
      return res.status(400).json({ message: 'Google account has no associated email address.' });
    }

    const email = profile.email.trim().toLowerCase();
    const displayName = profile.name || '';
    const photoURL = profile.picture || '';

    let user;
    try {
      user = await firebaseAdminAuth.getUserByEmail(email);
      const updates = {};
      if (!user.emailVerified) updates.emailVerified = true;
      if (!user.displayName && displayName) updates.displayName = displayName;
      if (!user.photoURL && photoURL) updates.photoURL = photoURL;
      if (Object.keys(updates).length > 0) {
        user = await firebaseAdminAuth.updateUser(user.uid, updates);
      }
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
      user = await firebaseAdminAuth.createUser({
        email,
        displayName: displayName || undefined,
        photoURL: photoURL || undefined,
        emailVerified: true,
      });
    }

    const { expiresAt } = await requestOtp({
      email,
      purpose: 'login',
      ip: req.ip,
    });

    return res.json({
      email,
      expiresAt,
      message: `A 6-digit verification code was sent to ${email}.`,
    });
  } catch (err) {
    return sendServiceError(res, err, 'We could not complete Google sign-in.');
  }
};

