import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// uploadService now makes a real network call (see uploadService.js) —
// unit tests mock it rather than hitting a live API, same pattern already
// used in UploadCard.error.test.jsx. uploadService's own contract
// (FormData shape, auth header, response handling) is covered separately
// in uploadService.test.js.
vi.mock("../../services/uploadService", () => ({
  uploadAssembly: vi.fn(),
}));

import { uploadAssembly } from "../../services/uploadService";
import UploadCard from "./UploadCard";

function makeFile(name, type = "text/plain") {
  return new File(["MOV AX, 1\nHLT"], name, { type });
}

// Mirrors the real service's onProgress callback timing closely enough to
// exercise the UI's intermediate "Uploading…" state, without touching the
// network or Firebase.
function mockSuccessfulUpload(jobId = "mock-job-id") {
  uploadAssembly.mockImplementation((file, onProgress) => {
    return new Promise((resolve) => {
      onProgress?.(0);
      setTimeout(() => {
        onProgress?.(50);
        setTimeout(() => {
          onProgress?.(100);
          resolve({ ok: true, jobId });
        }, 20);
      }, 20);
    });
  });
}

describe("UploadCard end-to-end flow", () => {
  beforeEach(() => {
    uploadAssembly.mockReset();
    mockSuccessfulUpload();
  });

  it("rejects a non-.asm file with a visible error and no crash", async () => {
    render(<UploadCard onContinue={() => {}} />);
    const input = document.querySelector(".up-hidden-input");
    fireEvent.change(input, { target: { files: [makeFile("notes.txt")] } });

    expect(await screen.findByText(/Only Assembly \(\.asm\) files are allowed\./i)).toBeInTheDocument();
    // Should still be showing the drop zone, not a selected file.
    expect(screen.getByText(/Drag & Drop your Assembly file here/i)).toBeInTheDocument();
  });

  it("accepts a .asm file, shows its details, and enables Upload", async () => {
    render(<UploadCard onContinue={() => {}} />);
    const input = document.querySelector(".up-hidden-input");
    fireEvent.change(input, { target: { files: [makeFile("boot.asm")] } });

    expect(await screen.findByText("File Selected")).toBeInTheDocument();
    expect(screen.getByText("boot.asm")).toBeInTheDocument();

    const uploadBtn = screen.getByRole("button", { name: /upload file/i });
    expect(uploadBtn).not.toBeDisabled();
  });

  it("runs the upload through to the success state", async () => {
    const onContinue = vi.fn();
    render(<UploadCard onContinue={onContinue} />);
    const input = document.querySelector(".up-hidden-input");
    fireEvent.change(input, { target: { files: [makeFile("program.asm")] } });

    const uploadBtn = await screen.findByRole("button", { name: /upload file/i });
    fireEvent.click(uploadBtn);

    // Button should now be in its loading state.
    expect(await screen.findByText(/Uploading…/i)).toBeInTheDocument();

    await waitFor(
      () => expect(screen.getByText(/File uploaded successfully\./i)).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByText("program.asm")).toBeInTheDocument();

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith("mock-job-id");
  });

  it("'Upload Another File' resets back to the drop zone", async () => {
    render(<UploadCard onContinue={() => {}} />);
    const input = document.querySelector(".up-hidden-input");
    fireEvent.change(input, { target: { files: [makeFile("program2.asm")] } });

    fireEvent.click(await screen.findByRole("button", { name: /upload file/i }));
    await waitFor(() => expect(screen.getByText(/File uploaded successfully\./i)).toBeInTheDocument(), {
      timeout: 3000,
    });

    fireEvent.click(screen.getByRole("button", { name: /upload another file/i }));
    expect(await screen.findByText(/Drag & Drop your Assembly file here/i)).toBeInTheDocument();
  });

  it("allows removing a selected file before upload", async () => {
    render(<UploadCard onContinue={() => {}} />);
    const input = document.querySelector(".up-hidden-input");
    fireEvent.change(input, { target: { files: [makeFile("temp.asm")] } });

    expect(await screen.findByText("File Selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    expect(await screen.findByText(/Drag & Drop your Assembly file here/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload file/i })).toBeDisabled();
  });
});
