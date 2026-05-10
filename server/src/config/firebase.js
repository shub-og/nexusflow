const admin = require('firebase-admin');

// Skip Firebase init in dev bypass mode
if (process.env.DEV_BYPASS_AUTH !== 'true' && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } catch (err) {
    console.warn('⚠️  Firebase init failed (expected if using DEV_BYPASS_AUTH):', err.message);
  }
} else if (process.env.DEV_BYPASS_AUTH === 'true') {
  console.log('🔓 DEV_BYPASS_AUTH enabled — Firebase auth skipped');
}

module.exports = admin;
