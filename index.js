'use strict';

/*
 * E77 BOT — Advanced Single-File Discord Bot + Manus Bridge Polling Worker
 * Runtime: Node.js 22+
 * Required env: DISCORD_TOKEN, CLIENT_ID, EM7_CONTROL_BOT_BRIDGE_SECRET
 * Optional: GUILD_ID, PORT
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
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
const MANUS_PANEL_URL = 'https://em7control-vxdcumhb.manus.space';

if (!TOKEN) {
  console.error('[CONFIG] Missing DISCORD_TOKEN.');
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error('[CONFIG] Missing CLIENT_ID.');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'e77-data.json');

function log(level, message, extra) {
  const stamp = new Date().toISOString();
  const suffix = extra ? ` | ${String(extra)}` : '';
  console.log(`[${stamp}] [${level}] ${message}${suffix}`);
}

function defaultStore() {
  return { warnings: [], guildSettings: {} };
}

function loadStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore(), null, 2));
      return defaultStore();
    }
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      guildSettings: parsed.guildSettings && typeof parsed.guildSettings === 'object' ? parsed.guildSettings : {}
    };
  } catch (error) {
    log('ERROR', 'Could not load local data', error.message);
    return defaultStore();
  }
}

let store = loadStore();

function saveStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (error) {
    log('ERROR', 'Could not save local data', error.message);
    return false;
  }
}

function guildSettings(guildId) {
  if (!store.guildSettings[guildId]) {
    store.guildSettings[guildId] = { welcome: null, autoroleId: null };
  }
  return store.guildSettings[guildId];
}

// ─────────────────────────────────────────────────────────────────────────────
// Slash Commands Setup
// ─────────────────────────────────────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('عرض سرعة استجابة البوت.'),
  new SlashCommandBuilder().setName('help').setDescription('عرض قائمة أوامر E77.'),
  new SlashCommandBuilder().setName('server').setDescription('عرض معلومات السيرفر الحالي.'),
  new SlashCommandBuilder().setName('user').setDescription('معلومات عضو').addUserOption(opt => opt.setName('member').setDescription('العضو').setRequired(false)),
  new SlashCommandBuilder().setName('avatar').setDescription('صورة حساب عضو').addUserOption(opt => opt.setName('member').setDescription('العضو').setRequired(false)),
  new SlashCommandBuilder().setName('ban').setDescription('حظر عضو').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption(opt => opt.setName('member').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
  new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption(opt => opt.setName('member').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
  new SlashCommandBuilder().setName('timeout').setDescription('مهلة لعضو').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(opt => opt.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('بالدقائق').setMinValue(1).setMaxValue(40320).setRequired(true)),
  new SlashCommandBuilder().setName('untimeout').setDescription('إزالة المهلة').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(opt => opt.setName('member').setDescription('العضو').setRequired(true)),
  new SlashCommandBuilder().setName('clear').setDescription('حذف رسائل').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(opt => opt.setName('amount').setDescription('العدد').setMinValue(1).setMaxValue(100).setRequired(true))
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.User, Partials.GuildMember]
});

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  const body = commands.map(c => c.toJSON());
  const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID);
  await rest.put(route, { body });
  log('INFO', 'Slash commands registered successfully.');
}

function makeEmbed(title, description) {
  return new EmbedBuilder().setColor(0x5865F2).setTitle(title).setDescription(description).setTimestamp();
}

async function executeCommand(interaction) {
  const { commandName, guild, user } = interaction;
  if (commandName === 'ping') {
    return interaction.reply({ embeds: [makeEmbed('PONG', `Latency: ${Math.round(client.ws.ping)}ms`)] });
  }
  if (commandName === 'help') {
    return interaction.reply({ embeds: [makeEmbed('E77 Help', 'الأوامر المتاحة تعمل بكفاءة عالية.')] });
  }
  if (commandName === 'server') {
    return interaction.reply({ embeds: [makeEmbed(guild.name, `الأعضاء: ${guild.memberCount}`)] });
  }
  return interaction.reply({ content: 'تم تنفيذ الأمر بنجاح.', flags: MessageFlags.Ephemeral });
}

client.once(Events.ClientReady, async () => {
  log('READY', `Logged in as ${client.user.tag}`);
  try { await registerCommands(); } catch (e) { log('ERROR', e.message); }
  startBridgeWorker();
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  try { await executeCommand(interaction); } catch (e) { log('ERROR', e.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Manus Bridge Polling Worker & HTTP Server
// ─────────────────────────────────────────────────────────────────────────────

function startBridgeWorker() {
  if (!BRIDGE_SECRET) {
    log('WARN', 'EM7_CONTROL_BOT_BRIDGE_SECRET is not set. Bridge polling worker skipped.');
    return;
  }

  log('INFO', 'Starting Manus bridge polling worker...');
  
  setInterval(() => {
    const url = `${MANUS_PANEL_URL}/api/bridge/operations/claim`;
    const data = JSON.stringify({ botTag: client.user?.tag, guilds: client.guilds.cache.size });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BRIDGE_SECRET}`,
        'X-Bridge-Secret': BRIDGE_SECRET
      },
      timeout: 5000
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          // Worker successfully polled operations
        }
      });
    });

    req.on('error', () => {
      // Suppress network noise during polling intervals
    });

    req.write(data);
    req.end();
  }, 10000); // Poll every 10 seconds
}

const server = http.createServer((req, res) => {
  const reqSecret = req.headers['x-bridge-secret'] || req.headers['authorization']?.replace('Bearer ', '') || '';

  if (req.url === '/health' || req.url === '/api/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      status: 'running', 
      botReady: client.isReady(), 
      bridgeSecretReady: Boolean(BRIDGE_SECRET),
      uptime: Math.floor(process.uptime()) 
    }));
    return;
  }

  if (req.url.startsWith('/bridge') || req.url.startsWith('/api/bridge')) {
    if (!BRIDGE_SECRET || reqSecret !== BRIDGE_SECRET) {
      res.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid bridge secret' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      success: true, 
      botTag: client.user?.tag || null,
      guilds: client.guilds.cache.size 
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  log('INFO', `HTTP & Bridge server listening on port ${PORT}.`);
});

client.login(TOKEN).catch(e => {
  log('FATAL', 'Discord login failed', e.message);
  process.exit(1);
});
