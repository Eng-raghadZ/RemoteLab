// src/context/RealtimeContext.jsx
//
// Wraps the app and manages the single /ws/client realtime connection
// described in remote-lab-full-workflow.md §7. Connects the moment a
// student is signed in, fully disconnects on logout, and exposes
// subscribe(type, callback) to any component via useRealtime().
//
// §8's "very next step" (replacing JobStatusPage's polling loop with
// this) is implemented in JobStatusPage.jsx, which subscribes here for
// an instant push and keeps polling only as a fallback if the socket is
// ever down.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { auth } from "../firebase/firebase";
import { createRealtimeClient } from "../realtime/realtimeClient";

const RealtimeContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const clientRef = useRef(null);
  const [connectionState, setConnectionState] = useState("idle");

  if (!clientRef.current) {
    clientRef.current = createRealtimeClient({
      apiBaseUrl: API_BASE_URL,
      getIdToken: () => {
        const currentUser = auth.currentUser;
        return currentUser ? currentUser.getIdToken() : Promise.resolve(null);
      },
    });
  }

  // Connect only once a student is signed in; fully tear down on logout so
  // no authenticated socket lingers for a signed-out browser tab.
  useEffect(() => {
    const client = clientRef.current;
    const unsubscribeState = client.onStateChange(setConnectionState);

    if (user) {
      client.start();
    } else {
      client.disconnect();
    }

    return () => {
      unsubscribeState();
    };
  }, [user]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const value = useMemo(
    () => ({
      connectionState,
      subscribe: (type, callback) => clientRef.current.subscribe(type, callback),
    }),
    [connectionState]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within a <RealtimeProvider>");
  }
  return ctx;
}
