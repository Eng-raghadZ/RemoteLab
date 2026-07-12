// src/components/upload/UploadSuccess.jsx

import React from "react";

export default function UploadSuccess({ fileName, onUploadAnother, onContinue }) {
  return (
    <div className="up-success" role="status">
      <SuccessIcon />
      <h2 className="up-success-title">File uploaded successfully.</h2>
      <p className="up-success-sub">
        {fileName && <span className="up-success-filename">{fileName}</span>}
        Ready for compilation.
      </p>

      <div className="up-success-actions">
        <button type="button" className="up-btn-ghost" onClick={onUploadAnother}>
          Upload Another File
        </button>
        <button type="button" className="up-submit-btn up-success-continue" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg className="up-success-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2" />
      <path
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 24.5l6 6L33.5 17"
      />
    </svg>
  );
}
