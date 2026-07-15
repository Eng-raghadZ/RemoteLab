const jobModel = require('../models/jobModel');
const agentHub = require('../websocket/agentHub');

/**
 * GET /api/status
 *
 * Public, unauthenticated snapshot of the rig — powers the landing
 * page's "Trainer kit online" indicator for signed-out visitors.
 *
 * Deliberately excludes anything per-student (no studentUid, no jobId) —
 * that richer detail is already available, authenticated, via
 * GET /api/jobs/queue/status (see jobs.controller.js::getQueueStatus).
 * This endpoint only ever answers three yes/no/count questions: is the
 * Lab Agent connected, is it currently running something, and how many
 * jobs are in the queue.
 */
async function getPublicStatus(req, res, next) {
  try {
    const queue = await jobModel.getQueueSnapshot();
    const isRunning = queue.some((job) => job.status === jobModel.JOB_STATUS.RUNNING);

    return res.json({
      rigOnline: agentHub.isAgentOnline(),
      rigBusy: isRunning,
      queueLength: queue.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicStatus };
