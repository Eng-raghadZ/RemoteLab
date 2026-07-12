import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia — polyfill it for components that
// check prefers-reduced-motion (e.g. PageShell). Real browsers all
// support this natively; this shim only exists for the test environment.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

