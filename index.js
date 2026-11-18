'use strict';

const http = require('node:http');
const path = require('node:path');
const { Client, GatewayIntentBits } = require('discord.js');
const { BridgeExecutionEngine, validBridgeSecret } = require('./bridge-engine');
const { handleInteraction, registerCommands } = require('./commands');

const PORT = Number(process.env.PORT || 8080);
const CONTROL_URL = (process.env.EM7_CONTROL_URL || 'https://em7control-vxdeumhb.manus.space').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.EM7_CONTROL_BOT_BRIDGE_SECRET || '';
const BRIDGE_HEADER_NAME = process.env.EM7_CONTROL_BOT_BRIDGE_HEADER || 'Authorization';
const BRIDGE_AUTH_SCHEME = process.env.EM7_CONTROL_BOT_BRIDGE_SCHEME ?? 'Bearer';
const POLL_INTERVAL_MS = process.env.EM7_BRIDGE_POLL_INTERVAL_MS;
const STATE_FILE = process.env.EM7_BRIDGE_STATE_FILE
  || path.join(process.cwd(), '.em7-bridge', 'state.json');
const TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({
      success: true,
      status: 'online',
      bot: client.user ? client.user.tag : 'starting',
      bridgeConfigured: validBridgeSecret(BRIDGE_SECRET),
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Health server listening on port ${PORT}`);
});

let bridgeWorker;
function startBridgeWorker() {
  try {
    bridgeWorker = new BridgeExecutionEngine({
      client,
      controlUrl: CONTROL_URL,
      secret: BRIDGE_SECRET,
      headerName: BRIDGE_HEADER_NAME,
      authScheme: BRIDGE_AUTH_SCHEME,
      stateFile: STATE_FILE,
      pollIntervalMs: POLL_INTERVAL_MS,
    });
    bridgeWorker.start().catch(error => {
      const code = typeof error?.code === 'string' && /^[a-z0-9_-]{1,48}$/i.test(error.code)
        ? error.code
        : 'worker_start_failed';
      console.error(`[BRIDGE] Worker did not start; code=${code}. No operation was claimed.`);
    });
  } catch (error) {
    const code = typeof error?.code === 'string' && /^[a-z0-9_-]{1,48}$/i.test(error.code)
      ? error.code
      : 'worker_configuration_invalid';
    console.error(`[BRIDGE] Worker did not start; code=${code}. No operation was claimed.`);
  }
}

client.once('clientReady', () => {
  console.log('[READY] Discord client connected.');
  registerCommands(client).catch(error => {
    const code = typeof error?.code === 'number' || typeof error?.code === 'string'
      ? String(error.code).slice(0, 32)
      : 'command_registration_failed';
    console.error(`[COMMANDS] Registration failed; code=${code}.`);
  });
  startBridgeWorker();
});

client.on('interactionCreate', interaction => {
  void handleInteraction(interaction);
});

client.on('error', error => {
  const code = typeof error?.code === 'number' && Number.isInteger(error.code)
    ? String(error.code)
    : 'discord_client_error';
  console.error(`[DISCORD] Client error; code=${code}.`);
});

if (!TOKEN) {
  console.error('[DISCORD] Missing DISCORD_TOKEN or BOT_TOKEN.');
} else {
  client.login(TOKEN).catch(error => {
    const code = typeof error?.code === 'number' && Number.isInteger(error.code)
      ? String(error.code)
      : 'discord_login_failed';
    console.error(`[DISCORD] Login failed; code=${code}.`);
    process.exitCode = 1;
  });
}

let shutdownStarted = false;
async function shutdown(signal) {
  if (shutdownStarted) return;
  shutdownStarted = true;
  console.log(`[SYSTEM] Shutdown requested (${signal}).`);
  const forcedExit = setTimeout(() => {
    console.error('[SYSTEM] Graceful shutdown timed out.');
    process.exit(1);
  }, 5000);
  if (bridgeWorker) await bridgeWorker.stop().catch(() => {});
  client.destroy();
  server.close(() => {
    clearTimeout(forcedExit);
    process.exit(0);
  });
}

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
