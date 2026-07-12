const { initFirebaseAdmin } = require('../config/firebaseAdmin');
const { DOWNLOAD_URL_TTL_MS } = require('../config/constants');

/**
 * Generates a short-lived signed URL so the Lab Agent can download an
 * uploaded .asm file over plain HTTPS, without needing Firebase credentials
 * of its own (it authenticates to this API server with a shared secret
 * instead — see websocket/agentHub.js).
 */
async function getSignedDownloadUrl(storagePath) {
  const admin = initFirebaseAdmin();
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + DOWNLOAD_URL_TTL_MS,
  });

  return url;
}

module.exports = { getSignedDownloadUrl };
