// src/components/results/ResultsPanel.jsx
//
// Renders a completed job's resultRef in a structured way instead of the
// raw JSON blob previously dumped inline on the Job Status page (roadmap
// item 5: "Results page"). resultRef's shape today comes straight from
// the trainerKit stub (backend/lab-agent/src/trainerKit.js):
//   { note, registers: { AX, BX, CX, DX }, executionTimeMs }
//
// This deliberately never hides data it doesn't recognize: if resultRef
// isn't valid JSON, or doesn't match the shape above, it falls back to
// showing the raw text/JSON rather than silently dropping it.

import React, { useMemo } from "react";

function parseResult(resultRef) {
  if (!resultRef) return null;
  try {
    return JSON.parse(resultRef);
  } catch {
    return null;
  }
}

function formatExecutionTime(ms) {
  if (typeof ms !== "number") return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function ResultsPanel({ resultRef }) {
  const parsed = useMemo(() => parseResult(resultRef), [resultRef]);

  if (!resultRef) return null;

  // Not valid JSON at all — show it raw rather than hiding it.
  if (!parsed || typeof parsed !== "object") {
    return (
      <div className="rp-wrap">
        <style>{rpCss}</style>
        <span className="rp-label">Result Data</span>
        <pre className="rp-raw">{resultRef}</pre>
      </div>
    );
  }

  const { registers, executionTimeMs, note } = parsed;
  const registerEntries = registers && typeof registers === "object" ? Object.entries(registers) : [];
  const execTime = formatExecutionTime(executionTimeMs);
  const hasKnownFields = registerEntries.length > 0 || Boolean(execTime) || Boolean(note);

  return (
    <div className="rp-wrap">
      <style>{rpCss}</style>
      <span className="rp-label">Execution Results</span>

      {registerEntries.length > 0 && (
        <div className="rp-registers">
          {registerEntries.map(([name, value]) => (
            <div key={name} className="rp-register">
              <span className="rp-register-name">{name}</span>
              <span className="rp-register-value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {execTime && (
        <div className="rp-meta-row">
          <span className="rp-meta-key">Execution time</span>
          <span className="rp-meta-value">{execTime}</span>
        </div>
      )}

      {note && <p className="rp-note">{note}</p>}

      {!hasKnownFields && (
        // Valid JSON, but none of the fields we know how to render —
        // still surface it rather than showing an empty box.
        <pre className="rp-raw">{JSON.stringify(parsed, null, 2)}</pre>
      )}
    </div>
  );
}

const rpCss = `
.rp-wrap { margin: 0 0 24px; }
.rp-label {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--rl-muted);
  margin-bottom: 10px;
}
.rp-registers {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.rp-register {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: rgba(5, 14, 26, 0.5);
  border: 1px solid rgba(63, 224, 197, 0.16);
  clip-path: polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%);
}
.rl-light .rp-register { background: rgba(230, 227, 219, 0.7); border-color: rgba(36, 51, 63, 0.14); }
.rp-register-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--rl-cyan);
  font-weight: 700;
}
.rp-register-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--rl-ink);
}
.rp-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 0;
  border-top: 1px solid rgba(159, 179, 204, 0.14);
}
.rp-meta-key { color: var(--rl-muted); }
.rp-meta-value {
  font-family: 'JetBrains Mono', monospace;
  color: var(--rl-ink);
}
.rp-note {
  font-size: 12.5px;
  color: var(--rl-muted);
  font-style: italic;
  margin: 10px 0 0;
}
.rp-raw {
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
.rl-light .rp-raw { background: rgba(230, 227, 219, 0.7); border-color: rgba(36, 51, 63, 0.14); }
`;
