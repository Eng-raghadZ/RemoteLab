const { WebSocketServer } = require('ws');

const agentHub = require('./agentHub');
const clientHub = require('./clientHub');

/**
 * Attaches two independent WebSocket endpoints to the same HTTP server:
 *   /ws/agent  — the on-prem Lab Agent (shared-secret auth)
 *   /ws/client — authenticated frontend students (Firebase ID token auth)
 *
 * IMPLEMENTATION NOTE: this uses the `noServer: true` + manual `upgrade`
 * routing pattern rather than passing `{ server, path }` to each
 * WebSocketServer directly. Two WebSocketServer instances each bound
 * straight to the same http.Server (one per path) reproducibly corrupts
 * the permessage-deflate framing on the first message of the first
 * connection ("Invalid WebSocket frame: RSV1 must be clear") — confirmed
 * with a minimal repro during Phase 2 testing. Routing the upgrade
 * ourselves and calling handleUpgrade() explicitly avoids it entirely,
 * and is the pattern the `ws` docs recommend for multiple endpoints.
 */
function attachWebSocketServers(httpServer) {
  const agentWss = new WebSocketServer({ noServer: true });
  const clientWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    // request.url is relative (e.g. "/ws/agent"), so the WHATWG URL
    // parser needs a base to resolve against — the base itself is
    // discarded, only .pathname is used. This replaces the deprecated
    // legacy url.parse() (flagged by Node's DEP0169).
    const { pathname } = new URL(request.url, 'http://internal');

    if (pathname === '/ws/agent') {
      agentWss.handleUpgrade(request, socket, head, (ws) => {
        agentWss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/client') {
      clientWss.handleUpgrade(request, socket, head, (ws) => {
        clientWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  agentWss.on('connection', (ws) => agentHub.handleConnection(ws));
  clientWss.on('connection', (ws) => clientHub.handleConnection(ws));

  const agentHeartbeat = agentHub.startHeartbeatSweep();
  const clientHeartbeat = clientHub.startHeartbeatSweep();

  // Let the process exit cleanly in tests/dev restarts instead of hanging
  // on these intervals.
  agentHeartbeat.unref?.();
  clientHeartbeat.unref?.();

  console.log('WebSocket endpoints ready: /ws/agent, /ws/client');
}

module.exports = { attachWebSocketServers };
