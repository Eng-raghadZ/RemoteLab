import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RemoteLabLanding from "./pages/RemoteLabLanding";
import Dashboard from "./pages/Dashboard";
import JobStatusPage from "./pages/JobStatusPage";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* RealtimeProvider must be inside AuthProvider — it calls
            useAuth() to know when to open/close the /ws/client socket. */}
        <RealtimeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RemoteLabLanding />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/jobs/:jobId"
                element={
                  <ProtectedRoute>
                    <JobStatusPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
