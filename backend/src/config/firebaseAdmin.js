const admin = require('firebase-admin');

let initialized = false;

/**
 * Lazily initializes the Firebase Admin SDK using service-account credentials
 * supplied via environment variables. Safe to call repeatedly — only runs
 * initializeApp() once per process.
 */
function initFirebaseAdmin() {
  if (initialized) {
    return admin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file ' +
        '(see .env.example).'
    );
  }

  // .env files store the private key with literal "\n" sequences; convert
  // them back into real newlines before handing it to the SDK.
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });

  initialized = true;
  return admin;
}

module.exports = { initFirebaseAdmin };
