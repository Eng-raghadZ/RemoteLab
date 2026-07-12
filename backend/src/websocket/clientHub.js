const { initFirebaseAdmin } = require('../config/firebaseAdmin');
const {
  CLIENT_AUTH,
  CLIENT_AUTH_ACK,
  CLIENT_AUTH_REJECTED,
  CLIENT_QUEUE_UPDATE,
  CLIENT_JOB_STATUS_CHANGED,
  CLIENT_CAMERA_FRAME,
} = require('./protocol');

// uid -> Set<WebSocket>. A student could have more than one tab open.
const socketsByUid = new Map();

function send(ws, type, payload = {}) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type, ...payload }));
}

function addSocket(uid, ws) {
  if (!socketsByUid.has(uid)) {
    socketsByUid.set(uid, new Set());
  }
  socketsByUid.get(uid).add(ws);
}

function removeSocket(uid, ws) {
  const set = socketsByUid.get(uid);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) socketsByUid.delete(uid);
}

/**
 * Called by wsServer.js for every new connection on /ws/client.
 * The socket must send a CLIENT_AUTH message with a Firebase ID token as
 * its very first message before it's trusted with anything.
 */
function handleConnection(ws) {
  ws.isAlive = true;
  ws.authenticatedUid = null;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames
    }

    try {
      if (message.type === CLIENT_AUTH && !ws.authenticatedUid) {
        try {
          const admin = initFirebaseAdmin();
          const decoded = await admin.auth().verifyIdToken(message.idToken || '');
          ws.authenticatedUid = decoded.uid;
          addSocket(decoded.uid, ws);
          send(ws, CLIENT_AUTH_ACK, { ok: true });
        } catch {
          send(ws, CLIENT_AUTH_REJECTED, { reason: 'Invalid or expired token.' });
          ws.close();
        }
        return;
      }

      // No other client -> server message types yet in Phase 2. This
      // socket is currently read-only from the frontend's perspective
      // (updates flow server -> client); job actions like "terminate" go
      // through the REST API so they're easy to auth/validate/log like
      // any other request.
    } catch (err) {
      console.error(`[clientHub] Error handling message type "${message.type}":`, err.message);
    }
  });

  ws.on('close', () => {
    if (ws.authenticatedUid) removeSocket(ws.authenticatedUid, ws);
  });
}

/**
 * Sends a job-specific status update only to sockets belonging to that
 * job's owner.
 */
function sendToStudent(uid, payload) {
  const set = socketsByUid.get(uid);
  if (!set) return;
  set.forEach((ws) => send(ws, CLIENT_JOB_STATUS_CHANGED, payload));
}

/**
 * Relays one camera frame to the owning student only — camera frames are
 * never broadcast, unlike queue status.
 */
function sendCameraFrame(uid, payload) {
  const set = socketsByUid.get(uid);
  if (!set) return;
  set.forEach((ws) => send(ws, CLIENT_CAMERA_FRAME, payload));
}

/**
 * Broadcasts a queue snapshot to every authenticated client — powers the
 * frontend's rig-status indicator for everyone, not just the student whose
 * job is running.
 */
function broadcastQueueUpdate(payload) {
  socketsByUid.forEach((set) => {
    set.forEach((ws) => send(ws, CLIENT_QUEUE_UPDATE, payload));
  });
}

/**
 * Periodic liveness sweep — terminates client sockets that stopped
 * responding to ping (e.g. laptop closed, network dropped) so they don't
 * linger in socketsByUid.
 */
function startHeartbeatSweep(intervalMs = 30000) {
  return setInterval(() => {
    socketsByUid.forEach((set) => {
      set.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    });
  }, intervalMs);
}

module.exports = {
  handleConnection,
  sendToStudent,
  sendCameraFrame,
  broadcastQueueUpdate,
  startHeartbeatSweep,
};
