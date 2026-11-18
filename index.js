'use strict';

const http = require('node:http');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleMessage, handleComponent } = require('./games');

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({
      success: true,
      service: 'E77 GAMES',
      status: client.isReady() ? 'online' : 'starting',
      bot: client.user?.tag || null,
    }));
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[HTTP] E77 GAMES health server listening on ' + PORT);
});

client.once('clientReady', () => {
  console.log('[READY] E77 GAMES connected as ' + client.user.tag);
});

client.on('messageCreate', message => {
  void handleMessage(message).catch(error => {
    console.error('[GAMES] Message handler failed:', error?.code || error?.name || 'UNKNOWN');
  });
});

client.on('interactionCreate', interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
  void handleComponent(interaction).catch(async error => {
    console.error('[GAMES] Component handler failed:', error?.code || error?.name || 'UNKNOWN');
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الحركة. حاول مرة أخرى.', ephemeral: true }).catch(() => {});
    }
  });
});

client.on('error', error => {
  console.error('[DISCORD] Client error:', error?.code || error?.name || 'UNKNOWN');
});

if (!TOKEN) {
  console.error('[DISCORD] Missing DISCORD_TOKEN secret.');
} else {
  client.login(TOKEN).catch(error => {
    console.error('[DISCORD] Login failed:', error?.code || error?.name || 'UNKNOWN');
    process.exitCode = 1;
  });
}

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log('[SYSTEM] Shutdown requested: ' + signal);
  client.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
