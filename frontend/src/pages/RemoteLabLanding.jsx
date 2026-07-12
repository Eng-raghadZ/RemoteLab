import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginWithIdentifier, AuthError } from "../firebase/auth";
import { useTheme } from "../context/ThemeContext";
/**
 * Remote Lab for Microprocessors and Assembly Language — Landing Page
 * PTUK · Page 1
 *
 * Self-contained React component. Drop `background4k.png` next to this
 * file (or update BG_IMAGE_URL below) — it's used as the fixed circuit/die
 * photo background behind the whole page.
 */

const BG_IMAGE_URL = "/background4k.png";

const FONT_LINK_ID = "rl-fonts";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";

export default function RemoteLabLanding() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const navigate = useNavigate();
  const { user, initializing } = useAuth();

  // Auto-redirect already-authenticated users away from the login page.
  useEffect(() => {
    if (!initializing && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [initializing, user, navigate]);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    setLoginError("");
    setIsSubmitting(true);
    try {
      await loginWithIdentifier(username, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setLoginError(
        err instanceof AuthError ? err.message : "Something went wrong while signing in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // load fonts once
  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  // scroll -> header darkening
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", listener);
    return () => mq.removeEventListener?.("change", listener);
  }, []);

  const isDark = theme === "dark";
  const monthYear = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const year = new Date().getFullYear();

  return (
    <div className={`rl-root ${isDark ? "rl-dark" : "rl-light"}`}>
      <style>{css}</style>

      {/* Fixed photo + circuit background layer */}
      <div className="rl-bg" aria-hidden="true">
        <div className="rl-bg-photo" />
        <div className="rl-bg-wash" />
        <CircuitOverlay reducedMotion={reducedMotion} />
        <div className="rl-bg-vignette" />
      </div>

      {/* Header */}
      <header className={`rl-header ${scrolled ? "rl-header-scrolled" : ""}`}>
        <div className="rl-header-inner">
          <div className="rl-header-left">
            <div className="rl-logo-mark" aria-hidden="true">
              <span>RL</span>
            </div>
            <span className="rl-system-name">
              Remote Lab <span className="rl-system-name-sub">for Microprocessors</span>
            </span>
          </div>

          <div className="rl-header-right">
            <button
              type="button"
              className="rl-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
              aria-pressed={!isDark}
            >
              <SunIcon active={!isDark} />
              <span className="rl-toggle-track">
                <span className="rl-toggle-thumb" />
              </span>
              <MoonIcon active={isDark} />
            </button>

            <div className="rl-ptuk-mark" aria-label="Palestine Technical University - Kadoorie">
              <span className="rl-ptuk-initials">PTUK</span>
              <span className="rl-ptuk-full">Palestine Technical University&nbsp;–&nbsp;Kadoorie</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="rl-main">
        <section className="rl-hero">
          <div className="rl-hero-grid">
            {/* Left column */}
            <div className="rl-hero-left">
              <span className="rl-eyebrow">
                <span className="rl-eyebrow-dot" /> Computer Engineering · PTUK
              </span>

              <h1 className="rl-title">
                Remote Lab for <span className="rl-title-accent">Microprocessors</span> and
                Assembly Language
              </h1>

              <p className="rl-intro">
                This platform provides students with remote access to real microprocessor
                laboratory equipment through the internet. Upload Assembly programs, execute
                them on actual hardware, and observe the results from anywhere.
              </p>

              <div className="rl-feature-cards">
                <FeatureCard
                  title="Target Audience"
                  body="Undergraduate Computer Engineering students studying Microprocessors, Assembly Language, Embedded Systems, and Computer Architecture."
                />
                <FeatureCard
                  title="What It Does"
                  body="Remote access to lab equipment, upload and execute real Assembly programs, and real-time interaction with physical hardware."
                />
                <FeatureCard
                  title="Why It Matters"
                  body="Perform laboratory experiments without being physically present — improving accessibility, flexibility, and learning efficiency."
                />
              </div>

              <div className="rl-hw-strip">
                <HwItem label="Intel 80386" sub="Trainer Kit" icon={<ChipIcon />} />
                <HwItem label="Interface" sub="Controller" icon={<BoardIcon />} />
                <HwItem label="Live Camera" sub="Monitoring" icon={<CameraIcon />} />
                <HwItem label="Lab Server" sub="Processing" icon={<ServerIcon />} />
              </div>

              <RigStatus />
            </div>

            {/* Right column — login */}
            <div className="rl-hero-right">
              <div className="rl-login-card">
                <div className="rl-login-card-notch" aria-hidden="true" />
                <h2 className="rl-login-title">Lab Access</h2>
                <p className="rl-login-sub">Sign in to reach the remote 80386 trainer kit.</p>

                <form className="rl-login-form" onSubmit={handleLoginSubmit} noValidate>
                  <label className="rl-field">
                    <span className="rl-field-label">Student ID or University Email</span>
                    <span className="rl-input-wrap">
                      <UserIcon />
                      <input
                        type="text"
                        className="rl-input"
                        placeholder="e.g. 202012345 or you@ptuk.edu.ps"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        disabled={isSubmitting}
                      />
                    </span>
                  </label>

                  <label className="rl-field">
                    <span className="rl-field-label">Password</span>
                    <span className="rl-input-wrap">
                      <LockIcon />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="rl-input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="rl-pw-toggle"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </span>
                  </label>

                  {loginError && (
                    <div className="rl-login-error" role="alert">
                      {loginError}
                    </div>
                  )}

                  <button type="submit" className="rl-login-btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="rl-btn-spinner" aria-hidden="true" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowIcon />
                      </>
                    )}
                  </button>

                  <a href="#forgot-password" className="rl-forgot-link">
                    Forgot password?
                  </a>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="rl-footer">
        <div className="rl-footer-inner">
          <span className="rl-footer-date">© {monthYear}</span>
          <span className="rl-footer-copy">
            Copyright © {year} Remote Lab for Microprocessors and Assembly Language · All Rights
            Reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Sub-components                                                          */
/* ---------------------------------------------------------------------- */

function FeatureCard({ title, body }) {
  return (
    <div className="rl-feature-card">
      <div className="rl-feature-card-notch" aria-hidden="true" />
      <h3 className="rl-feature-title">{title}</h3>
      <p className="rl-feature-body">{body}</p>
    </div>
  );
}

function HwItem({ label, sub, icon }) {
  return (
    <div className="rl-hw-item">
      <div className="rl-hw-icon">{icon}</div>
      <div className="rl-hw-text">
        <span className="rl-hw-label">{label}</span>
        <span className="rl-hw-sub">{sub}</span>
      </div>
    </div>
  );
}

function RigStatus() {
  return (
    <div className="rl-rig-status">
      <span className="rl-led" aria-hidden="true" />
      <span className="rl-rig-text">
        Trainer kit online <span className="rl-rig-sep">·</span>
      </span>
      {/* <span className="rl-rig-mono">/dev/ttyLAB0</span> */}
    </div>
  );
}

function CircuitOverlay({ reducedMotion }) {
  return (
    <svg
      className={`rl-circuit-svg ${reducedMotion ? "rl-no-motion" : ""}`}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rlTraceGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3FE0C5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2F8FE0" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <path
        id="rlTraceA"
        className="rl-trace"
        d="M -50 120 H 260 L 320 180 V 360 L 420 460 H 760"
        fill="none"
      />
      <path
        id="rlTraceB"
        className="rl-trace"
        d="M 1650 220 H 1280 L 1220 280 V 520 L 1100 640 H 820"
        fill="none"
      />
      <path
        id="rlTraceC"
        className="rl-trace"
        d="M -50 820 H 240 L 300 760 V 600 L 420 480"
        fill="none"
      />

      {!reducedMotion && (
        <>
          <circle r="3.4" fill="#3FE0C5" className="rl-glow-dot">
            <animateMotion dur="6s" repeatCount="indefinite" path="M -50 120 H 260 L 320 180 V 360 L 420 460 H 760" />
          </circle>
          <circle r="3.4" fill="#2F8FE0" className="rl-glow-dot">
            <animateMotion dur="7.5s" repeatCount="indefinite" path="M 1650 220 H 1280 L 1220 280 V 520 L 1100 640 H 820" />
          </circle>
          <circle r="3" fill="#3FE0C5" className="rl-glow-dot">
            <animateMotion dur="5.2s" repeatCount="indefinite" path="M -50 820 H 240 L 300 760 V 600 L 420 480" />
          </circle>
        </>
      )}
    </svg>
  );
}

/* Icons (inline, stroke-based, no external deps) */
function SunIcon({ active }) {
  return (
    <svg className={`rl-icon-sm ${active ? "rl-icon-active" : ""}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
    </svg>
  );
}
function MoonIcon({ active }) {
  return (
    <svg className={`rl-icon-sm ${active ? "rl-icon-active" : ""}`} viewBox="0 0 24 24" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 1 0 10.5 10.5Z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M4.8 20c1.2-3.6 4-5.4 7.2-5.4s6 1.8 7.2 5.4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10.5" width="14" height="9" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M3 3l18 18M9.9 5.1A10.4 10.4 0 0 1 12 5c6 0 9.5 6.5 9.5 6.5a13.6 13.6 0 0 1-3.2 3.9M6.6 6.7C4 8.3 2.5 11.5 2.5 11.5S6 18 12 18a9.8 9.8 0 0 0 3.1-.5M9.6 12a2.6 2.6 0 0 0 3.7 2.6" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg className="rl-icon-arrow" viewBox="0 0 24 24" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function ChipIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <rect x="7" y="7" width="10" height="10" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" d="M9 2v3M12 2v3M15 2v3M9 19v3M12 19v3M15 19v3M2 9h3M2 12h3M2 15h3M19 9h3M19 12h3M19 15h3" />
    </svg>
  );
}
function BoardIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" d="M7 8h4M7 12h7M7 16h5" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="14" height="11" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" d="M17 10l4-2.4v9.8L17 15" />
      <circle cx="10" cy="12.5" r="2.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function ServerIcon() {
  return (
    <svg className="rl-icon" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="14" width="16" height="6" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M7 7h.01M7 17h.01" />
    </svg>
  );
}

/* ---------------------------------------------------------------------- */
/* CSS                                                                      */
/* ---------------------------------------------------------------------- */

const css = `
:root {
  --rl-navy-950: #050a14;
  --rl-navy-900: #0a1426;
  --rl-navy-800: #0f2d52;
  --rl-navy-700: #143a66;
  --rl-cyan: #3fe0c5;
  --rl-blue: #2f8fe0;
  --rl-ink: #eaf2fb;
  --rl-muted: #9fb3cc;
  --rl-text: #eaf2fb;
  --rl-placeholder: rgba(159, 179, 204, 0.55);
  --rl-focus-ring: rgba(63, 224, 197, 0.55);
  --rl-surface: rgba(15, 30, 50, 0.45);
  --rl-surface-strong: rgba(10, 20, 38, 0.6);
  --rl-surface-soft: rgba(15, 30, 50, 0.35);
  --rl-card-border: rgba(159, 179, 204, 0.16);
}

/* Light Mode — warm, low-glare, premium academic palette.
   Darkened versions of the accent hues are used here (rather than reusing
   the dark-mode neon cyan/blue) specifically so text and small UI labels
   clear WCAG AA contrast on the cream background; dark mode is untouched. */
.rl-light {
  --rl-ink: #24333f;
  --rl-muted: #56677a;
  --rl-cyan: #14766a;
  --rl-blue: #2c5b8a;
  --rl-text: #142f4e;
  --rl-placeholder: #7d8b9a;
  --rl-focus-ring: rgba(20, 118, 106, 0.45);
  --rl-surface: rgba(238, 236, 229, 0.78);
  --rl-surface-strong: rgba(238, 236, 229, 0.9);
  --rl-surface-soft: rgba(236, 234, 227, 0.72);
  --rl-card-border: rgba(36, 51, 63, 0.12);
}

.rl-root {
  position: relative;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--rl-ink);
  overflow-x: hidden;
  background: var(--rl-navy-950);
}
.rl-light.rl-root { background: #ece9e1; }

.rl-root * { box-sizing: border-box; }

/* ---------- background layer ---------- */
.rl-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: var(--rl-navy-950);
}
.rl-bg-photo {
  position: absolute;
  inset: 0;
  background-image: url('${BG_IMAGE_URL}');
  background-size: cover;
  background-position: center;
  opacity: 0.55;
  filter: saturate(1.1);
}
.rl-light .rl-bg-photo { opacity: 0.12; filter: saturate(0.55) brightness(1.15) contrast(0.92); }

.rl-bg-wash {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 20% 0%, rgba(15,45,82,0.15), transparent 55%),
              linear-gradient(180deg, rgba(5,10,20,0.55) 0%, rgba(5,10,20,0.78) 55%, rgba(5,10,20,0.92) 100%);
}
.rl-light .rl-bg-wash {
  background: linear-gradient(180deg, rgba(240,239,233,0.92) 0%, rgba(238,237,231,0.96) 55%, rgba(236,235,229,0.98) 100%);
}

.rl-circuit-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
}
.rl-light .rl-circuit-svg { opacity: 0.18; }
.rl-trace {
  stroke: url(#rlTraceGrad);
  stroke-width: 1.4;
  stroke-dasharray: 6 7;
}
.rl-circuit-svg.rl-no-motion .rl-glow-dot { display: none; }

.rl-bg-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 220px rgba(0,0,0,0.55);
  pointer-events: none;
}
.rl-light .rl-bg-vignette { box-shadow: inset 0 0 180px rgba(28,43,61,0.05); }

/* ---------- header ---------- */
.rl-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: transparent;
  border-bottom: 1px solid transparent;
  transition: background 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease;
}
.rl-header-scrolled {
  background: rgba(5, 10, 20, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(63, 224, 197, 0.18);
}
.rl-light .rl-header-scrolled {
  background: rgba(238, 237, 231, 0.88);
  border-bottom: 1px solid rgba(40, 56, 72, 0.1);
}

.rl-header-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.rl-header-left { display: flex; align-items: center; gap: 14px; }

.rl-logo-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--rl-cyan), var(--rl-blue));
  clip-path: polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%);
  color: #05121f;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.04em;
}

