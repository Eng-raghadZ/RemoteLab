const { validateAsmFile } = require('../utils/validateAsmFile');
const { serializeJob, toIsoOrNull } = require('../utils/serializeJob');
const jobModel = require('../models/jobModel');
const agentHub = require('../websocket/agentHub');

/**
 * POST /api/jobs
 * Accepts a multipart upload (field name "program"), validates it's a
 * non-empty .asm file, and appends a new job to the execution queue.
 *
 * The .asm source itself is stored as a field directly on the job's
 * Firestore document (see jobModel.js::createJob) rather than as a
 * separate Firebase Storage object — it's capped at 256 KB by
 * validateAsmFile.js, comfortably inside Firestore's 1 MiB per-document
 * limit, so there's no need for a Storage bucket at all.
 */
async function submitJob(req, res, next) {
  try {
    const { valid, reason } = validateAsmFile(req.file);
    if (!valid) {
      return res.status(400).json({ error: reason });
    }

    const asmContent = req.file.buffer.toString('utf8');

    const jobId = await jobModel.createJob({
      studentUid: req.user.uid,
      studentEmail: req.user.email,
      fileName: req.file.originalname,
      asmContent,
    });

    const queueInfo = await jobModel.getQueuePositionForJob(jobId);

    // Opportunistic — only actually dispatches if the rig is free and the
    // Lab Agent is connected; otherwise this job just sits queued.
    agentHub.attemptDispatch();

    return res.status(201).json({
      jobId,
      status: jobModel.JOB_STATUS.QUEUED,
      queuePosition: queueInfo ? queueInfo.position : null,
      totalInQueue: queueInfo ? queueInfo.totalInQueue : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:jobId
 * Status of a single job. Students may only read their own jobs.
 */
async function getJobStatus(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await jobModel.getJobById(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.studentUid !== req.user.uid) {
      return res.status(403).json({ error: 'You do not have access to this job.' });
    }

    const queueInfo = await jobModel.getQueuePositionForJob(jobId);

    return res.json({
      ...serializeJob(job),
      queuePosition: queueInfo ? queueInfo.position : null,
      totalInQueue: queueInfo ? queueInfo.totalInQueue : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/me
 * The calling student's own job history, most recent first.
 */
async function getMyJobs(req, res, next) {
  try {
    const jobs = await jobModel.getJobsForStudent(req.user.uid);
    return res.json({ jobs: jobs.map(serializeJob) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/queue/status
 * A lightweight snapshot of the whole execution queue — used by the
 * frontend's rig-status indicator (see RigStatus in Page 1).
 */
async function getQueueStatus(req, res, next) {
  try {
    const queue = await jobModel.getQueueSnapshot();
    const running = queue.find((job) => job.status === jobModel.JOB_STATUS.RUNNING) || null;

    return res.json({
      rigBusy: Boolean(running),
      currentJob: running
        ? { jobId: running.id, studentUid: running.studentUid, startedAt: toIsoOrNull(running.startedAt) }
        : null,
      queueLength: queue.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/jobs/:jobId/terminate
 * Manual Session Termination from the policy: the student stops their own
 * running execution early. Only the owning student may do this, and only
 * while their job is actually running.
 */
async function terminateJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await jobModel.getJobById(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.studentUid !== req.user.uid) {
      return res.status(403).json({ error: 'You do not have access to this job.' });
    }

    if (job.status !== jobModel.JOB_STATUS.RUNNING) {
      return res.status(409).json({ error: 'This job is not currently running.' });
    }

    await agentHub.requestManualTermination(jobId);

    return res.json({ jobId, status: jobModel.JOB_STATUS.TERMINATED_BY_USER });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitJob, getJobStatus, getMyJobs, getQueueStatus, terminateJob };
