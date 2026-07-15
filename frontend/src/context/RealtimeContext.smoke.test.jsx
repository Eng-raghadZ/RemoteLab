import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Minimal fake WebSocket so realtimeClient.js can run in jsdom without a
// real server. Auto-"opens" and then the client sends client_auth, which
// we immediately ack.
class FakeWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }
  send(raw) {
    const msg = JSON.parse(raw);
    if (msg.type === "client_auth") {
      setTimeout(() => this.onmessage?.({ data: JSON.stringify({ type: "auth_ack", ok: true }) }), 0);
    }
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

vi.mock("../firebase/firebase", () => ({
  auth: { currentUser: { getIdToken: () => Promise.resolve("fake-token") } },
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" }, profile: null, initializing: false }),
}));

function Probe({ useRealtime }) {
  const { connectionState } = useRealtime();
  return <div data-testid="state">{connectionState}</div>;
}

describe("RealtimeProvider", () => {
  let originalWS;

  beforeEach(() => {
    originalWS = global.WebSocket;
    global.WebSocket = FakeWebSocket;
    // VITE_API_BASE_URL is read once at module load time (same constraint
    // documented in uploadService.test.js), so a fresh env value needs a
    // fresh module instance to actually take effect.
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:4000");
  });

  afterEach(() => {
    global.WebSocket = originalWS;
    vi.unstubAllEnvs();
  });

  it("connects and authenticates, reaching the open state", async () => {
    const { RealtimeProvider, useRealtime } = await import("./RealtimeContext");

    render(
      <RealtimeProvider>
        <Probe useRealtime={useRealtime} />
      </RealtimeProvider>
    );
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("open"));
  });
});