.rl-system-name {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: var(--rl-ink);
}
.rl-system-name-sub { font-weight: 600; color: var(--rl-muted); }

.rl-header-right { display: flex; align-items: center; gap: 18px; }

.rl-theme-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--rl-muted);
  padding: 4px;
}
.rl-icon-sm { width: 15px; height: 15px; transition: color 0.25s; }
.rl-icon-sm.rl-icon-active { color: var(--rl-cyan); }
.rl-toggle-track {
  width: 38px;
  height: 20px;
  background: rgba(159, 179, 204, 0.2);
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
  position: relative;
  display: inline-block;
}
.rl-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 3px;
  width: 14px;
  height: 16px;
  background: linear-gradient(135deg, var(--rl-cyan), var(--rl-blue));
  clip-path: polygon(20% 0, 100% 0, 80% 100%, 0 100%);
  transition: transform 0.3s ease;
}
.rl-dark .rl-toggle-thumb { transform: translateX(16px); }

.rl-ptuk-mark {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
  padding-left: 16px;
  border-left: 1px solid rgba(159, 179, 204, 0.25);
}
.rl-ptuk-initials {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--rl-ink);
}
.rl-ptuk-full {
  font-size: 10px;
  color: var(--rl-muted);
  max-width: 150px;
  text-align: right;
}

