const { firebaseAdminAuth, firebaseAdminConfigured } = require('../config/firebaseAdmin');
const {
  cancelOtp,
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

exports.cancelEmailOtp = async (req, res) => {
  try {
    await cancelOtp({ email: req.body.email, purpose: 'login' });
    return res.json({ message: 'The active verification code was cleared.' });
  } catch (error) {
    return sendServiceError(res, error, 'We could not cancel the verification code.');
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

    const token = await firebaseAdminAuth.createCustomToken(user.uid);
    return res.json({ token });
  } catch (error) {
    return sendServiceError(res, error, 'We could not complete sign-in.');
  }
};
