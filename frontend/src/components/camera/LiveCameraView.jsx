// src/components/camera/LiveCameraView.jsx
//
// Displays the live camera_frame stream relayed over /ws/client while a
// job is running. The backend->frontend pipe (agentHub.js -> clientHub.js)
// was already built and verified in Phase 3 (see
// remote-lab-full-workflow.md §6) — this was the missing frontend
// consumer ("roadmap item 4").
//
// Frames are PNG images sent as base64 (see backend/lab-agent's
// pngEncoder.js / cameraCapture.js), so they're rendered directly as a
// data: URL — no extra decoding needed on the client.

import React, { useEffect, useState } from "react";
import { useRealtime } from "../../context/RealtimeContext";

export default function LiveCameraView({ jobId }) {
  const { subscribe, connectionState } = useRealtime();
  const [frame, setFrame] = useState(null);

  useEffect(() => {
    setFrame(null);
    const unsubscribe = subscribe("camera_frame", (message) => {
      if (message.jobId !== jobId) return;
      setFrame({
        mimeType: message.mimeType,
        data: message.data,
        frameNumber: message.frameNumber,
      });
    });
    return unsubscribe;
  }, [jobId, subscribe]);

  return (
    <div className="lc-wrap">
      <style>{lcCss}</style>
      <span className="lc-label">Live Camera</span>
      <div className="lc-frame-box">
        {frame ? (
          <img
            className="lc-frame-img"
            src={`data:${frame.mimeType};base64,${frame.data}`}
            alt="Live trainer kit camera feed"
          />
        ) : (
          <div className="lc-placeholder" role="status">
            {connectionState === "open" ? "Waiting for the first frame…" : "Connecting to live feed…"}
          </div>
        )}
      </div>
      {frame && <span className="lc-frame-counter">Frame #{frame.frameNumber}</span>}
    </div>
  );
}

const lcCss = `
.lc-wrap { display: flex; flex-direction: column; gap: 8px; margin: 0 0 22px; }
.lc-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--rl-muted);
}
.lc-frame-box {
  aspect-ratio: 4 / 3;
  max-width: 320px;
  background: rgba(5, 14, 26, 0.6);
  border: 1px solid rgba(63, 224, 197, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.rl-light .lc-frame-box { background: rgba(230, 227, 219, 0.7); border-color: rgba(20, 118, 106, 0.22); }
.lc-frame-img { width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
.lc-placeholder {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--rl-muted);
  padding: 12px;
  text-align: center;
}
.lc-frame-counter {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--rl-muted);
}
`;
