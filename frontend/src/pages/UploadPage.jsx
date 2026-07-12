// src/pages/UploadPage.jsx
//
// Page 2: File Upload Page. Reached only after a successful login
// (ProtectedRoute in App.jsx guards this — untouched here). Reuses
// PageShell for identical header/footer/background, and UploadCard for
// the actual upload flow.

import React from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import UploadCard from "../components/upload/UploadCard";
import { useAuth } from "../context/AuthContext";

export default function UploadPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.fullName || user?.displayName || user?.email || "Student";

  function handleContinue(jobId) {
    navigate(`/jobs/${jobId}`);
  }

  return (
    <PageShell>
      <style>{pageCss}</style>
      <section className="up-hero">
        <div className="up-hero-inner">
          <div className="up-welcome">
            <span className="up-welcome-eyebrow">
              <span className="up-welcome-dot" /> Computer Engineering · PTUK
            </span>
            <h1 className="up-welcome-title">
              Welcome back, <span className="up-welcome-name">{displayName}</span>
            </h1>
            <p className="up-welcome-sub">
              Upload an Intel 80386 Assembly program to run it on the remote trainer kit.
            </p>
          </div>

          <UploadCard onContinue={handleContinue} />
        </div>
      </section>
    </PageShell>
  );
}

const pageCss = `
.up-hero {
  padding: 132px 32px 60px;
  max-width: 1440px;
  margin: 0 auto;
}
.up-hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.up-welcome {
  text-align: center;
  max-width: 640px;
}
.up-welcome-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rl-cyan);
  margin-bottom: 16px;
}
.up-welcome-dot { width: 6px; height: 6px; background: var(--rl-cyan); display: inline-block; }

.up-welcome-title {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  font-size: clamp(26px, 3.4vw, 38px);
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 14px;
  color: var(--rl-ink);
}
.up-welcome-name {
  background: linear-gradient(120deg, var(--rl-cyan), var(--rl-blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.up-welcome-sub {
  font-size: 15px;
  line-height: 1.6;
  color: var(--rl-muted);
  margin: 0;
}

@media (max-width: 640px) {
  .up-hero { padding: 110px 18px 40px; }
}
`;