/* ---------- main / hero ---------- */
.rl-main { position: relative; z-index: 1; }
.rl-hero { padding: 132px 32px 60px; max-width: 1440px; margin: 0 auto; }

.rl-hero-grid {
  display: grid;
  grid-template-columns: 64% 33%;
  gap: 3%;
  align-items: start;
}

.rl-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rl-cyan);
  margin-bottom: 18px;
}
.rl-eyebrow-dot {
  width: 6px;
  height: 6px;
  background: var(--rl-cyan);
  display: inline-block;
}

.rl-title {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  font-size: clamp(32px, 2vw, 50px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
}
.rl-title-accent {
  background: linear-gradient(120deg, var(--rl-cyan), var(--rl-blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.rl-intro {
  font-size: 16px;
  line-height: 1.7;
  color: var(--rl-muted);
  max-width: 640px;
  margin: 0 0 32px;
}

.rl-feature-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.rl-feature-card {
  position: relative;
  background: rgba(15, 30, 50, 0.45);
  border: 1px solid rgba(159, 179, 204, 0.16);
  clip-path: polygon(0 0, 100% 0, 100% 80%, 90% 100%, 0 100%);
  padding: 18px 18px 16px;
  backdrop-filter: blur(6px);
  border-color: aqua;
}
.rl-light .rl-feature-card {
  background: rgba(236, 233, 225, 0.8);
  border: 1px solid rgba(36, 51, 63, 0.12);
}
.rl-feature-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin: 0 0 8px;
  color: var(--rl-ink);
}
.rl-feature-body {
  font-size: 13px;
  line-height: 1.55;
  color: var(--rl-muted);
  margin: 0;
}

.rl-hw-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.rl-hw-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(15, 30, 50, 0.35);
  border: 1px solid rgba(159, 179, 204, 0.14);
  clip-path: polygon(0 0, 100% 0, 100% 80%, 90% 100%, 0 100%);
  border-color: aqua;
}
.rl-light .rl-hw-item { background: rgba(236, 233, 225, 0.75); border-color: rgba(36, 51, 63, 0.12); }
.rl-hw-icon { color: var(--rl-cyan); flex-shrink: 0; }
.rl-icon { width: 18px; height: 18px; }
.rl-hw-text { display: flex; flex-direction: column; line-height: 1.25; }
.rl-hw-label { font-size: 12.5px; font-weight: 700; color: var(--rl-ink); }
.rl-hw-sub { font-size: 11px; color: var(--rl-muted); font-family: 'JetBrains Mono', monospace; }

.rl-rig-status {
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
.rl-light .rl-rig-status {
  background: rgba(236, 233, 225, 0.85);
  border-color: rgba(20, 118, 106, 0.28);
}
.rl-led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rl-cyan);
  box-shadow: 0 0 8px var(--rl-cyan);
  animation: rlBlink 1.8s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) { .rl-led { animation: none; } }
@keyframes rlBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.rl-rig-sep { color: rgba(159,179,204,0.4); }
.rl-rig-mono { margin-left: auto; color: var(--rl-cyan); }

/* ---------- login card ---------- */
.rl-hero-right { position: sticky; top: 110px; }
.rl-login-card {
  position: relative;
  background: rgba(10, 20, 38, 0.6);
  border: 1px solid rgba(63, 224, 197, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  clip-path: polygon(0 0, 92% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%);
  padding: 32px 28px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.4);
  border-color: aqua;
}
.rl-light .rl-login-card {
  background: rgba(236, 233, 225, 0.92);
  border: 1px solid rgba(36, 51, 63, 0.14);
  box-shadow: 0 20px 44px rgba(28, 43, 61, 0.1);
}
.rl-login-title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 6px;
}
.rl-login-sub {
  font-size: 13px;
  color: var(--rl-muted);
  margin: 0 0 24px;
  line-height: 1.5;
}

