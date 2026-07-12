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
    const { jobId, fileName, downloadUrl } = message;
    console.log(`[lab-agent] Job ${jobId} dispatched (${fileName})`);

    let fileBuffer;
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error(`[lab-agent] Failed to download job ${jobId}:`, err);
      send(AGENT_JOB_ERROR, { jobId, message: 'Lab Agent could not download the program file.' });
      return;
    }

    trainerKit.startExecution(jobId, fileBuffer, {
      onStarted: () => {
        send(AGENT_JOB_STARTED, { jobId });
        // Camera session is defined entirely by the execution window — it
        // starts the moment the program starts running, full stop, no
        // separate reservation of its own.
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
