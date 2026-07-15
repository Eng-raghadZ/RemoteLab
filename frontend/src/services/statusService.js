// src/services/statusService.js
//
// Public, unauthenticated rig status (GET /api/status — see
// backend/src/controllers/status.controller.js). Unlike jobService.js /
// uploadService.js, this deliberately does NOT attach a Firebase ID
// token — it's meant to work for signed-out visitors on the landing
// page too.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * @returns {Promise<{ rigOnline: boolean, rigBusy: boolean, queueLength: number }>}
 */
export async function getPublicStatus() {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}/api/status`);
  if (!response.ok) {
    throw new Error(`Failed to load rig status (${response.status}).`);
  }
  return response.json();
}
