// src/hooks/useAssemblyUpload.js
//
// Encapsulates all upload state for the Upload page: file selection +
// validation, the simulated (later: real) upload with progress, and
// error handling. Keeping this in one hook means UploadCard and its
// children stay presentational and don't duplicate logic.

import { useCallback, useRef, useState } from "react";
import { uploadAssembly } from "../services/uploadService";

export const UPLOAD_STATUS = Object.freeze({
  IDLE: "idle",
  SELECTED: "selected",
  UPLOADING: "uploading",
  SUCCESS: "success",
  ERROR: "error",
});

const ACCEPTED_EXTENSION = ".asm";
const ERROR_MESSAGE_DURATION_MS = 4000;

function isAssemblyFile(file) {
  return Boolean(file) && file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION);
}

export function useAssemblyUpload() {
  const [status, setStatus] = useState(UPLOAD_STATUS.IDLE);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [jobId, setJobId] = useState(null);

  const errorTimeoutRef = useRef(null);

  const flashError = useCallback((message) => {
    setErrorMessage(message);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(""), ERROR_MESSAGE_DURATION_MS);
  }, []);

  const selectFile = useCallback(
    (candidate) => {
      if (!candidate) return;

      if (!isAssemblyFile(candidate)) {
        flashError("Only Assembly (.asm) files are allowed.");
        return;
      }

      setFile(candidate);
      setStatus(UPLOAD_STATUS.SELECTED);
      setProgress(0);
      setErrorMessage("");
    },
    [flashError]
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setStatus(UPLOAD_STATUS.IDLE);
    setProgress(0);
    setErrorMessage("");
  }, []);

  const startUpload = useCallback(async () => {
    if (!file) return;

    setStatus(UPLOAD_STATUS.UPLOADING);
    setErrorMessage("");

    try {
      const result = await uploadAssembly(file, (percent) => setProgress(percent));
      setJobId(result?.jobId ?? null);
      setStatus(UPLOAD_STATUS.SUCCESS);
    } catch (err) {
      flashError("Upload failed. Please try again.");
      setStatus(UPLOAD_STATUS.ERROR);
    }
  }, [file, flashError]);

  // Full reset back to idle — used by "Upload Another File".
  const reset = useCallback(() => {
    setFile(null);
    setStatus(UPLOAD_STATUS.IDLE);
    setProgress(0);
    setErrorMessage("");
    setJobId(null);
  }, []);

  return {
    status,
    file,
    progress,
    errorMessage,
    jobId,
    selectFile,
    removeFile,
    startUpload,
    reset,
  };
}
