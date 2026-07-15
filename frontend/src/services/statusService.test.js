import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function makeFetchResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("getPublicStatus", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:4000");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("fetches /api/status with no Authorization header", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(makeFetchResponse(200, { rigOnline: true, rigBusy: false, queueLength: 0 }));

    const { getPublicStatus } = await import("./statusService");
    const result = await getPublicStatus();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:4000/api/status");
    expect(result).toEqual({ rigOnline: true, rigBusy: false, queueLength: 0 });
  });

  it("throws a message on a non-2xx response", async () => {
    global.fetch = vi.fn().mockResolvedValue(makeFetchResponse(500, {}));
    const { getPublicStatus } = await import("./statusService");
    await expect(getPublicStatus()).rejects.toThrow(/failed to load rig status/i);
  });

  it("rejects if VITE_API_BASE_URL is not configured", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { getPublicStatus } = await import("./statusService");
    await expect(getPublicStatus()).rejects.toThrow(/not configured/i);
  });
});
