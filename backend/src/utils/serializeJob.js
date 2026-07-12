/**
 * Firestore Admin SDK Timestamp objects have no toJSON(), so res.json()
 * would otherwise leak their raw internal shape ({_seconds, _nanoseconds})
 * straight into the API response — fragile and non-standard for any
 * client to consume. This converts every timestamp field on a job to a
 * normal ISO 8601 string (or null) before it ever leaves the server.
 */
function toIsoOrNull(value) {
  if (!value) return null;
  // Firestore Admin Timestamp exposes toDate(); guard in case a plain
  // Date or null ever ends up here instead (e.g. in tests).
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

/**
 * Returns a shallow copy of a job with submittedAt/startedAt/completedAt
 * normalized to ISO strings. Safe to call on null/undefined.
 */
function serializeJob(job) {
  if (!job) return job;
  return {
    ...job,
    submittedAt: toIsoOrNull(job.submittedAt),
    startedAt: toIsoOrNull(job.startedAt),
    completedAt: toIsoOrNull(job.completedAt),
  };
}

module.exports = { serializeJob, toIsoOrNull };