.rl-login-form { display: flex; flex-direction: column; gap: 18px; }
.rl-field { display: flex; flex-direction: column; gap: 7px; }
.rl-field-label {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--rl-muted);
}
.rl-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  background: rgba(5, 14, 26, 0.5);
  border: 1px solid rgba(159, 179, 204, 0.22);
  color: var(--rl-cyan);
}
.rl-light .rl-input-wrap { background: rgba(230, 227, 219, 0.9); border-color: rgba(36, 51, 63, 0.18); }
.rl-light .rl-input-wrap:focus-within { border-color: var(--rl-cyan); }
.rl-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--rl-ink);
}
.rl-input::placeholder { color: var(--rl-placeholder); opacity: 1; }
.rl-pw-toggle { background: none; border: none; cursor: pointer; color: var(--rl-muted); display: flex; }

.rl-login-btn {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.01em;
  color: #05121f;
  background: linear-gradient(120deg, var(--rl-cyan), var(--rl-blue));
  border: none;
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
  cursor: pointer;
  transition: filter 0.2s, transform 0.2s;
}
.rl-login-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
.rl-icon-arrow { width: 16px; height: 16px; }

.rl-forgot-link {
  text-align: center;
  font-size: 12.5px;
  color: var(--rl-muted);
  text-decoration: none;
  margin-top: 2px;
}
.rl-forgot-link:hover { color: var(--rl-cyan); }

