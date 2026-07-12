// src/components/upload/SelectedFile.jsx

import React from "react";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatModifiedDate(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SelectedFile({ file, onReplace, onRemove, disabled }) {
  if (!file) return null;

  return (
    <div className="up-selected" role="status">
      <div className="up-selected-head">
        <CheckIcon />
        <span>File Selected</span>
      </div>

      <dl className="up-selected-meta">
        <div className="up-selected-row">
          <dt>Name</dt>
          <dd title={file.name}>{file.name}</dd>
        </div>
        <div className="up-selected-row">
          <dt>Size</dt>
          <dd>{formatBytes(file.size)}</dd>
        </div>
        <div className="up-selected-row">
          <dt>Modified</dt>
          <dd>{formatModifiedDate(file.lastModified)}</dd>
        </div>
      </dl>

      <div className="up-selected-actions">
        <button
          type="button"
          className="up-btn-ghost"
          onClick={onReplace}
          disabled={disabled}
        >
          Replace File
        </button>
        <button
          type="button"
          className="up-btn-ghost up-btn-ghost-danger"
          onClick={onRemove}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="up-check-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12.5l2.5 2.5L16 9.5"
      />
    </svg>
  );
}
