// Enforces the Execution Queue & Camera Session Policy: a job's execution
// (and the student's camera session) is capped at 5 minutes, full stop.
const EXECUTION_TIMEOUT_MS = Number(process.env.EXECUTION_TIMEOUT_MS) || 5 * 60 * 1000;

// How long the server waits for the Lab Agent to ack a dispatched job
// (send job_started) before treating the dispatch as failed.
const DISPATCH_ACK_TIMEOUT_MS = Number(process.env.DISPATCH_ACK_TIMEOUT_MS) || 15 * 1000;

// How long a signed download URL for an uploaded .asm file stays valid —
// only needs to survive long enough for the Lab Agent to fetch the file
// right after dispatch.
const DOWNLOAD_URL_TTL_MS = 10 * 60 * 1000;

// Shared secret the Lab Agent must present on /ws/agent to authenticate.
// This is a single trusted on-prem machine, not a per-user identity, so a
// shared secret (rotated like any other credential) is sufficient here —
// deliberately simpler than Firebase Auth, which is for students.
const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || null;

module.exports = {
  EXECUTION_TIMEOUT_MS,
  DISPATCH_ACK_TIMEOUT_MS,
  DOWNLOAD_URL_TTL_MS,
  AGENT_SHARED_SECRET,
};
