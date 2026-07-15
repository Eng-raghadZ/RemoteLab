import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("../../services/statusService", () => ({
  getPublicStatus: vi.fn(),
}));

import { getPublicStatus } from "../../services/statusService";
import RigStatus from "./RigStatus";

describe("RigStatus", () => {
  beforeEach(() => {
    getPublicStatus.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a loading state, then online once the rig is free", async () => {
    getPublicStatus.mockResolvedValue({ rigOnline: true, rigBusy: false, queueLength: 0 });
    render(<RigStatus />);

    expect(screen.getByText(/Checking rig status/i)).toBeInTheDocument();
    expect(await screen.findByText(/Trainer kit online/i)).toBeInTheDocument();
  });

  it("shows busy with the queue length when the rig is running a job", async () => {
    getPublicStatus.mockResolvedValue({ rigOnline: true, rigBusy: true, queueLength: 3 });
    render(<RigStatus />);
    expect(await screen.findByText(/Trainer kit busy · 3 in queue/i)).toBeInTheDocument();
  });

  it("shows offline when the Lab Agent isn't connected", async () => {
    getPublicStatus.mockResolvedValue({ rigOnline: false, rigBusy: false, queueLength: 0 });
    render(<RigStatus />);
    expect(await screen.findByText(/Trainer kit offline/i)).toBeInTheDocument();
  });

  it("shows an unknown state (not a crash) if the request fails", async () => {
    getPublicStatus.mockRejectedValue(new Error("network down"));
    render(<RigStatus />);
    expect(await screen.findByText(/Status unavailable/i)).toBeInTheDocument();
  });

  it("polls again after the interval elapses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getPublicStatus
      .mockResolvedValueOnce({ rigOnline: true, rigBusy: false, queueLength: 0 })
      .mockResolvedValueOnce({ rigOnline: true, rigBusy: true, queueLength: 1 });

    render(<RigStatus />);
    await vi.waitFor(() => expect(getPublicStatus).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    await vi.waitFor(() => expect(getPublicStatus).toHaveBeenCalledTimes(2));
  });
});
