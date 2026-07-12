import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mutable auth stub — vi.hoisted so it's available inside the vi.mock
// factory below despite hoisting.
const { authState } = vi.hoisted(() => ({
  authState: { currentUser: null },
}));

vi.mock("../firebase/firebase", () => ({
  auth: authState,
}));

/**
 * A minimal hand-rolled XMLHttpRequest stand-in. jsdom's real XHR would
 * actually try to open a connection, which we don't want in a unit test —
 * this captures what uploadService.js does with the object (method, URL,
 * headers, body) and lets each test manually fire the response it wants.
 */
class MockXHR {
  constructor() {
    this.upload = {};
    this.requestHeaders = {};
    MockXHR.instances.push(this);
  }
  open(method, url) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(key, value) {
    this.requestHeaders[key] = value;
  }
  send(body) {
    this.body = body;
  }
  respond(status, responseBody) {
    this.status = status;
    this.responseText = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
    this.onload?.();
  }
  fireUploadProgress(loaded, total) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  fireError() {
    this.onerror?.();
  }
}
MockXHR.instances = [];

// Waits for pending microtasks (promise chains) to flush before the test
// continues — needed because uploadAssembly awaits getIdToken() before
// constructing the XHR, and a bare `await Promise.resolve()` isn't
// reliably enough hops for an arbitrary promise chain. A macrotask flush
// guarantees every pending microtask has run first.
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeFile(name = "boot.asm") {
  return new File(["MOV AX, 1\nHLT"], name, { type: "text/plain" });
}

describe("uploadAssembly", () => {
  let originalXHR;

  beforeEach(() => {
    MockXHR.instances = [];
    originalXHR = global.XMLHttpRequest;
    global.XMLHttpRequest = MockXHR;
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:4000");
    authState.currentUser = { getIdToken: vi.fn().mockResolvedValue("fake-id-token") };
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
    vi.unstubAllEnvs();
    authState.currentUser = null;
  });

  it("rejects immediately if no file is provided", async () => {
    const { uploadAssembly } = await import("./uploadService");
    await expect(uploadAssembly(null, () => {})).rejects.toThrow(/no file provided/i);
  });

  it("rejects if no student is signed in", async () => {
    authState.currentUser = null;
    const { uploadAssembly } = await import("./uploadService");
    await expect(uploadAssembly(makeFile(), () => {})).rejects.toThrow(/no signed-in user/i);
  });

  it("POSTs to /api/jobs with the file under the 'program' field and a Bearer token", async () => {
    const { uploadAssembly } = await import("./uploadService");
    const promise = uploadAssembly(makeFile("test.asm"), () => {});

    await flushMicrotasks();

    const xhr = MockXHR.instances[0];
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("http://localhost:4000/api/jobs");
    expect(xhr.requestHeaders.Authorization).toBe("Bearer fake-id-token");
    expect(xhr.body.get("program").name).toBe("test.asm");

    xhr.respond(201, { jobId: "job-123", status: "queued" });
    await expect(promise).resolves.toEqual({ ok: true, jobId: "job-123" });
  });

  it("reports upload progress via onProgress", async () => {
    const { uploadAssembly } = await import("./uploadService");
    const onProgress = vi.fn();
    const promise = uploadAssembly(makeFile(), onProgress);

    await flushMicrotasks();

    const xhr = MockXHR.instances[0];
    xhr.fireUploadProgress(50, 100);
    expect(onProgress).toHaveBeenCalledWith(50);

    xhr.respond(201, { jobId: "job-456" });
    await promise;
    // Final call always forces 100%, even if the last progress event
    // didn't quite reach it (e.g. response arrives right after the last
    // TCP chunk is flushed).
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it("rejects with the server's error message on a non-2xx response", async () => {
    const { uploadAssembly } = await import("./uploadService");
    const promise = uploadAssembly(makeFile(), () => {});

    await flushMicrotasks();

    const xhr = MockXHR.instances[0];
    xhr.respond(400, { error: "Only .asm files are allowed." });

    await expect(promise).rejects.toThrow(/only \.asm files are allowed/i);
  });

  it("rejects on a network error", async () => {
    const { uploadAssembly } = await import("./uploadService");
    const promise = uploadAssembly(makeFile(), () => {});

    await flushMicrotasks();

    MockXHR.instances[0].fireError();
    await expect(promise).rejects.toThrow(/network error/i);
  });

  it("rejects if VITE_API_BASE_URL is not configured", async () => {
    // API_BASE_URL is read once at module load time, so a fresh env value
    // needs a fresh module instance to actually take effect.
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_API_BASE_URL", "");

    const { uploadAssembly } = await import("./uploadService");
    await expect(uploadAssembly(makeFile(), () => {})).rejects.toThrow(/not configured/i);
  });
});
