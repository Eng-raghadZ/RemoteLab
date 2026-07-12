import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { authState } = vi.hoisted(() => ({
  authState: { currentUser: null },
}));

vi.mock("../firebase/firebase", () => ({
  auth: authState,
}));

function makeFetchResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("getJobStatus", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:4000");
    authState.currentUser = { getIdToken: vi.fn().mockResolvedValue("fake-id-token") };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    authState.currentUser = null;
    vi.restoreAllMocks();
  });

  it("rejects if no student is signed in", async () => {
    authState.currentUser = null;
    const { getJobStatus, JobServiceError } = await import("./jobService");
    await expect(getJobStatus("job-1")).rejects.toThrow(/no signed-in user/i);
    await expect(getJobStatus("job-1")).rejects.toBeInstanceOf(JobServiceError);
  });

  it("fetches the job with the correct URL and auth header", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      makeFetchResponse(200, { id: "job-1", status: "queued", fileName: "boot.asm" })
    );

    const { getJobStatus } = await import("./jobService");
    const result = await getJobStatus("job-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/jobs/job-1",
      expect.objectContaining({
        headers: { Authorization: "Bearer fake-id-token" },
      })
    );
    expect(result).toEqual({ id: "job-1", status: "queued", fileName: "boot.asm" });
  });

  it("URL-encodes the jobId", async () => {
    global.fetch = vi.fn().mockResolvedValue(makeFetchResponse(200, { id: "job with space" }));
    const { getJobStatus } = await import("./jobService");
    await getJobStatus("job with space");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/jobs/job%20with%20space",
      expect.anything()
    );
  });

  it("throws a specific message for a 404", async () => {
    global.fetch = vi.fn().mockResolvedValue(makeFetchResponse(404, { error: "Job not found." }));
    const { getJobStatus } = await import("./jobService");
    await expect(getJobStatus("missing-job")).rejects.toThrow(/doesn't exist or has been removed/i);
  });

  it("throws a specific message for a 403", async () => {
    global.fetch = vi.fn().mockResolvedValue(makeFetchResponse(403, { error: "Forbidden." }));
    const { getJobStatus } = await import("./jobService");
    await expect(getJobStatus("someone-elses-job")).rejects.toThrow(/don't have access/i);
  });

  it("surfaces the server's error message for other failures", async () => {
    global.fetch = vi.fn().mockResolvedValue(makeFetchResponse(500, { error: "Something broke." }));
    const { getJobStatus } = await import("./jobService");
    await expect(getJobStatus("job-1")).rejects.toThrow(/something broke/i);
  });

  it("throws a network error message if fetch itself rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const { getJobStatus } = await import("./jobService");
    await expect(getJobStatus("job-1")).rejects.toThrow(/network error/i);
  });

  it("rejects if VITE_API_BASE_URL is not configured", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { getJobStatus } = await import("./jobService");
    await expect(getJobStatus("job-1")).rejects.toThrow(/not configured/i);
  });
});
