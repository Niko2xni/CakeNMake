const {
    firebaseAdminAuth,
    firebaseAdminConfigured,
} = require('../config/firebaseAdmin');

async function authenticate(req, res, next) {
    if (!firebaseAdminConfigured || !firebaseAdminAuth) {
        return res.status(503).json({
            code: 'AUTH_NOT_CONFIGURED',
            message: 'Authentication is not configured.',
        });
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    const token = match?.[1];

    if (!token) {
        return res.status(401).json({
            code: 'AUTH_REQUIRED',
            message: 'Authentication is required.',
        });
    }

    try {
        const decodedToken = await firebaseAdminAuth.verifyIdToken(token);

        req.auth = {
            uid: decodedToken.uid,
            email: decodedToken.email || null,
            emailVerified: Boolean(decodedToken.email_verified),
            name: decodedToken.name || '',
            picture: decodedToken.picture || null,
            provider: decodedToken.firebase?.sign_in_provider || null,
        };

        next();
    } catch (error) {
        console.warn('Firebase ID token rejected:', error.code);

        return res.status(401).json({
            code: 'INVALID_AUTH_TOKEN',
            message: 'Your session is invalid or expired.',
        });
    }
}

module.exports = authenticate;
