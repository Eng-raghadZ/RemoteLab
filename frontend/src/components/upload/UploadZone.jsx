// src/components/upload/UploadZone.jsx
//
// The drag & drop target. File browsing itself is delegated to a hidden
// <input> that UploadCard owns (via onBrowseClick) so the same input can
// also be triggered by SelectedFile's "Replace File" button.

import React, { useCallback, useState } from "react";

export default function UploadZone({ onBrowseClick, onFileSelected, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleActivate = useCallback(() => {
    if (disabled) return;
    onBrowseClick();
  }, [disabled, onBrowseClick]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate]
  );

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) onFileSelected(dropped);
    },
    [disabled, onFileSelected]
  );

  return (
    <div
      className={`up-zone ${isDragOver ? "up-zone-drag" : ""} ${disabled ? "up-zone-disabled" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload Assembly file. Drag and drop a file here, or press Enter to browse."
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <UploadIcon />
      <p className="up-zone-text">
        Drag &amp; Drop your Assembly file here
        <span className="up-zone-or">or</span>
        <span className="up-zone-browse">Click to Browse</span>
      </p>
      <span className="up-zone-hint">Accepted format: .asm</span>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="up-zone-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15V4M12 4l-4 4M12 4l4 4"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
      />
    </svg>
  );
}
