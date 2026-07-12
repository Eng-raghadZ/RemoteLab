const jobModel = require('../models/jobModel');
const clientHub = require('./clientHub');
const { getSignedDownloadUrl } = require('../utils/storage');
const { EXECUTION_TIMEOUT_MS, DISPATCH_ACK_TIMEOUT_MS, AGENT_SHARED_SECRET } = require('../config/constants');
const {
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
} = require('./protocol');

// Exactly one Lab Agent should ever be connected — there's exactly one
// physical rig. This module's state reflects that: a single connection,
// not a collection.
const state = {
  socket: null,
  currentJobId: null,
  // Cached alongside currentJobId so camera frames (which can arrive many
  // times per second) don't need a Firestore read each time just to find
  // out who to relay them to.
  currentStudentUid: null,
  dispatchInFlight: false,
  executionTimer: null,
  dispatchAckTimer: null,
};

function send(type, payload = {}) {
  if (!state.socket || state.socket.readyState !== state.socket.OPEN) return;
  state.socket.send(JSON.stringify({ type, ...payload }));
}

function isAgentOnline() {
  return Boolean(state.socket && state.socket.readyState === state.socket.OPEN);
}

function clearExecutionTimer() {
  if (state.executionTimer) {
    clearTimeout(state.executionTimer);
    state.executionTimer = null;
  }
}

function clearDispatchAckTimer() {
  if (state.dispatchAckTimer) {
    clearTimeout(state.dispatchAckTimer);
    state.dispatchAckTimer = null;
  }
}

async function broadcastQueueSnapshot() {
  // Never let a Firestore hiccup here crash the process — this runs on
  // nearly every agent/job event, so it needs to fail soft.
  try {
    const queue = await jobModel.getQueueSnapshot();
    const running = queue.find((job) => job.status === jobModel.JOB_STATUS.RUNNING) || null;
    clientHub.broadcastQueueUpdate({
      rigOnline: isAgentOnline(),
      rigBusy: Boolean(running),
      currentJob: running ? { jobId: running.id, studentUid: running.studentUid } : null,
      queueLength: queue.length,
    });
  } catch (err) {
    console.error('[agentHub] Failed to broadcast queue snapshot:', err.message);
  }
}

/**
 * Attempts to dispatch the next queued job to the Lab Agent, if:
 *  - the agent is connected
 *  - nothing is already running or mid-dispatch
 *  - there IS a queued job
 * Safe to call opportunistically from many places (after a new job is
 * submitted, after a job ends, right when the agent connects, etc).
 */
async function attemptDispatch() {
  if (!isAgentOnline() || state.dispatchInFlight) return;

  // The whole body is wrapped — this function is called fire-and-forget
  // (no await/catch at the call site) from the submit-job controller, from
  // timers, and from several places below, so nothing in here may throw
  // uncaught.
  try {
    const running = await jobModel.hasRunningJob();
    if (running) return;

    const nextJob = await jobModel.getNextQueuedJob();
    if (!nextJob) return;

    state.dispatchInFlight = true;
    state.currentJobId = nextJob.id;

    const downloadUrl = await getSignedDownloadUrl(nextJob.storagePath);

    send(SERVER_JOB_DISPATCH, {
      jobId: nextJob.id,
      fileName: nextJob.fileName,
      downloadUrl,
    });

    state.dispatchAckTimer = setTimeout(async () => {
      try {
        // Lab Agent never confirmed it started the job — treat as a
        // failed dispatch, free the slot, and let the next attempt
        // (triggered elsewhere) pick up the queue rather than retry-loop.
        console.error(`[agentHub] Dispatch ack timeout for job ${nextJob.id}`);
        await jobModel.endJob(nextJob.id, {
          status: jobModel.JOB_STATUS.ERROR,
          endReason: 'error',
          errorMessage: 'Lab Agent did not acknowledge the job in time.',
        });
        clientHub.sendToStudent(nextJob.studentUid, {
          jobId: nextJob.id,
          status: jobModel.JOB_STATUS.ERROR,
          endReason: 'error',
        });
        state.dispatchInFlight = false;
        state.currentJobId = null;
        await broadcastQueueSnapshot();
        attemptDispatch();
      } catch (err) {
        console.error('[agentHub] Failed while handling dispatch-ack timeout:', err.message);
        state.dispatchInFlight = false;
        state.currentJobId = null;
      }
    }, DISPATCH_ACK_TIMEOUT_MS);
  } catch (err) {
    console.error('[agentHub] Failed to dispatch job:', err.message);
    state.dispatchInFlight = false;
    state.currentJobId = null;
  }
}

