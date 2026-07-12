import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "student1@ptuk.edu.ps", displayName: null },
    profile: { fullName: "Layla Odeh", studentId: "202012345" },
    initializing: false,
  }),
}));

import UploadPage from "./UploadPage";

describe("UploadPage welcome statement", () => {
  it("greets the signed-in user by their Firestore profile name", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <UploadPage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Welcome back,/i)).toBeInTheDocument();
    expect(screen.getByText("Layla Odeh")).toBeInTheDocument();
  });

  it("still renders the upload card title", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <UploadPage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Upload Assembly Program")).toBeInTheDocument();
  });
});
