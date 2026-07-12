import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../services/uploadService", () => ({
  uploadAssembly: vi.fn(),
}));

import { uploadAssembly } from "../../services/uploadService";
import UploadCard from "./UploadCard";

function makeFile(name) {
  return new File(["MOV AX, 1\nHLT"], name, { type: "text/plain" });
}

describe("UploadCard error/retry path", () => {
  beforeEach(() => {
    uploadAssembly.mockReset();
  });

  it("keeps the selected file visible and re-enables Upload after a failed upload", async () => {
    uploadAssembly.mockRejectedValueOnce(new Error("network down"));

    render(<UploadCard onContinue={() => {}} />);
    const input = document.querySelector(".up-hidden-input");
    fireEvent.change(input, { target: { files: [makeFile("boot.asm")] } });

    const uploadBtn = await screen.findByRole("button", { name: /upload file/i });
    fireEvent.click(uploadBtn);

    // Error banner appears, doesn't crash the app.
    expect(await screen.findByText(/Upload failed\. Please try again\./i)).toBeInTheDocument();

    // The selected file is still shown (not silently reverted to the empty drop zone).
    expect(screen.getByText("File Selected")).toBeInTheDocument();
    expect(screen.getByText("boot.asm")).toBeInTheDocument();

    // Upload button is re-enabled so the user can retry.
    const retryBtn = screen.getByRole("button", { name: /upload file/i });
    expect(retryBtn).not.toBeDisabled();

    // Retry succeeds this time.
    uploadAssembly.mockImplementationOnce((file, onProgress) => {
      onProgress?.(100);
      return Promise.resolve({ ok: true, jobId: "retry-ok" });
    });
    fireEvent.click(retryBtn);

    await waitFor(() =>
      expect(screen.getByText(/File uploaded successfully\./i)).toBeInTheDocument()
    );
  });
});
