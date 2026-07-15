/**
 * WebSocket message protocol — must stay in sync by hand with
 * backend/src/websocket/protocol.js (see the note there for why these
 * live in two separate projects instead of one shared package).
 */

// --- Agent -> Server ---
const AGENT_HELLO = 'agent_hello'; // { secret }
const AGENT_HEARTBEAT = 'heartbeat'; // {}
const AGENT_JOB_STARTED = 'job_started'; // { jobId }
const AGENT_JOB_COMPLETED = 'job_completed'; // { jobId, resultSummary }
const AGENT_JOB_ERROR = 'job_error'; // { jobId, message }
const AGENT_JOB_ABORTED = 'job_aborted'; // { jobId }
const AGENT_CAMERA_FRAME = 'camera_frame'; // { jobId, mimeType, data (base64), frameNumber, timestamp }

// --- Server -> Agent ---
const SERVER_HELLO_ACK = 'hello_ack'; // { ok: true }
const SERVER_HELLO_REJECTED = 'hello_rejected'; // { reason }
const SERVER_JOB_DISPATCH = 'job_dispatch'; // { jobId, fileName, content }
const SERVER_ABORT_JOB = 'abort_job'; // { jobId, reason: 'timeout' | 'terminated_by_user' }
const SERVER_HEARTBEAT_ACK = 'heartbeat_ack'; // {}

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
};