/* ---------- login error banner + button spinner ---------- */
.rl-login-error {
  font-size: 12.5px;
  line-height: 1.5;
  color: #ff9d9d;
  background: rgba(220, 60, 60, 0.12);
  border: 1px solid rgba(220, 60, 60, 0.35);
  padding: 10px 12px;
  clip-path: polygon(0 0, 100% 0, 100% 75%, 96% 100%, 0 100%);
}
.rl-light .rl-login-error {
  color: #9a2f2f;
  background: rgba(200, 60, 60, 0.08);
  border-color: rgba(200, 60, 60, 0.3);
}
.rl-btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(5, 18, 31, 0.35);
  border-top-color: #05121f;
  border-radius: 50%;
  animation: rlSpin 0.7s linear infinite;
}
@keyframes rlSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .rl-btn-spinner { animation-duration: 1.4s; }
}

/* ---------- footer ---------- */
.rl-footer {
  position: relative;
  z-index: 1;
  background: var(--rl-navy-800);
  color: #fff;
  border-top: 1px solid rgba(63, 224, 197, 0.18);
}
.rl-footer-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 18px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12.5px;
}
.rl-footer-date { font-family: 'JetBrains Mono', monospace; color: var(--rl-cyan); }
.rl-footer-copy { color: rgba(255,255,255,0.75); }