/**
 * Shared by both termination paths from the policy: session timeout and
 * manual stop. The queue/software state moves on immediately — we don't
 * block the student on hardware acknowledgment — while still telling the
 * agent (best-effort) to actually stop the rig.
 */
async function endActiveJob(jobId, { status, endReason }) {
  clearExecutionTimer();

  try {
    const job = await jobModel.getJobById(jobId);
    if (!job || (job.status !== jobModel.JOB_STATUS.RUNNING && job.status !== jobModel.JOB_STATUS.QUEUED)) {
      return; // already ended (e.g. completed just before the timeout fired)
    }

    await jobModel.endJob(jobId, { status, endReason });
    clientHub.sendToStudent(job.studentUid, { jobId, status, endReason });

    send(SERVER_ABORT_JOB, { jobId, reason: endReason });

    state.currentJobId = null;
    state.currentStudentUid = null;
    state.dispatchInFlight = false;

    await broadcastQueueSnapshot();
    attemptDispatch();
  } catch (err) {
    console.error(`[agentHub] Failed to end job ${jobId}:`, err.message);
  }
}

/**
 * Called by the REST layer when a student manually stops their own
 * execution (Manual Session Termination in the policy).
 */
async function requestManualTermination(jobId) {
  await endActiveJob(jobId, {
    status: jobModel.JOB_STATUS.TERMINATED_BY_USER,
    endReason: 'terminated_by_user',
  });
}

function startExecutionTimer(jobId) {
  clearExecutionTimer();
  state.executionTimer = setTimeout(() => {
    endActiveJob(jobId, { status: jobModel.JOB_STATUS.TIMED_OUT, endReason: 'timed_out' });
  }, EXECUTION_TIMEOUT_MS);
}

async function onJobStarted(jobId) {
  clearDispatchAckTimer();
  state.dispatchInFlight = false;
  state.currentJobId = jobId;

  try {
    await jobModel.markJobRunning(jobId);
    startExecutionTimer(jobId);

    const job = await jobModel.getJobById(jobId);
    if (job) {
      state.currentStudentUid = job.studentUid;
      clientHub.sendToStudent(job.studentUid, {
        jobId,
        status: jobModel.JOB_STATUS.RUNNING,
      });
    }
    await broadcastQueueSnapshot();
  } catch (err) {
    console.error(`[agentHub] Failed to process job_started for ${jobId}:`, err.message);
  }
}

async function onJobCompleted(jobId, resultSummary) {
  clearExecutionTimer();

  try {
    const job = await jobModel.getJobById(jobId);
    if (!job) return;

    await jobModel.endJob(jobId, {
      status: jobModel.JOB_STATUS.COMPLETED,
      endReason: 'completed',
      resultRef: resultSummary ? JSON.stringify(resultSummary) : null,
    });

    clientHub.sendToStudent(job.studentUid, {
      jobId,
      status: jobModel.JOB_STATUS.COMPLETED,
      endReason: 'completed',
    });

    state.currentJobId = null;
    state.currentStudentUid = null;
    state.dispatchInFlight = false;

    await broadcastQueueSnapshot();
    attemptDispatch();
  } catch (err) {
    console.error(`[agentHub] Failed to process job_completed for ${jobId}:`, err.message);
  }
}

