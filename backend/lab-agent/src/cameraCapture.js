const { encodeFrame } = require('./pngEncoder');

/**
 * CameraCapture — the ONLY module that should ever know how to grab a
 * frame from the physical camera. Currently STUBBED: it generates a
 * synthetic PNG frame with a moving bar (see pngEncoder.js) on a fixed
 * interval, so the whole capture -> relay -> live-view pipeline can be
 * exercised end-to-end before real camera hardware is wired up.
 *
 * When a real camera is available (e.g. via a USB capture card or an
 * RTSP/V4L2 source), only this file needs to change — wsClient.js just
 * calls start(jobId, onFrame) / stop(jobId) and doesn't care where frames
 * come from.
 */

const FRAME_INTERVAL_MS = Number(process.env.CAMERA_FRAME_INTERVAL_MS) || 1000;
const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 120;

// jobId -> interval handle, so stop() can cancel the right one. Only one
// entry should ever exist at a time (one rig, one job running).
const activeCaptures = new Map();

/**
 * Begins emitting frames for a job via onFrame({ mimeType, data, frameNumber, timestamp }).
 * Safe to call once per job — a second call for the same jobId is a no-op.
 */
function start(jobId, onFrame) {
  if (activeCaptures.has(jobId)) return;

  console.log(`[cameraCapture:stub] Starting capture for job ${jobId}`);
  let frameNumber = 0;

  const emitFrame = () => {
    try {
      const pngBuffer = encodeFrame(FRAME_WIDTH, FRAME_HEIGHT, frameNumber);
      onFrame({
        mimeType: 'image/png',
        data: pngBuffer.toString('base64'),
        frameNumber,
        timestamp: Date.now(),
      });
      frameNumber += 1;
    } catch (err) {
      console.error(`[cameraCapture:stub] Failed to generate frame for job ${jobId}:`, err.message);
    }
  };

  emitFrame(); // first frame immediately, don't make the student wait a full interval
  const interval = setInterval(emitFrame, FRAME_INTERVAL_MS);
  activeCaptures.set(jobId, interval);
}

/**
 * Stops emitting frames for a job. Called on completion, error, or abort
 * — the live view should never outlive the execution/camera session.
 */
function stop(jobId) {
  const interval = activeCaptures.get(jobId);
  if (!interval) return;

  clearInterval(interval);
  activeCaptures.delete(jobId);
  console.log(`[cameraCapture:stub] Stopped capture for job ${jobId}`);
}

module.exports = { start, stop };
