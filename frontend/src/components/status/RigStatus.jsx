// src/components/status/RigStatus.jsx
//
// Live "is the trainer kit online / busy" indicator, used on the landing
// page (Page 1). Deliberately does NOT use the authenticated /ws/client
// realtime channel from RealtimeContext.jsx — that channel requires a
// signed-in Firebase user, but this indicator needs to work for
// signed-out visitors too. It polls the public, unauthenticated
// GET /api/status endpoint instead. Once a student signs in, the richer
// authenticated queue_update / job_status_changed stream takes over on
// the Dashboard and Job Status pages.
//
// This used to be a static, hardcoded "Trainer kit online" string
// embedded directly in RemoteLabLanding.jsx; it's now a real indicator,
// pulled out into its own file so it can be tested on its own.

import React, { useEffect, useState } from "react";
import { getPublicStatus } from "../../services/statusService";

const POLL_INTERVAL_MS = 15000;

function useRigStatus() {
  const [status, setStatus] = useState({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function poll() {
      try {
        const data = await getPublicStatus();
        if (cancelled) return;
        if (!data.rigOnline) {
          setStatus({ state: "offline" });
        } else if (data.rigBusy) {
          setStatus({ state: "busy", queueLength: data.queueLength });
        } else {
          setStatus({ state: "online", queueLength: data.queueLength });
        }
      } catch {
        if (!cancelled) setStatus({ state: "unknown" });
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return status;
}

const LABELS = {
  loading: "Checking rig status…",
  online: "Trainer kit online",
  busy: "Trainer kit busy",
  offline: "Trainer kit offline",
  unknown: "Status unavailable",
};

export default function RigStatus() {
  const status = useRigStatus();

  const ledClass =
    status.state === "online"
      ? "rs-led"
      : status.state === "busy"
      ? "rs-led rs-led-busy"
      : "rs-led rs-led-off";

  const label =
    status.state === "busy" && status.queueLength
      ? `${LABELS.busy} · ${status.queueLength} in queue`
      : LABELS[status.state] || LABELS.unknown;

  return (
    <div className="rs-wrap">
      <style>{rsCss}</style>
      <span className={ledClass} aria-hidden="true" />
      <span className="rs-text">
        {label} <span className="rs-sep">·</span>
      </span>
    </div>
  );
}

const rsCss = `
.rs-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--rl-muted);
  padding: 10px 16px;
  background: rgba(5, 18, 31, 0.55);
  border: 1px solid rgba(63, 224, 197, 0.22);
  clip-path: polygon(0 0, 100% 0, 100% 70%, 95% 100%, 0 100%);
}
.rl-light .rs-wrap {
  background: rgba(236, 233, 225, 0.85);
  border-color: rgba(20, 118, 106, 0.28);
}
.rs-led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rl-cyan);
  box-shadow: 0 0 8px var(--rl-cyan);
  animation: rsBlink 1.8s ease-in-out infinite;
}
.rs-led-busy { background: #f5c56b; box-shadow: 0 0 8px #f5c56b; }
.rs-led-off { background: #6b7684; box-shadow: none; animation: none; opacity: 0.6; }
@media (prefers-reduced-motion: reduce) { .rs-led { animation: none; } }
@keyframes rsBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.rs-sep { color: rgba(159,179,204,0.4); }
`;
