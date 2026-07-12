// src/services/uploadService.js
//
// Real upload service — POSTs to the Remote Lab API server's
// POST /api/jobs endpoint (see backend/src/routes/jobs.routes.js, field
// name "program").
//
// Uses XMLHttpRequest rather than fetch specifically because it exposes
// real upload progress via xhr.upload.onprogress — fetch's body-streaming
// progress APIs aren't reliably supported across browsers for uploads.
//
// The rest of the app (useAssemblyUpload) only depends on this function's
// shape: it takes a File and an onProgress callback, and resolves with
// { ok, jobId }. That contract is unchanged from the mocked version this
// replaces.

import { auth } from "../firebase/firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Upload an Assembly source file to the remote lab server.
 *
 * @param {File} file - the selected .asm file
 * @param {(percent: number) => void} [onProgress] - called with 0-100 as the upload advances
 * @returns {Promise<{ ok: boolean, jobId: string }>}
 */
export function uploadAssembly(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided to uploadAssembly."));
      return;
    }

    if (!API_BASE_URL) {
      reject(new Error("VITE_API_BASE_URL is not configured."));
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      reject(new Error("No signed-in user — cannot upload."));
      return;
    }

    currentUser
      .getIdToken()
      .then((idToken) => {
        const formData = new FormData();
        formData.append("program", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/api/jobs`);
        xhr.setRequestHeader("Authorization", `Bearer ${idToken}`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress?.(percent);
        };

        xhr.onload = () => {
          let body = null;
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            // Non-JSON response body — body stays null, handled below.
          }

          if (xhr.status >= 200 && xhr.status < 300 && body?.jobId) {
            // The server has confirmed the upload; make sure the UI's
            // progress bar reflects 100% even if the last progress event
            // fired slightly before the response actually landed.
            onProgress?.(100);
            resolve({ ok: true, jobId: body.jobId });
          } else {
            reject(new Error(body?.error || `Upload failed with status ${xhr.status}.`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.onabort = () => reject(new Error("Upload was cancelled."));

        xhr.send(formData);
      })
      .catch(() => {
        reject(new Error("Could not verify your session. Please log in again."));
      });
  });
}
