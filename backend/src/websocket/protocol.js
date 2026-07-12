/**
 * WebSocket message protocol.
 *
 * Two independent WebSocket endpoints live on this same server:
 *   /ws/agent   — exactly one trusted on-prem Lab Agent connects here
 *   /ws/client  — authenticated frontend students connect here for
 *                 real-time job/queue updates
 *
 * IMPORTANT: this file is intentionally duplicated (not imported across
 * projects) in backend/lab-agent/src/protocol.js. The two are separate
 * npm projects/deployments, so keep the MESSAGE TYPE STRINGS in sync by
 * hand if you ever add/rename one here.
 */

// --- Agent -> Server ---
const AGENT_HELLO = 'agent_hello'; // { secret }
const AGENT_HEARTBEAT = 'heartbeat'; // {}
const AGENT_JOB_STARTED = 'job_started'; // { jobId }
const AGENT_JOB_COMPLETED = 'job_completed'; // { jobId, resultSummary }
const AGENT_JOB_ERROR = 'job_error'; // { jobId, message }
const AGENT_JOB_ABORTED = 'job_aborted'; // { jobId } — ack of an abort_job request
const AGENT_CAMERA_FRAME = 'camera_frame'; // { jobId, mimeType, data (base64), frameNumber, timestamp }

// --- Server -> Agent ---
const SERVER_HELLO_ACK = 'hello_ack'; // { ok: true }
const SERVER_HELLO_REJECTED = 'hello_rejected'; // { reason }
const SERVER_JOB_DISPATCH = 'job_dispatch'; // { jobId, fileName, downloadUrl }
const SERVER_ABORT_JOB = 'abort_job'; // { jobId, reason: 'timeout' | 'terminated_by_user' }
const SERVER_HEARTBEAT_ACK = 'heartbeat_ack'; // {}

// --- Server -> Frontend client ---
const CLIENT_QUEUE_UPDATE = 'queue_update'; // { rigBusy, queueLength, currentJob }
const CLIENT_JOB_STATUS_CHANGED = 'job_status_changed'; // { jobId, status, endReason? }
const CLIENT_AUTH_ACK = 'auth_ack'; // { ok: true }
const CLIENT_AUTH_REJECTED = 'auth_rejected'; // { reason }
const CLIENT_CAMERA_FRAME = 'camera_frame'; // { jobId, mimeType, data (base64), frameNumber, timestamp }

// --- Frontend client -> Server ---
const CLIENT_AUTH = 'client_auth'; // { idToken }

module.exports = {
  AGENT_HELLO,
  AGENT_HEARTBEAT,
  AGENT_JOB_STARTED,
  AGENT_JOB_COMPLETED,
  AGENT_JOB_ERROR,
  AGENT_JOB_ABORTED,
  AGENT_CAMERA_FRAME,
  SERVER_HELLO_ACK,
  SERVER_HELLO_REJECTED,
  SERVER_JOB_DISPATCH,
  SERVER_ABORT_JOB,
  SERVER_HEARTBEAT_ACK,
  CLIENT_QUEUE_UPDATE,
  CLIENT_JOB_STATUS_CHANGED,
  CLIENT_AUTH_ACK,
  CLIENT_AUTH_REJECTED,
  CLIENT_CAMERA_FRAME,
  CLIENT_AUTH,
};
