// src/components/upload/UploadProgress.jsx

import React from "react";

export default function UploadProgress({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent ?? 0));

  return (
    <div className="up-progress">
      <div
        className="up-progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
      >
        <div className="up-progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="up-progress-label">{clamped}%</span>
    </div>
  );
}
