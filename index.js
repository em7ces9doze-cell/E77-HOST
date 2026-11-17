'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const CLIENT_ID = process.env.CLIENT_ID?.trim();
const GUILD_ID = process.env.GUILD_ID?.trim() || null;
const BRIDGE_SECRET = process.env.EM7_CONTROL_BOT_BRIDGE_SECRET?.trim();
const PORT = Number.parseInt(process.env.PORT || '8080', 10);

if (!TOKEN || !CLIENT_ID) {
  console.error('[CONFIG] Missing DISCORD_TOKEN or CLIENT_ID.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.User, Partials.GuildMember]
});

const rest = new REST({ version: '10' }).setToken(TOKEN);

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('سرعة استجابة البوت'),
  new SlashCommandBuilder().setName('help').setDescription('قائمة الأوامر')
];

client.once(Events.ClientReady, async () => {
  console.log(`[READY] Connected as ${client.user.tag}`);
  try {
    const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: commands.map(c => c.toJSON()) });
  } catch (e) {
    console.error('Command registration failed:', e.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: `Pong! Latency: ${Math.round(client.ws.ping)}ms`, flags: MessageFlags.Ephemeral });
  } else if (interaction.commandName === 'help') {
    await interaction.reply({ content: 'E77 Control System Bridge is active.', flags: MessageFlags.Ephemeral });
  }
});

// خادم الويب المتوافق تماماً مع بروتوكول جسر Manus
const server = http.createServer((req, res) => {
  const reqSecret = req.headers['x-bridge-secret'] || req.headers['authorization']?.replace('Bearer ', '') || '';

  // السماح بطلبات التحقق والصحة
  if (req.url === '/' || req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'running', botReady: client.isReady(), botTag: client.user?.tag || null }));
    return;
  }

  // مسارات الجسر المطلوبة من لوحة Manus
  if (req.url.startsWith('/api/bridge') || req.url.startsWith('/bridge')) {
    if (BRIDGE_SECRET && reqSecret !== BRIDGE_SECRET) {
      res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Forbidden: Invalid bridge secret' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      status: 'connected',
      botTag: client.user?.tag || 'EM7 HOST',
      guildsCount: client.guilds.cache.size,
      message: 'EM7 SYSTEM Bridge connected successfully'
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Bridge server listening on port ${PORT}`);
});

client.login(TOKEN).catch(e => {
  console.error('Login failed:', e.message);
  process.exit(1);
});
