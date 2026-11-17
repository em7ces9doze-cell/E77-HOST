'use strict';

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
  MessageFlags
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const CLIENT_ID = process.env.CLIENT_ID?.trim();
const GUILD_ID = process.env.GUILD_ID?.trim() || null;
const BRIDGE_SECRET = process.env.EM7_CONTROL_BOT_BRIDGE_SECRET?.trim();
const PORT = Number.parseInt(process.env.PORT || '8080', 10);

// رابط لوحة تحكم Manus المستهدفة
const MANUS_PANEL_URL = 'https://em7control-vxdcumhb.manus.space';

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

  // بدء تشغيل حلقة العامل (Polling Worker) فور جاهزية البوت
  startBridgeWorker();
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: `Pong! Latency: ${Math.round(client.ws.ping)}ms`, flags: MessageFlags.Ephemeral });
  } else if (interaction.commandName === 'help') {
    await interaction.reply({ content: 'E77 Control System Bridge is active and operational.', flags: MessageFlags.Ephemeral });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// نظام العامل النشط (Polling Worker) لمخاطبة لوحة Manus وتغيير حالة الجسر
// ─────────────────────────────────────────────────────────────────────────────
function startBridgeWorker() {
  if (!BRIDGE_SECRET) {
    console.warn('[BRIDGE] Warning: EM7_CONTROL_BOT_BRIDGE_SECRET is not configured.');
    return;
  }

  console.log('[BRIDGE] Starting active polling worker towards Manus panel...');

  const pollInterval = setInterval(() => {
    const targetUrl = `${MANUS_PANEL_URL}/api/bridge/operations/claim`;
    const payload = JSON.stringify({
      botTag: client.user?.tag || 'EM7 HOST',
      guildsCount: client.guilds.cache.size,
      status: 'online',
      timestamp: Date.now()
    });

    const urlObj = new URL(targetUrl);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BRIDGE_SECRET}`,
        'X-Bridge-Secret': BRIDGE_SECRET,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 6000
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[BRIDGE] Poll successful. Manus panel acknowledged heartbeat.');
        } else {
          // يمكن تتبع حالة الرد عند الحاجة
        }
      });
    });

    req.on('error', () => {
      // تجاهل الأخطاء العابرة للشبكة لضمان استمرار عمل البوت بسلاسة
    });

    req.write(payload);
    req.end();
  }, 8000); // إرسال نبضات اتصال كل 8 ثوانٍ لتثبيت الحالة المتصلة

  return pollInterval;
}

// خادم HTTP محلي للاستجابة السريعة لأي فحص خارجي
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    success: true,
    status: 'connected',
    botReady: client.isReady(),
    botTag: client.user?.tag || 'EM7 HOST',
    guildsCount: client.guilds.cache.size,
    message: 'EM7 SYSTEM Bridge active worker running'
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Worker server listening on port ${PORT}`);
});

client.login(TOKEN).catch(e => {
  console.error('Login failed:', e.message);
  process.exit(1);
});
