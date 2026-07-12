import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "student1@ptuk.edu.ps" },
    profile: { fullName: "Layla Odeh" },
    initializing: false,
  }),
}));

vi.mock("../firebase/auth", () => ({
  logout: vi.fn(),
}));

vi.mock("./../services/jobService", () => ({
  getJobStatus: vi.fn(),
  JobServiceError: class JobServiceError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  },
}));

import { getJobStatus } from "../services/jobService";
import JobStatusPage from "./JobStatusPage";

function renderAtJob(jobId) {
  return render(
    <MemoryRouter initialEntries={[`/jobs/${jobId}`]}>
      <ThemeProvider>
        <Routes>
          <Route path="/jobs/:jobId" element={<JobStatusPage />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("JobStatusPage", () => {
  beforeEach(() => {
    getJobStatus.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a loading state, then the queued status with queue position", async () => {
    getJobStatus.mockResolvedValue({
      id: "job-1",
      status: "queued",
      fileName: "boot.asm",
      queuePosition: 2,
      totalInQueue: 3,
      submittedAt: "2026-07-11T10:00:00.000Z",
      startedAt: null,
      completedAt: null,
    });

    renderAtJob("job-1");

    expect(screen.getByText(/Loading job status/i)).toBeInTheDocument();

    expect(await screen.findByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("boot.asm")).toBeInTheDocument();
    expect(screen.getByText(/Position/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows the running state with a live-view note", async () => {
    getJobStatus.mockResolvedValue({
      id: "job-2",
      status: "running",
      fileName: "loop.asm",
      submittedAt: "2026-07-11T10:00:00.000Z",
      startedAt: "2026-07-11T10:01:00.000Z",
      completedAt: null,
    });

    renderAtJob("job-2");

    expect(await screen.findByText("Running")).toBeInTheDocument();
    expect(screen.getByText(/Live camera view is coming soon/i)).toBeInTheDocument();
  });

  it("shows the completed state with result data when available", async () => {
    getJobStatus.mockResolvedValue({
      id: "job-3",
      status: "completed",
      fileName: "add.asm",
      submittedAt: "2026-07-11T10:00:00.000Z",
      startedAt: "2026-07-11T10:01:00.000Z",
      completedAt: "2026-07-11T10:02:00.000Z",
      resultRef: '{"registers":{"AX":"0004"}}',
    });

    renderAtJob("job-3");

    expect(await screen.findByText("Completed", { selector: ".js-status-badge" })).toBeInTheDocument();
    expect(screen.getByText(/"AX":"0004"/)).toBeInTheDocument();
  });

  it("shows the error state with the server's error message", async () => {
    getJobStatus.mockResolvedValue({
      id: "job-4",
      status: "error",
      fileName: "bad.asm",
      submittedAt: "2026-07-11T10:00:00.000Z",
      startedAt: null,
      completedAt: "2026-07-11T10:00:30.000Z",
      errorMessage: "Lab Agent did not acknowledge the job in time.",
    });

    renderAtJob("job-4");

    expect(await screen.findByText("Error")).toBeInTheDocument();
    expect(screen.getByText(/did not acknowledge the job in time/i)).toBeInTheDocument();
  });

  it("shows a friendly message and a way back when the fetch fails", async () => {
    const { JobServiceError } = await import("../services/jobService");
    getJobStatus.mockRejectedValue(new JobServiceError("This job doesn't exist or has been removed.", 404));

    renderAtJob("missing-job");

    expect(await screen.findByText(/doesn't exist or has been removed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to upload/i })).toBeInTheDocument();
  });

  it("polls again for a non-terminal status and stops once terminal", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    getJobStatus
      .mockResolvedValueOnce({
        id: "job-5",
        status: "queued",
        fileName: "poll.asm",
        queuePosition: 1,
        totalInQueue: 1,
        submittedAt: "2026-07-11T10:00:00.000Z",
        startedAt: null,
        completedAt: null,
      })
      .mockResolvedValueOnce({
        id: "job-5",
        status: "completed",
        fileName: "poll.asm",
        submittedAt: "2026-07-11T10:00:00.000Z",
        startedAt: "2026-07-11T10:00:05.000Z",
        completedAt: "2026-07-11T10:00:10.000Z",
      });

    renderAtJob("job-5");

    await vi.waitFor(() => expect(getJobStatus).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    await vi.waitFor(() => expect(getJobStatus).toHaveBeenCalledTimes(2));

    // No further polls should be scheduled once terminal — advancing well
    // past another interval should not trigger a third call.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(getJobStatus).toHaveBeenCalledTimes(2);
  });
});
