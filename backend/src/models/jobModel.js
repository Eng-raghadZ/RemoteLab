const { initFirebaseAdmin } = require('../config/firebaseAdmin');

const JOBS_COLLECTION = 'jobs';

// Mirrors the Execution Queue & Camera Session Policy:
// queued -> running -> (completed | timed_out | terminated_by_user | error)
const JOB_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  TIMED_OUT: 'timed_out',
  TERMINATED_BY_USER: 'terminated_by_user',
  ERROR: 'error',
};

// Statuses that still occupy a slot in the execution queue.
const ACTIVE_STATUSES = [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING];

function getDb() {
  const admin = initFirebaseAdmin();
  return admin.firestore();
}

/**
 * Creates a new job in the "queued" state. Called right after the .asm file
 * has been validated and stored in Firebase Storage.
 */
async function createJob({ studentUid, studentEmail, fileName, storagePath }) {
  const admin = initFirebaseAdmin();
  const db = getDb();

  const jobRef = db.collection(JOBS_COLLECTION).doc();
  const job = {
    id: jobRef.id,
    studentUid,
    studentEmail: studentEmail || null,
    fileName,
    storagePath,
    status: JOB_STATUS.QUEUED,
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    startedAt: null,
    completedAt: null,
    // Populated once the Lab Agent finishes execution (Phase 2+).
    resultRef: null,
    errorMessage: null,
    // How the job ended: null while queued/running, else one of
    // 'completed' | 'timed_out' | 'terminated_by_user' | 'error'.
    endReason: null,
  };

  await jobRef.set(job);
  return jobRef.id;
}

async function getJobById(jobId) {
  const db = getDb();
  const doc = await db.collection(JOBS_COLLECTION).doc(jobId).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Most recent jobs submitted by a given student, newest first.
 */
async function getJobsForStudent(studentUid, limit = 20) {
  const db = getDb();
  const snapshot = await db
    .collection(JOBS_COLLECTION)
    .where('studentUid', '==', studentUid)
    .orderBy('submittedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

/**
 * All jobs still occupying the execution queue (queued or running),
 * ordered oldest-first — i.e. queue order. Index 0 is either the running
 * job, or the next one due to run.
 *
 * NOTE: this where(...) + orderBy(...) combination requires a Firestore
 * composite index (status ASC/IN, submittedAt ASC). Firestore will log a
 * console error containing a direct link to create it the first time this
 * query runs against a real project.
 */
async function getQueueSnapshot() {
  const db = getDb();
  const snapshot = await db
    .collection(JOBS_COLLECTION)
    .where('status', 'in', ACTIVE_STATUSES)
    .orderBy('submittedAt', 'asc')
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

/**
 * Computes a student-facing queue position for a given job:
 *  - position 1 + isRunning=true  -> it's their job currently on the rig
 *  - position 1 + isRunning=false -> they're next up
 *  - position N                   -> N-1 jobs ahead of them
 *  - null                         -> job isn't in the active queue anymore
 */
async function getQueuePositionForJob(jobId) {
  const queue = await getQueueSnapshot();
  const index = queue.findIndex((job) => job.id === jobId);
  if (index === -1) return null;

  return {
    position: index + 1,
    totalInQueue: queue.length,
    isRunning: queue[index].status === JOB_STATUS.RUNNING,
  };
}

/**
 * The oldest still-queued job (excludes anything already running), or null
 * if the queue is empty. Used by the dispatcher to pick what runs next.
 */
async function getNextQueuedJob() {
  const db = getDb();
  const snapshot = await db
    .collection(JOBS_COLLECTION)
    .where('status', '==', JOB_STATUS.QUEUED)
    .orderBy('submittedAt', 'asc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

/**
 * True if some job is currently occupying the rig.
 */
async function hasRunningJob() {
  const db = getDb();
  const snapshot = await db
    .collection(JOBS_COLLECTION)
    .where('status', '==', JOB_STATUS.RUNNING)
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Marks a job as running the moment the Lab Agent confirms it actually
 * started execution (job_started). This is also when the 5-minute
 * execution/camera-session clock officially starts.
 */
async function markJobRunning(jobId) {
  const admin = initFirebaseAdmin();
  const db = getDb();

  await db.collection(JOBS_COLLECTION).doc(jobId).update({
    status: JOB_STATUS.RUNNING,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Closes out a job with one of the three terminal outcomes from the
 * policy: completed, timed_out, or terminated_by_user (or error, for
 * anything unexpected on the Lab Agent side).
 */
async function endJob(jobId, { status, endReason, resultRef = null, errorMessage = null }) {
  const admin = initFirebaseAdmin();
  const db = getDb();

  await db.collection(JOBS_COLLECTION).doc(jobId).update({
    status,
    endReason,
    resultRef,
    errorMessage,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = {
  JOB_STATUS,
  ACTIVE_STATUSES,
  createJob,
  getJobById,
  getJobsForStudent,
  getQueueSnapshot,
  getQueuePositionForJob,
  getNextQueuedJob,
  hasRunningJob,
  markJobRunning,
  endJob,
};

