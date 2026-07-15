// src/realtime/realtimeClient.js
//
// Framework-agnostic WebSocket client for the backend's /ws/client
// endpoint (see backend/src/websocket/clientHub.js and
// remote-lab-full-workflow.md §7). Handles the client_auth handshake with
// a Firebase ID token, reconnect-with-backoff, and a simple
// subscribe(type, callback) pub/sub API so any component can listen for
// job_status_changed / queue_update / camera_frame messages without each
// one needing its own socket.
//
// This module does not import React — RealtimeContext.jsx is the
// React-facing wrapper around it.

const MAX_RECONNECT_DELAY_MS = 15000;
const BASE_RECONNECT_DELAY_MS = 1000;

function deriveWsUrl(apiBaseUrl) {
  if (!apiBaseUrl) return null;
  try {
    const url = new URL(apiBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/client";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * @param {Object} options
 * @param {string} options.apiBaseUrl - e.g. import.meta.env.VITE_API_BASE_URL
 * @param {() => Promise<string|null>} options.getIdToken - resolves the
 *   current Firebase ID token, or null if no one is signed in.
 */
export function createRealtimeClient({ apiBaseUrl, getIdToken }) {
  const wsUrl = deriveWsUrl(apiBaseUrl);

  let ws = null;
  let reconnectAttempt = 0;
  let reconnectTimer = null;
  let closedByUser = true; // nothing connects until start() is called
  let authInFlight = false;

  const listeners = new Map(); // messageType -> Set<callback>
  const stateListeners = new Set(); // callback(connectionState)

  // idle | connecting | authenticating | open | reconnecting | closed
  let connectionState = "idle";

  function setState(next) {
    connectionState = next;
    stateListeners.forEach((cb) => {
      try {
        cb(connectionState);
      } catch (err) {
        console.error("[realtimeClient] state listener error:", err);
      }
    });
  }

  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[realtimeClient] listener error for "${type}":`, err);
      }
    });
  }

  function scheduleReconnect() {
    if (closedByUser) return;
    setState("reconnecting");
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempt);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  }

  async function connect() {
    if (closedByUser) return;
    if (!wsUrl) {
      console.warn("[realtimeClient] No usable API base URL — skipping connect.");
      return;
    }
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setState("connecting");

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("[realtimeClient] Failed to open WebSocket:", err);
      scheduleReconnect();
      return;
    }

    ws.onopen = async () => {
      if (authInFlight) return;
      authInFlight = true;
      setState("authenticating");
      try {
        const idToken = await getIdToken();
        if (!idToken) {
          ws.close();
          return;
        }
        ws.send(JSON.stringify({ type: "client_auth", idToken }));
      } catch (err) {
        console.error("[realtimeClient] Failed to fetch ID token:", err);
        ws.close();
      } finally {
        authInFlight = false;
      }
    };

    ws.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === "auth_ack") {
        reconnectAttempt = 0;
        setState("open");
        return;
      }
      if (message.type === "auth_rejected") {
        console.warn("[realtimeClient] Auth rejected:", message.reason);
        ws.close();
        return;
      }

      emit(message.type, message);
    };

    ws.onclose = () => {
      ws = null;
      if (!closedByUser) scheduleReconnect();
    };

    ws.onerror = (err) => {
      // onclose fires right after this and drives reconnect — just log here.
      console.error("[realtimeClient] WebSocket error:", err);
    };
  }

  function start() {
    closedByUser = false;
    reconnectAttempt = 0;
    connect();
  }

  function disconnect() {
    closedByUser = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    setState("closed");
  }

  function subscribe(type, callback) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(callback);
    return () => {
      listeners.get(type)?.delete(callback);
    };
  }

  function onStateChange(callback) {
    stateListeners.add(callback);
    callback(connectionState);
    return () => stateListeners.delete(callback);
  }

  function getState() {
    return connectionState;
  }

  return { start, disconnect, subscribe, onStateChange, getState };
}
