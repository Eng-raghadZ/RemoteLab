// src/pages/JobStatusPage.jsx
//
// Page 3: Job Status. Reached from Page 2's "Continue" button after a
// successful upload (see UploadCard.jsx / UploadSuccess.jsx).
//
// Polls GET /api/jobs/:jobId every few seconds until the job reaches a
// terminal state. This polling is an interim mechanism — real-time
// /ws/client integration (next on the roadmap) will replace it with a
// push-based update instead, without changing anything else on this page.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import { getJobStatus, JobServiceError } from "../services/jobService";

const POLL_INTERVAL_MS = 4000;

// Mirrors backend/src/models/jobModel.js's JOB_STATUS exactly — keep in
// sync by hand if that enum ever changes.
const TERMINAL_STATUSES = new Set(["completed", "timed_out", "terminated_by_user", "error"]);

const STATUS_META = {
  queued: { label: "Queued", tone: "info" },
  running: { label: "Running", tone: "active" },
  completed: { label: "Completed", tone: "success" },
  timed_out: { label: "Timed Out", tone: "warning" },
  terminated_by_user: { label: "Terminated", tone: "warning" },
  error: { label: "Error", tone: "error" },
};

function formatTimestamp(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function JobStatusPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");

  const pollTimeoutRef = useRef(null);
  // Guards against setting state after unmount (e.g. student navigates
  // away mid-poll) and against a stale poll firing for a jobId the
  // component has since moved on from.
  const isMountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getJobStatus(jobId);
      if (!isMountedRef.current) return;

      setJob(data);
      setLoadState("ready");

      if (!TERMINAL_STATUSES.has(data.status)) {
        pollTimeoutRef.current = setTimeout(fetchStatus, POLL_INTERVAL_MS);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setErrorMessage(
        err instanceof JobServiceError ? err.message : "Something went wrong loading this job."
      );
      setLoadState("error");
    }
  }, [jobId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus();
    return () => {
      isMountedRef.current = false;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [fetchStatus]);

  const meta = job ? STATUS_META[job.status] || { label: job.status, tone: "info" } : null;

  return (
    <PageShell>
      <style>{pageCss}</style>
      <section className="js-hero">
        <div className="js-card">
          <div className="js-card-notch" aria-hidden="true" />

          <span className="js-eyebrow">
            <span className="js-eyebrow-dot" /> Remote Lab · Job Status
          </span>

          {loadState === "loading" && (
            <div className="js-loading" role="status">
              <span className="js-spinner" aria-hidden="true" />
              <span>Loading job status…</span>
            </div>
          )}

          {loadState === "error" && (
            <div className="js-error-state" role="alert">
              <p className="js-error-text">{errorMessage}</p>
              <button type="button" className="js-btn-ghost" onClick={() => navigate("/dashboard")}>
                Back to Upload
              </button>
            </div>
          )}

          {loadState === "ready" && job && (
            <>
              <h1 className="js-title">
                Job <span className="js-job-id">{job.id}</span>
              </h1>

              <div className={`js-status-badge js-status-${meta.tone}`}>
                {meta.tone === "active" && <span className="js-led" aria-hidden="true" />}
                {meta.label}
              </div>

              {job.status === "queued" && job.queuePosition != null && (
                <p className="js-inline-note">
                  Position <strong>{job.queuePosition}</strong> of {job.totalInQueue} in the
                  execution queue. This page updates automatically.
                </p>
              )}

              {job.status === "running" && (
                <p className="js-inline-note">
                  Your program is executing on the trainer kit right now. Live camera view is
                  coming soon — this page will update automatically when it finishes.
                </p>
              )}

              {job.status === "completed" && (
                <p className="js-inline-note">
                  Execution finished successfully. A dedicated Results page with full output is
                  coming soon — here's what's available so far:
                </p>
              )}

              {job.status === "timed_out" && (
                <p className="js-inline-note">
                  This execution reached the 5-minute limit and was stopped automatically. Submit
                  a new job if you'd like to run it again.
                </p>
              )}

              {job.status === "terminated_by_user" && (
                <p className="js-inline-note">
                  This execution was stopped manually. Submit a new job if you'd like to run it
                  again.
                </p>
              )}

              {job.status === "error" && (
                <p className="js-inline-note js-inline-note-error">
                  {job.errorMessage || "This job failed for an unknown reason."}
                </p>
              )}

              <dl className="js-meta">
                <div className="js-meta-row">
                  <dt>File</dt>
                  <dd>{job.fileName}</dd>
                </div>
                <div className="js-meta-row">
                  <dt>Submitted</dt>
                  <dd>{formatTimestamp(job.submittedAt)}</dd>
                </div>
                <div className="js-meta-row">
                  <dt>Started</dt>
                  <dd>{formatTimestamp(job.startedAt)}</dd>
                </div>
                <div className="js-meta-row">
                  <dt>Completed</dt>
                  <dd>{formatTimestamp(job.completedAt)}</dd>
                </div>
              </dl>

              {job.resultRef && (
                <div className="js-result-preview">
                  <span className="js-result-label">Result data</span>
                  <pre className="js-result-pre">{job.resultRef}</pre>
                </div>
              )}

              <div className="js-actions">
                <Link to="/dashboard" className="js-btn-ghost">
                  Upload Another File
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* CSS — matches UploadCard's visual language exactly (notched corners, */
/* same inherited CSS variables, same clip-path language).             */
/* ------------------------------------------------------------------ */

const pageCss = `
.js-hero {
  display: flex;
  justify-content: center;
  padding: 48px 20px;
}

.js-card {
  position: relative;
  width: 100%;
  max-width: 560px;
  background: var(--rl-surface-strong);
  border: 1px solid rgba(63, 224, 197, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  clip-path: polygon(0 0, 94% 0, 100% 5%, 100% 100%, 6% 100%, 0 95%);
  padding: 36px 32px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.4);
}
.rl-light .js-card {
  border: 1px solid rgba(36, 51, 63, 0.14);
  box-shadow: 0 20px 44px rgba(28, 43, 61, 0.1);
}

.js-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rl-cyan);
  margin-bottom: 18px;
}
.js-eyebrow-dot { width: 6px; height: 6px; background: var(--rl-cyan); display: inline-block; }

.js-title {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.01em;
  margin: 0 0 16px;
  color: var(--rl-ink);
}
.js-job-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 600;
  color: var(--rl-cyan);
}

/* ---------- status badge ---------- */
.js-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 8px 14px;
  clip-path: polygon(0 0, 100% 0, 100% 70%, 95% 100%, 0 100%);
  margin-bottom: 18px;
}
.js-status-info { color: var(--rl-cyan); background: rgba(63, 224, 197, 0.12); border: 1px solid rgba(63, 224, 197, 0.3); }
.js-status-active { color: var(--rl-cyan); background: rgba(63, 224, 197, 0.16); border: 1px solid rgba(63, 224, 197, 0.4); }
.js-status-success { color: #6ee787; background: rgba(63, 224, 130, 0.12); border: 1px solid rgba(63, 224, 130, 0.32); }
.js-status-warning { color: #f5c56b; background: rgba(245, 197, 107, 0.12); border: 1px solid rgba(245, 197, 107, 0.32); }
.js-status-error { color: #ff9d9d; background: rgba(220, 60, 60, 0.12); border: 1px solid rgba(220, 60, 60, 0.35); }
.rl-light .js-status-success { color: #1a7a34; }
.rl-light .js-status-warning { color: #8a6412; }
.rl-light .js-status-error { color: #9a2f2f; }

.js-led {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--rl-cyan);
  box-shadow: 0 0 8px var(--rl-cyan);
  animation: jsBlink 1.8s ease-in-out infinite;
}
@keyframes jsBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .js-led { animation: none; } }

/* ---------- inline notes ---------- */
.js-inline-note {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--rl-muted);
  margin: 0 0 22px;
}
.js-inline-note-error { color: #ff9d9d; }
.rl-light .js-inline-note-error { color: #9a2f2f; }

/* ---------- meta list ---------- */
.js-meta {
  margin: 0 0 20px;
  padding: 16px 18px;
  background: rgba(5, 14, 26, 0.35);
  border: 1px solid rgba(63, 224, 197, 0.16);
  clip-path: polygon(0 0, 100% 0, 100% 88%, 95% 100%, 0 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rl-light .js-meta { background: rgba(230, 227, 219, 0.6); border-color: rgba(36, 51, 63, 0.14); }
.js-meta-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.js-meta-row dt { color: var(--rl-muted); margin: 0; flex-shrink: 0; }
.js-meta-row dd {
  color: var(--rl-ink);
  margin: 0;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}

/* ---------- result preview ---------- */
.js-result-preview { margin: 0 0 24px; }
.js-result-label {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--rl-muted);
  margin-bottom: 8px;
}
.js-result-pre {
  margin: 0;
  padding: 14px 16px;
  background: rgba(5, 14, 26, 0.5);
  border: 1px solid rgba(63, 224, 197, 0.16);
  clip-path: polygon(0 0, 100% 0, 100% 92%, 97% 100%, 0 100%);
  color: var(--rl-ink);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow-y: auto;
}
.rl-light .js-result-pre { background: rgba(230, 227, 219, 0.7); border-color: rgba(36, 51, 63, 0.14); }

/* ---------- actions ---------- */
.js-actions { display: flex; gap: 12px; }
.js-btn-ghost {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--rl-ink);
  text-decoration: none;
  background: transparent;
  border: 1px solid var(--rl-card-border);
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}
.js-btn-ghost:hover { border-color: var(--rl-cyan); color: var(--rl-cyan); }
.js-btn-ghost:focus-visible { outline: 2px solid var(--rl-focus-ring); outline-offset: 2px; }

/* ---------- loading state ---------- */
.js-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--rl-muted);
  padding: 8px 0 4px;
}
.js-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(159, 179, 204, 0.3);
  border-top-color: var(--rl-cyan);
  border-radius: 50%;
  animation: jsSpin 0.7s linear infinite;
}
@keyframes jsSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .js-spinner { animation-duration: 1.4s; } }

/* ---------- error state ---------- */
.js-error-state { padding: 8px 0 4px; }
.js-error-text { font-size: 14px; color: #ff9d9d; line-height: 1.6; margin: 0 0 20px; }
.rl-light .js-error-text { color: #9a2f2f; }

/* ---------- responsive ---------- */
@media (max-width: 640px) {
  .js-card { padding: 26px 20px; }
  .js-actions { flex-direction: column; }
}
`;