/* ---------- interactive states (focus / hover / disabled) ---------- */
.rl-theme-toggle,
.rl-pw-toggle,
.rl-login-btn,
.rl-forgot-link,
.rl-input {
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.rl-theme-toggle:hover .rl-icon-sm { color: var(--rl-cyan); }
.rl-theme-toggle:focus-visible,
.rl-pw-toggle:focus-visible,
.rl-login-btn:focus-visible,
.rl-forgot-link:focus-visible,
.rl-input:focus-visible {
  outline: 2px solid var(--rl-focus-ring);
  outline-offset: 2px;
  border-radius: 1px;
}

.rl-pw-toggle:hover { color: var(--rl-cyan); }

.rl-login-btn:active { transform: translateY(0); filter: brightness(0.96); }
.rl-login-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  filter: none;
  transform: none;
}
.rl-input:disabled { opacity: 0.6; cursor: not-allowed; }

/* ---------- responsive ---------- */
@media (max-width: 1080px) {
  .rl-hero-grid { grid-template-columns: 1fr; }
  .rl-hero-right { position: static; margin-top: 32px; max-width: 460px; }
  .rl-feature-cards { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .rl-header-inner { padding: 14px 18px; }
  .rl-ptuk-full { display: none; }
  .rl-hero { padding: 110px 18px 40px; }
  .rl-feature-cards { grid-template-columns: 1fr; }
  .rl-hw-strip { grid-template-columns: 1fr 1fr; }
  .rl-footer-inner { flex-direction: column; align-items: flex-start; padding: 16px 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .rl-led { animation: none; }
  // .rl-main {
  // background-image: url(images/background4k.png);}
}

`;