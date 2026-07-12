// src/components/upload/UploadCard.jsx
//
// Orchestrates the upload flow. Owns the single hidden file <input>
// (shared by the drop zone's click/keyboard activation and the
// "Replace File" button) and renders the right child component for
// each state from useAssemblyUpload.

import React, { useRef } from "react";
import UploadZone from "./UploadZone";
import SelectedFile from "./SelectedFile";
import UploadProgress from "./UploadProgress";
import UploadSuccess from "./UploadSuccess";
import { useAssemblyUpload, UPLOAD_STATUS } from "../../hooks/useAssemblyUpload";

const ACCEPT = ".asm";

export default function UploadCard({ onContinue }) {
  const inputRef = useRef(null);

  const {
    status,
    file,
    progress,
    errorMessage,
    jobId,
    selectFile,
    removeFile,
    startUpload,
    reset,
  } = useAssemblyUpload();

  const openFileDialog = () => inputRef.current?.click();

  const handleInputChange = (e) => {
    const chosen = e.target.files?.[0];
    if (chosen) selectFile(chosen);
    // Reset so re-selecting the same filename still fires onChange.
    e.target.value = "";
  };

  const isUploading = status === UPLOAD_STATUS.UPLOADING;
  const hasFile =
    status === UPLOAD_STATUS.SELECTED ||
    status === UPLOAD_STATUS.UPLOADING ||
    status === UPLOAD_STATUS.ERROR;
  const isSuccess = status === UPLOAD_STATUS.SUCCESS;

  return (
    <div className="up-card">
      <style>{uploadCss}</style>
      <div className="up-card-notch" aria-hidden="true" />

      <span className="up-eyebrow">
        <span className="up-eyebrow-dot" /> Remote Lab · 80386 Trainer Kit
      </span>
      <h2 className="up-title">Upload Assembly Program</h2>
      <p className="up-sub">
        Upload your Intel 80386 Assembly (.asm) file to prepare it for compilation and execution
        on the remote laboratory.
      </p>

      {/* Single shared input — driven by the drop zone and "Replace File" */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="up-hidden-input"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {isSuccess ? (
        <UploadSuccess fileName={file?.name} onUploadAnother={reset} onContinue={() => onContinue?.(jobId)} />
      ) : (
        <>
          {!hasFile && (
            <UploadZone
              onBrowseClick={openFileDialog}
              onFileSelected={selectFile}
              disabled={isUploading}
            />
          )}

          <div
            className={`up-error ${errorMessage ? "up-error-visible" : ""}`}
            role="alert"
            aria-hidden={!errorMessage}
          >
            {errorMessage}
          </div>

          {hasFile && (
            <SelectedFile
              file={file}
              onReplace={openFileDialog}
              onRemove={removeFile}
              disabled={isUploading}
            />
          )}

          {isUploading && <UploadProgress percent={progress} />}

          <button
            type="button"
            className="up-submit-btn"
            onClick={startUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <span className="up-btn-spinner" aria-hidden="true" />
                <span>Uploading…</span>
              </>
            ) : (
              <span>Upload File</span>
            )}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CSS — matches the login card's visual language (notched corners,   */
/* same tokens via inherited CSS variables, same clip-path language). */
/* ------------------------------------------------------------------ */

const uploadCss = `
.up-card {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  background: var(--rl-surface-strong);
  border: 1px solid rgba(63, 224, 197, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  clip-path: polygon(0 0, 94% 0, 100% 5%, 100% 100%, 6% 100%, 0 95%);
  padding: 36px 32px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.4);
}
.rl-light .up-card {
  border: 1px solid rgba(36, 51, 63, 0.14);
  box-shadow: 0 20px 44px rgba(28, 43, 61, 0.1);
}

.up-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rl-cyan);
  margin-bottom: 14px;
}
.up-eyebrow-dot { width: 6px; height: 6px; background: var(--rl-cyan); display: inline-block; }

.up-title {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  font-size: 24px;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
  color: var(--rl-ink);
}
.up-sub {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--rl-muted);
  margin: 0 0 26px;
  max-width: 46ch;
}

.up-hidden-input { display: none; }

/* ---------- drop zone ---------- */
.up-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 42px 20px;
  border: 1.5px dashed rgba(159, 179, 204, 0.35);
  background: rgba(5, 14, 26, 0.35);
  color: var(--rl-muted);
  cursor: pointer;
  clip-path: polygon(0 0, 100% 0, 100% 92%, 96% 100%, 0 100%);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}
.rl-light .up-zone { background: rgba(230, 227, 219, 0.6); border-color: rgba(36, 51, 63, 0.25); }

.up-zone:hover,
.up-zone:focus-visible {
  border-color: var(--rl-cyan);
  background: rgba(63, 224, 197, 0.06);
}
.up-zone:focus-visible { outline: 2px solid var(--rl-focus-ring); outline-offset: 3px; }
.up-zone-drag { border-color: var(--rl-cyan); background: rgba(63, 224, 197, 0.1); transform: scale(1.01); }
.up-zone-disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

.up-zone-icon { width: 34px; height: 34px; color: var(--rl-cyan); }
.up-zone-text { font-size: 14px; color: var(--rl-ink); margin: 4px 0 0; display: flex; flex-direction: column; gap: 4px; }
.up-zone-or { font-size: 11.5px; color: var(--rl-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.up-zone-browse { font-weight: 700; color: var(--rl-cyan); }
.up-zone-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--rl-muted);
  margin-top: 6px;
}

/* ---------- error banner (animated) ---------- */
.up-error {
  font-size: 12.5px;
  line-height: 1.5;
  color: #ff9d9d;
  background: rgba(220, 60, 60, 0.12);
  border: 1px solid rgba(220, 60, 60, 0.35);
  clip-path: polygon(0 0, 100% 0, 100% 75%, 96% 100%, 0 100%);
  max-height: 0;
  padding: 0 12px;
  margin: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-4px);
  transition: max-height 0.25s ease, opacity 0.25s ease, transform 0.25s ease, padding 0.25s ease, margin 0.25s ease;
}
.up-error-visible {
  max-height: 60px;
  padding: 10px 12px;
  margin: 16px 0 0;
  opacity: 1;
  transform: translateY(0);
}
.rl-light .up-error { color: #9a2f2f; background: rgba(200, 60, 60, 0.08); border-color: rgba(200, 60, 60, 0.3); }

/* ---------- selected file ---------- */
.up-selected {
  margin-top: 20px;
  padding: 18px 20px;
  background: rgba(5, 14, 26, 0.4);
  border: 1px solid rgba(63, 224, 197, 0.22);
  clip-path: polygon(0 0, 100% 0, 100% 85%, 94% 100%, 0 100%);
}
.rl-light .up-selected { background: rgba(230, 227, 219, 0.75); border-color: rgba(20, 118, 106, 0.25); }

.up-selected-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--rl-cyan);
  margin-bottom: 14px;
}
.up-check-icon { width: 18px; height: 18px; }

.up-selected-meta { margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; }
.up-selected-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.up-selected-row dt { color: var(--rl-muted); margin: 0; flex-shrink: 0; }
.up-selected-row dd {
  color: var(--rl-ink);
  margin: 0;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}

.up-selected-actions { display: flex; gap: 10px; }
.up-btn-ghost {
  flex: 1;
  padding: 10px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rl-ink);
  background: transparent;
  border: 1px solid var(--rl-card-border);
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.up-btn-ghost:hover { border-color: var(--rl-cyan); color: var(--rl-cyan); }
.up-btn-ghost:focus-visible { outline: 2px solid var(--rl-focus-ring); outline-offset: 2px; }
.up-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.up-btn-ghost-danger:hover { border-color: #e05f5f; color: #ff9d9d; }
.rl-light .up-btn-ghost-danger:hover { color: #9a2f2f; }

/* ---------- progress ---------- */
.up-progress { display: flex; align-items: center; gap: 12px; margin-top: 20px; }
.up-progress-track {
  flex: 1;
  height: 8px;
  background: rgba(159, 179, 204, 0.18);
  clip-path: polygon(0 0, 100% 0, 98% 100%, 0 100%);
  overflow: hidden;
}
.up-progress-fill {
  height: 100%;
  background: linear-gradient(120deg, var(--rl-cyan), var(--rl-blue));
  transition: width 0.35s ease;
}
.up-progress-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--rl-cyan);
  min-width: 34px;
  text-align: right;
}

/* ---------- submit button ---------- */
.up-submit-btn {
  width: 100%;
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 14.5px;
  letter-spacing: 0.01em;
  color: #05121f;
  background: linear-gradient(120deg, var(--rl-cyan), var(--rl-blue));
  border: none;
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
}
.up-submit-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.up-submit-btn:active:not(:disabled) { transform: translateY(0); filter: brightness(0.96); }
.up-submit-btn:focus-visible { outline: 2px solid var(--rl-focus-ring); outline-offset: 2px; }
.up-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: none; transform: none; }

.up-btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(5, 18, 31, 0.35);
  border-top-color: #05121f;
  border-radius: 50%;
  animation: upSpin 0.7s linear infinite;
}
@keyframes upSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .up-btn-spinner { animation-duration: 1.4s; }
  .up-zone-drag { transform: none; }
}

/* ---------- success state ---------- */
.up-success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12px 0 4px; }
.up-success-icon { width: 56px; height: 56px; color: var(--rl-cyan); margin-bottom: 16px; }
.up-success-title { font-size: 18px; font-weight: 800; margin: 0 0 8px; color: var(--rl-ink); }
.up-success-sub { font-size: 13.5px; color: var(--rl-muted); margin: 0 0 26px; line-height: 1.6; }
.up-success-filename {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: var(--rl-cyan);
  margin-bottom: 4px;
  word-break: break-all;
}
.up-success-actions { display: flex; gap: 12px; width: 100%; }
.up-success-actions .up-btn-ghost { margin-top: 0; }
.up-success-continue { margin-top: 0; flex: 1; }

/* ---------- responsive ---------- */
@media (max-width: 640px) {
  .up-card { padding: 26px 20px; }
  .up-zone { padding: 32px 16px; }
  .up-success-actions { flex-direction: column; }
}
`;
