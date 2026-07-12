const { initFirebaseAdmin } = require('../config/firebaseAdmin');

/**
 * Verifies the Firebase ID token sent as "Authorization: Bearer <token>".
 * The frontend already handles login via Firebase Auth (Page 1); this
 * middleware just confirms the token on every protected request and attaches
 * the caller's uid/email to req.user for downstream handlers.
 */
async function verifyAuthToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Missing or malformed Authorization header. Expected: Bearer <idToken>',
    });
  }

  try {
    const admin = initFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

module.exports = { verifyAuthToken };
