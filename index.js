const http = require('http');
const { Client, GatewayIntentBits } = require('discord.js');

const PORT = Number(process.env.PORT || 8080);
const CONTROL_URL = (process.env.EM7_CONTROL_URL || 'https://em7control-vxdcumhb.manus.space').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.EM7_CONTROL_BOT_BRIDGE_SECRET || '';
const BRIDGE_PATH = '/api/bridge/operations/claim';
const POLL_INTERVAL_MS = 15000;
const REQUEST_TIMEOUT_MS = 12000;

// Keep Authorization + Bearer as the current default.
// If Manus specifies another header, configure these two variables in FadeHost.
const BRIDGE_HEADER_NAME = process.env.EM7_CONTROL_BOT_BRIDGE_HEADER || 'Authorization';
const BRIDGE_AUTH_SCHEME = process.env.EM7_CONTROL_BOT_BRIDGE_SCHEME ?? 'Bearer';

const TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let bridgeStarted = false;

function buildBridgeHeaders() {
  const authValue = BRIDGE_AUTH_SCHEME
    ? `${BRIDGE_AUTH_SCHEME} ${BRIDGE_SECRET}`
    : BRIDGE_SECRET;

  return {
    [BRIDGE_HEADER_NAME]: authValue,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

async function claimBridgeOperations() {
  const targetUrl = `${CONTROL_URL}${BRIDGE_PATH}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: buildBridgeHeaders(),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    const contentType = response.headers.get('content-type') || 'unknown';
    console.log(`[BRIDGE] Claim response: HTTP ${response.status}; content-type=${contentType}`);

    if (response.status === 401 || response.status === 403) {
      console.error('[BRIDGE] Authentication rejected. Verify the exact header name, auth scheme, and matching secret in Manus and FadeHost. Secret value is intentionally not logged.');
      return;
    }

    if (!response.ok) {
      console.error(`[BRIDGE] Claim request failed with HTTP ${response.status}.`);
      return;
    }

    let data;
    const responseText = await response.text();
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error('[BRIDGE] Manus returned a successful HTTP status but the response was not valid JSON.');
      return;
    }

    console.log('[BRIDGE] Claim request accepted by server.');
    // Operation execution is intentionally not implemented until the Manus
    // operation payload schema and acknowledgement endpoint are confirmed.
    if (data && (data.operation || data.operations)) {
      console.log('[BRIDGE] Operation payload received; execution handler is not configured yet.');
    }
  } catch (error) {
    const message = error && error.name === 'TimeoutError'
      ? 'request timed out'
      : (error && error.message ? error.message : 'unknown network error');
    console.error(`[BRIDGE] Poll failed: ${message}`);
  }
}

function startBridgePolling() {
  if (bridgeStarted) return;
  bridgeStarted = true;

  if (!BRIDGE_SECRET) {
    console.error('[BRIDGE] Missing EM7_CONTROL_BOT_BRIDGE_SECRET. Polling disabled.');
    return;
  }

  if (!/^https:\/\//i.test(CONTROL_URL)) {
    console.error('[BRIDGE] EM7_CONTROL_URL must be an HTTPS URL.');
    return;
  }

  if (BRIDGE_SECRET !== BRIDGE_SECRET.trim()) {
    console.warn('[BRIDGE] Secret contains leading or trailing whitespace. Check the FadeHost secret value.');
  }

  console.log(`[BRIDGE] Worker started. Endpoint: ${CONTROL_URL}${BRIDGE_PATH}`);
  console.log(`[BRIDGE] Auth header configured: ${BRIDGE_HEADER_NAME}; scheme: ${BRIDGE_AUTH_SCHEME || '(none)'}; secret length: ${BRIDGE_SECRET.length}. Secret value hidden.`);

  const poll = async () => {
    await claimBridgeOperations();
    setTimeout(poll, POLL_INTERVAL_MS);
  };

  poll();
}

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      status: 'online',
      bot: client.user ? client.user.tag : 'starting',
      bridgeConfigured: Boolean(BRIDGE_SECRET)
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Health server listening on port ${PORT}`);
});

client.once('ready', () => {
  console.log(`[READY] Connected as ${client.user.tag}`);
  startBridgePolling();
});

if (!TOKEN) {
  console.error('[DISCORD] Missing DISCORD_TOKEN (or BOT_TOKEN) environment variable.');
} else {
  client.login(TOKEN).catch(error => {
    console.error('[DISCORD] Login failed:', error.message);
    process.exit(1);
  });
}
