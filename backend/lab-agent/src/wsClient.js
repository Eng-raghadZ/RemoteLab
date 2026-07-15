const WebSocket = require('ws');
const trainerKit = require('./trainerKit');
const cameraCapture = require('./cameraCapture');
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

const HEARTBEAT_INTERVAL_MS = 20000;

function start(config) {
  const { apiWsUrl, sharedSecret, reconnectDelayMs } = config;

  let ws = null;
  let heartbeatInterval = null;

  function send(type, payload = {}) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type, ...payload }));
  }

  function scheduleReconnect() {
    console.warn(`[lab-agent] Reconnecting in ${reconnectDelayMs}ms...`);
    setTimeout(connect, reconnectDelayMs);
  }

  async function handleJobDispatch(message) {
    const { jobId, fileName, content } = message;
    console.log(`[lab-agent] Job ${jobId} dispatched (${fileName})`);

    if (typeof content !== 'string') {
      console.error(`[lab-agent] Job ${jobId} dispatch arrived with no file content.`);
      send(AGENT_JOB_ERROR, { jobId, message: 'Lab Agent did not receive the program file.' });
      return;
    }

    // The .asm source travels inline in the dispatch message itself (see
    // agentHub.js::attemptDispatch) instead of being downloaded from a
    // signed Firebase Storage URL — one less network hop, and one less
    // thing that can fail (expired URL, bucket misconfiguration, etc).
    const fileBuffer = Buffer.from(content, 'utf8');

    trainerKit.startExecution(jobId, fileBuffer, {
      onStarted: () => {
        send(AGENT_JOB_STARTED, { jobId });
        cameraCapture.start(jobId, (frame) => send(AGENT_CAMERA_FRAME, { jobId, ...frame }));
      },
      onCompleted: (resultSummary) => {
        cameraCapture.stop(jobId);
        send(AGENT_JOB_COMPLETED, { jobId, resultSummary });
      },
      onError: (errMessage) => {
        cameraCapture.stop(jobId);
        send(AGENT_JOB_ERROR, { jobId, message: errMessage });
      },
    });
  }

  function handleAbortJob(message) {
    const { jobId } = message;
    trainerKit.abortExecution(jobId);
    cameraCapture.stop(jobId);
    send(AGENT_JOB_ABORTED, { jobId });
  }

  function connect() {
    ws = new WebSocket(apiWsUrl);

    ws.on('open', () => {
      console.log(`[lab-agent] Connected to ${apiWsUrl}, authenticating...`);
      send(AGENT_HELLO, { secret: sharedSecret });
    });

    ws.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (message.type) {
        case SERVER_HELLO_ACK:
          console.log('[lab-agent] Authenticated. Waiting for jobs.');
          heartbeatInterval = setInterval(() => send(AGENT_HEARTBEAT), HEARTBEAT_INTERVAL_MS);
          break;
        case SERVER_HELLO_REJECTED:
          console.error(`[lab-agent] Authentication rejected: ${message.reason}`);
          ws.close();
          break;
        case SERVER_JOB_DISPATCH:
          handleJobDispatch(message);
          break;
        case SERVER_ABORT_JOB:
          console.log(`[lab-agent] Abort requested for job ${message.jobId} (${message.reason})`);
          handleAbortJob(message);
          break;
        case SERVER_HEARTBEAT_ACK:
          break; // liveness confirmed, nothing to do
        default:
          break;
      }
    });

    ws.on('close', () => {
      console.warn('[lab-agent] Disconnected from API server.');
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error('[lab-agent] Connection error:', err.message);
    });
  }

  connect();
}

module.exports = { start };