async function onJobError(jobId, message) {
  clearExecutionTimer();

  try {
    const job = await jobModel.getJobById(jobId);
    if (!job) return;

    await jobModel.endJob(jobId, {
      status: jobModel.JOB_STATUS.ERROR,
      endReason: 'error',
      errorMessage: message || 'The Lab Agent reported an error during execution.',
    });

    clientHub.sendToStudent(job.studentUid, {
      jobId,
      status: jobModel.JOB_STATUS.ERROR,
      endReason: 'error',
    });

    state.currentJobId = null;
    state.currentStudentUid = null;
    state.dispatchInFlight = false;

    await broadcastQueueSnapshot();
    attemptDispatch();
  } catch (err) {
    console.error(`[agentHub] Failed to process job_error for ${jobId}:`, err.message);
  }
}

/**
 * Called by wsServer.js for every new connection on /ws/agent. The first
 * message must be AGENT_HELLO with the shared secret.
 */
function handleConnection(ws) {
  let authenticated = false;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Everything below can hit Firestore/Storage — wrap the whole handler
    // so a transient failure (e.g. credentials misconfigured, network
    // blip) logs and drops this one message instead of crashing the
    // process and taking down every other connection with it.
    try {
      if (!authenticated) {
        if (message.type !== AGENT_HELLO) return;

        if (!AGENT_SHARED_SECRET || message.secret !== AGENT_SHARED_SECRET) {
          ws.send(JSON.stringify({ type: SERVER_HELLO_REJECTED, reason: 'Invalid agent secret.' }));
          ws.close();
          return;
        }

        // Replace any stale prior connection (e.g. agent reconnecting
        // after a network blip) rather than allowing two.
        if (state.socket && state.socket !== ws) {
          state.socket.close();
        }

        authenticated = true;
        state.socket = ws;
        ws.send(JSON.stringify({ type: SERVER_HELLO_ACK, ok: true }));
        await broadcastQueueSnapshot();
        attemptDispatch();
        return;
      }

      switch (message.type) {
        case AGENT_HEARTBEAT:
          ws.send(JSON.stringify({ type: SERVER_HEARTBEAT_ACK }));
          break;
        case AGENT_JOB_STARTED:
          await onJobStarted(message.jobId);
          break;
        case AGENT_JOB_COMPLETED:
          await onJobCompleted(message.jobId, message.resultSummary);
          break;
        case AGENT_JOB_ERROR:
          await onJobError(message.jobId, message.message);
          break;
        case AGENT_JOB_ABORTED:
          // Courtesy ack that the rig actually stopped — software state
          // was already updated when the abort was issued, so just log.
          console.log(`[agentHub] Agent confirmed abort for job ${message.jobId}`);
          break;
        case AGENT_CAMERA_FRAME:
          // Guard against frames arriving just after a job ended (e.g. a
          // straggler in flight when the timeout fired) — the camera
          // session is bounded by the same window as execution, so once
          // currentJobId no longer matches, silently drop it.
          if (message.jobId === state.currentJobId && state.currentStudentUid) {
            clientHub.sendCameraFrame(state.currentStudentUid, {
              jobId: message.jobId,
              mimeType: message.mimeType,
              data: message.data,
              frameNumber: message.frameNumber,
              timestamp: message.timestamp,
            });
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`[agentHub] Error handling message type "${message.type}":`, err.message);
    }
  });

  ws.on('close', async () => {
    if (state.socket === ws) {
      state.socket = null;
      console.warn('[agentHub] Lab Agent disconnected.');
      await broadcastQueueSnapshot();
    }
  });
}

/**
 * Periodic liveness sweep for the agent connection specifically — a
 * silently-dead on-prem connection is worse here than for a browser tab,
 * since it means the rig looks "online" while actually unreachable.
 */
function startHeartbeatSweep(intervalMs = 30000) {
  return setInterval(() => {
    if (!state.socket) return;
    if (state.socket.isAlive === false) {
      state.socket.terminate();
      state.socket = null;
      return;
    }
    state.socket.isAlive = false;
    state.socket.ping();
  }, intervalMs);
}

module.exports = {
  handleConnection,
  isAgentOnline,
  attemptDispatch,
  requestManualTermination,
  startHeartbeatSweep,
};
