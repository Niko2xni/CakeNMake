const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';
const sanitizedPrivateKey = rawPrivateKey
  .replace(/^['"]|['"]$/g, '')
  .replace(/,$/, '')
  .replace(/\\n/g, '\n')
  .replace(/\\r/g, '\r')
  .trim();

const requiredConfig = [
  process.env.FIREBASE_PROJECT_ID,
  process.env.FIREBASE_CLIENT_EMAIL,
  sanitizedPrivateKey,
];

const hasFirebaseAdminConfig = requiredConfig.every(Boolean);
let firebaseAdminConfigured = false;
let firebaseAdminAuth = null;

if (hasFirebaseAdminConfig) {
  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: sanitizedPrivateKey,
        }),
      });
    }
    firebaseAdminAuth = getAuth();
    firebaseAdminConfigured = true;
  } catch (error) {
    console.error('Firebase Admin configuration is invalid:', error.message);
  }
}

module.exports = { firebaseAdminAuth, firebaseAdminConfigured };
