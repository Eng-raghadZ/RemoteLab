require('dotenv').config();

const wsClient = require('./wsClient');

const apiWsUrl = process.env.API_WS_URL;
const sharedSecret = process.env.AGENT_SHARED_SECRET;
const reconnectDelayMs = Number(process.env.RECONNECT_DELAY_MS) || 3000;

if (!apiWsUrl || !sharedSecret) {
  console.error(
    'Missing required environment variables. Check API_WS_URL and ' +
      'AGENT_SHARED_SECRET in your .env file (see .env.example).'
  );
  process.exit(1);
}

console.log('Remote Lab Agent starting...');
wsClient.start({ apiWsUrl, sharedSecret, reconnectDelayMs });
