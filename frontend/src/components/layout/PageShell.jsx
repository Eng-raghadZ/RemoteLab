import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { logout } from "../../firebase/auth";

/**
 * PageShell — the header, footer, animated circuit background, and
 * light/dark theme toggle shared by every page in the app.
 *
 * This mirrors RemoteLabLanding.jsx's chrome exactly (same class names,
 * same CSS variables, same markup) so authenticated pages feel like part
 * of the same application. RemoteLabLanding.jsx itself is intentionally
 * left untouched — this is a separate, reusable shell for every page
 * that comes after login.
 */

const BG_IMAGE_URL = "/background4k.png";
const FONT_LINK_ID = "rl-fonts";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";

export default function PageShell({ children }) {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", listener);
    return () => mq.removeEventListener?.("change", listener);
  }, []);

  const isDark = theme === "dark";
  const monthYear = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const year = new Date().getFullYear();

  return (
    <div className={`rl-root ${isDark ? "rl-dark" : "rl-light"}`}>
      <style>{shellCss}</style>

      <div className="rl-bg" aria-hidden="true">
        <div className="rl-bg-photo" />
        <div className="rl-bg-wash" />
        <CircuitOverlay reducedMotion={reducedMotion} />
        <div className="rl-bg-vignette" />
      </div>

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

            {user && (
              <button
                type="button"
                className="rl-logout-btn"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogoutIcon />
                <span>Log Out</span>
              </button>
            )}

            <div className="rl-ptuk-mark" aria-label="Palestine Technical University - Kadoorie">
              <span className="rl-ptuk-initials">PTUK</span>
              <span className="rl-ptuk-full">Palestine Technical University&nbsp;–&nbsp;Kadoorie</span>
            </div>
          </div>
        </div>
      </header>

      <main className="rl-main">{children}</main>

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

function CircuitOverlay({ reducedMotion }) {
  return (
    <svg
      className={`rl-circuit-svg ${reducedMotion ? "rl-no-motion" : ""}`}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rlTraceGradShell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3FE0C5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2F8FE0" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <path className="rl-trace" d="M -50 120 H 260 L 320 180 V 360 L 420 460 H 760" fill="none" />
      <path className="rl-trace" d="M 1650 220 H 1280 L 1220 280 V 520 L 1100 640 H 820" fill="none" />
      <path className="rl-trace" d="M -50 820 H 240 L 300 760 V 600 L 420 480" fill="none" />

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
function LogoutIcon() {
  return (
    <svg className="rl-logout-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M15 8l4 4-4 4M19 12H9" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* CSS — same tokens, header, footer, and background as the login page */
/* ------------------------------------------------------------------ */

const shellCss = `
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
  display: flex;
  flex-direction: column;
}
.rl-light.rl-root { background: #ece9e1; }
.rl-root * { box-sizing: border-box; }

.rl-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: var(--rl-navy-950); }
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

.rl-circuit-svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.5; }
.rl-light .rl-circuit-svg { opacity: 0.18; }
.rl-trace { stroke: url(#rlTraceGradShell); stroke-width: 1.4; stroke-dasharray: 6 7; }
.rl-circuit-svg.rl-no-motion .rl-glow-dot { display: none; }

.rl-bg-vignette { position: absolute; inset: 0; box-shadow: inset 0 0 220px rgba(0,0,0,0.55); pointer-events: none; }
.rl-light .rl-bg-vignette { box-shadow: inset 0 0 180px rgba(28,43,61,0.05); }

.rl-header {
  position: fixed;
  top: 0; left: 0; right: 0;
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
.rl-light .rl-header-scrolled { background: rgba(238, 237, 231, 0.88); border-bottom: 1px solid rgba(40, 56, 72, 0.1); }

.rl-header-inner {
  max-width: 1440px; margin: 0 auto; padding: 16px 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
.rl-header-left { display: flex; align-items: center; gap: 14px; }
.rl-logo-mark {
  width: 38px; height: 38px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--rl-cyan), var(--rl-blue));
  clip-path: polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%);
  color: #05121f; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; letter-spacing: 0.04em;
}
.rl-system-name { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: -0.01em; color: var(--rl-ink); }
.rl-system-name-sub { font-weight: 600; color: var(--rl-muted); }
.rl-header-right { display: flex; align-items: center; gap: 18px; }

.rl-theme-toggle { display: flex; align-items: center; gap: 6px; background: transparent; border: none; cursor: pointer; color: var(--rl-muted); padding: 4px; }
.rl-icon-sm { width: 15px; height: 15px; transition: color 0.25s; }
.rl-icon-sm.rl-icon-active { color: var(--rl-cyan); }
.rl-toggle-track { width: 38px; height: 20px; background: rgba(159, 179, 204, 0.2); clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%); position: relative; display: inline-block; }
.rl-toggle-thumb {
  position: absolute; top: 2px; left: 3px; width: 14px; height: 16px;
  background: linear-gradient(135deg, var(--rl-cyan), var(--rl-blue));
  clip-path: polygon(20% 0, 100% 0, 80% 100%, 0 100%);
  transition: transform 0.3s ease;
}
.rl-dark .rl-toggle-thumb { transform: translateX(16px); }
.rl-theme-toggle:hover .rl-icon-sm { color: var(--rl-cyan); }
.rl-theme-toggle:focus-visible { outline: 2px solid var(--rl-focus-ring); outline-offset: 2px; border-radius: 1px; }

.rl-logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--rl-muted);
  background: transparent;
  border: 1px solid var(--rl-card-border);
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}
.rl-logout-btn:hover { border-color: var(--rl-cyan); color: var(--rl-cyan); }
.rl-logout-btn:focus-visible { outline: 2px solid var(--rl-focus-ring); outline-offset: 2px; }
.rl-logout-icon { width: 15px; height: 15px; }
@media (max-width: 640px) {
  .rl-logout-btn span { display: none; }
  .rl-logout-btn { padding: 7px 9px; }
}

.rl-ptuk-mark { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; padding-left: 16px; border-left: 1px solid rgba(159, 179, 204, 0.25); }
.rl-ptuk-initials { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; color: var(--rl-ink); }
.rl-ptuk-full { font-size: 10px; color: var(--rl-muted); max-width: 150px; text-align: right; }

.rl-main { position: relative; z-index: 1; flex: 1; }

.rl-footer { position: relative; z-index: 1; background: var(--rl-navy-800); color: #fff; border-top: 1px solid rgba(63, 224, 197, 0.18); }
.rl-footer-inner {
  max-width: 1440px; margin: 0 auto; padding: 18px 32px;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 12.5px;
}
.rl-footer-date { font-family: 'JetBrains Mono', monospace; color: var(--rl-cyan); }
.rl-footer-copy { color: rgba(255,255,255,0.75); }

@media (max-width: 640px) {
  .rl-header-inner { padding: 14px 18px; }
  .rl-ptuk-full { display: none; }
  .rl-footer-inner { flex-direction: column; align-items: flex-start; padding: 16px 18px; }
}
`;