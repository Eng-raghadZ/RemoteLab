require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const jobsRouter = require('./routes/jobs.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { attachWebSocketServers } = require('./websocket/wsServer');

const app = express();

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin.includes(',') ? allowedOrigin.split(',') : allowedOrigin }));
app.use(morgan('dev'));
app.use(express.json());

// Simple liveness check — also useful later for the frontend's rig-status
// indicator to confirm the API server itself (not just the rig) is up.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'remote-lab-api', timestamp: new Date().toISOString() });
});

app.use('/api/jobs', jobsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket upgrade handling needs a raw http.Server rather than
// app.listen()'s implicit one, since two WebSocketServer instances
// (/ws/agent and /ws/client) attach to it below.
const httpServer = http.createServer(app);
attachWebSocketServers(httpServer);

// Last line of defense: every async path in the WebSocket layer already
// wraps its own Firestore/Storage calls in try/catch (see agentHub.js /
// clientHub.js), but this ensures a genuinely unexpected error anywhere
// else logs loudly instead of silently killing the process.
process.on('unhandledRejection', (reason) => {
  console.error('[remote-lab-api] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[remote-lab-api] Uncaught exception:', err);
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Remote Lab API server listening on port ${PORT}`);
});

module.exports = app;