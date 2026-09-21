const User = require('../models/User');

async function loadAppUser(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.auth.uid });

    if (!user) {
      return res.status(403).json({
        code: 'APPLICATION_ACCOUNT_REQUIRED',
        message: 'An application account is required.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        code: user.status === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_DISABLED',
        message: 'This account is not active.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...allowedRoles) {
  return function authorizeRole(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }

    return next();
  };
}

function requirePlatformMembership(req, res, next) {
  const platformId = req.user?.platform?._id || req.user?.platform;

  if (!platformId) {
    return res.status(403).json({
      code: 'PLATFORM_MEMBERSHIP_REQUIRED',
      message: 'A bakery assignment is required.',
    });
  }

  req.platformId = platformId;
  return next();
}

module.exports = {
  loadAppUser,
  requirePlatformMembership,
  requireRole,
};
