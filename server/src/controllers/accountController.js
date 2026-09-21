const User = require('../models/User');
const { synchronizeAccount } = require('../services/accountSyncService');
const { firebaseAdminAuth, firebaseAdminConfigured } = require('../config/firebaseAdmin');
const { requestOtp, verifyOtp } = require('../services/emailOtpService');

async function syncAccount(req, res) {
    try {
        const user = await synchronizeAccount(req.auth);

        return res.json({ user });
    } catch (error) {
        console.error('Account synchronization failed:', error);

        if (error.status && error.code) {
            return res.status(error.status).json({
                code: error.code,
                message: error.message,
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                code: 'ACCOUNT_CONFLICT',
                message: 'An account already exists with this identity.',
            });
        }

        return res.status(500).json({
            code: 'ACCOUNT_SYNC_FAILED',
            message: 'The account could not be synchronized.',
        });
    }
}

async function getCurrentAccount(req, res) {
    try {
        const user = await User.findOne({ firebaseUid: req.auth.uid })
            .populate('platform', 'name slug isActive');

        if (!user) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Application account not found.',
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                code: 'ACCOUNT_UNAVAILABLE',
                message: 'This account is not active.',
            });
        }

        return res.json({ user });
    } catch (error) {
        console.error('Account retrieval failed:', error);

        return res.status(500).json({
            code: 'ACCOUNT_LOAD_FAILED',
            message: 'The account could not be loaded.',
        });
    }
}

async function updateCurrentAccount(req, res) {
    try {
        const allowedUpdates = {};

        if (typeof req.body.displayName === 'string') {
            const displayName = req.body.displayName.trim();

            if (!displayName || displayName.length > 100) {
                return res.status(400).json({
                    code: 'INVALID_DISPLAY_NAME',
                    message: 'Enter a display name of no more than 100 characters.',
                });
            }

            allowedUpdates.displayName = displayName;
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: req.auth.uid, status: 'active' },
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Account not found.',
            });
        }

        return res.json({ user });
    } catch (error) {
        console.error('Account update failed:', error);

        return res.status(500).json({
            code: 'ACCOUNT_UPDATE_FAILED',
            message: 'The account could not be updated.',
        });
    }
}

async function requestEmailLinkOtp(req, res) {
    try {
        if (!firebaseAdminConfigured || !firebaseAdminAuth) {
            return res.status(503).json({
                code: 'EMAIL_LINK_NOT_CONFIGURED',
                message: 'Email verification is not configured on the server.',
            });
        }

        const account = await User.findOne({ firebaseUid: req.auth.uid, status: 'active' });
        if (!account) {
            return res.status(404).json({
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Account not found.',
            });
        }

        const { expiresAt } = await requestOtp({
            email: req.body.email,
            purpose: 'link-email',
            ip: req.ip,
            metadata: { firebaseUid: req.auth.uid },
        });

        return res.json({
            message: 'A verification code was sent to your email.',
            expiresAt,
        });
    } catch (error) {
        console.error('Email link request failed:', error.cause || error);
        return res.status(error.status || 500).json({
            code: error.code || 'EMAIL_LINK_REQUEST_FAILED',
            message: error.status ? error.message : 'We could not send the verification code.',
        });
    }
}

async function verifyEmailLinkOtp(req, res) {
    try {
        if (!firebaseAdminConfigured || !firebaseAdminAuth) {
            return res.status(503).json({
                code: 'EMAIL_LINK_NOT_CONFIGURED',
                message: 'Email verification is not configured on the server.',
            });
        }

        const { email, metadata } = await verifyOtp({
            email: req.body.email,
            code: req.body.code,
            purpose: 'link-email',
        });

        if (metadata.firebaseUid !== req.auth.uid) {
            return res.status(403).json({
                code: 'EMAIL_LINK_SESSION_MISMATCH',
                message: 'This verification code belongs to a different session.',
            });
        }

        try {
            const existingFirebaseUser = await firebaseAdminAuth.getUserByEmail(email);
            if (existingFirebaseUser.uid !== req.auth.uid) {
                return res.status(409).json({
                    code: 'EMAIL_ALREADY_IN_USE',
                    message: 'This email is already connected to another account.',
                });
            }
        } catch (error) {
            if (error.code !== 'auth/user-not-found') throw error;
        }

        await firebaseAdminAuth.updateUser(req.auth.uid, {
            email,
            emailVerified: true,
        });

        const user = await synchronizeAccount(req.auth);
        return res.json({
            message: 'Your verified email was connected successfully.',
            user,
        });
    } catch (error) {
        console.error('Email link verification failed:', error.cause || error);

        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                code: 'EMAIL_ALREADY_IN_USE',
                message: 'This email is already connected to another account.',
            });
        }

        return res.status(error.status || 500).json({
            code: error.code || 'EMAIL_LINK_FAILED',
            message: error.status ? error.message : 'We could not connect this email.',
        });
    }
}

module.exports = {
    syncAccount,
    getCurrentAccount,
    updateCurrentAccount,
    requestEmailLinkOtp,
    verifyEmailLinkOtp,
};
