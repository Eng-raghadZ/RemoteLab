// src/services/jobService.js
//
// Read-only job status calls to the Remote Lab API server
// (GET /api/jobs/:jobId — see backend/src/controllers/jobs.controller.js).
// Uses fetch rather than XMLHttpRequest (unlike uploadService.js) since
// there's no upload progress to track for a simple GET.

import { auth } from "../firebase/firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class JobServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "JobServiceError";
    this.status = status;
  }
}

/**
 * Fetch the current status of a job (queue position included while
 * queued). Throws JobServiceError with a friendly message on any failure.
 */
export async function getJobStatus(jobId) {
  if (!API_BASE_URL) {
    throw new JobServiceError("VITE_API_BASE_URL is not configured.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new JobServiceError("No signed-in user — cannot fetch job status.");
  }

  let idToken;
  try {
    idToken = await currentUser.getIdToken();
  } catch {
    throw new JobServiceError("Could not verify your session. Please log in again.");
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
  } catch {
    throw new JobServiceError("Network error — check your connection and try again.");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON response body — body stays null, handled by the status
    // check below, which falls back to a generic message.
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new JobServiceError("This job doesn't exist or has been removed.", 404);
    }
    if (response.status === 403) {
      throw new JobServiceError("You don't have access to this job.", 403);
    }
    throw new JobServiceError(
      body?.error || `Failed to load job status (${response.status}).`,
      response.status
    );
  }

  return body;
}
