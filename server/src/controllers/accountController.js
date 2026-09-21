const User = require('../models/User');

async function syncAccount(req, res) {
    try {
        const {
            uid,
            email,
            emailVerified,
            name,
            picture,
            provider,
        } = req.auth;

        const existingUser = await User.findOne({ firebaseUid: uid });

        if (existingUser?.status === 'suspended') {
            return res.status(403).json({
                code: 'ACCOUNT_SUSPENDED',
                message: 'This account has been suspended.',
            });
        }

        if (existingUser?.status === 'disabled') {
            return res.status(403).json({
                code: 'ACCOUNT_DISABLED',
                message: 'This account has been disabled.',
            });
        }

        const synchronizedFields = {
            emailVerified,
            lastLoginAt: new Date(),
        };

        if (email) synchronizedFields.email = email.trim().toLowerCase();
        if (picture) synchronizedFields.photoURL = picture;

        const accountUpdate = {
            $set: synchronizedFields,
            $setOnInsert: {
                displayName: name || '',
                role: 'customer',
                status: 'active',
            },
        };

        if (provider) {
            accountUpdate.$addToSet = { providers: provider };
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            accountUpdate,
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        return res.json({ user });
    } catch (error) {
        console.error('Account synchronization failed:', error);

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

module.exports = {
    syncAccount,
    getCurrentAccount,
    updateCurrentAccount,
};
