'use strict';

const fs = require('node:fs');
const http = require('node:http');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const CLIENT_ID = process.env.CLIENT_ID?.trim();
const GUILD_ID = process.env.GUILD_ID?.trim() || null;
const BRIDGE_SECRET = process.env.EM7_CONTROL_BOT_BRIDGE_SECRET?.trim();
const CONTROL_URL = process.env.EM7_CONTROL_URL?.trim() || 'https://em7control-vxdcumhb.manus.space';
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

  // بدء تشغيل آلية إرسال النبضات المطلوبة للوحة مأنوس
  startBridgePolling();
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: `Pong! Latency: ${Math.round(client.ws.ping)}ms`, flags: MessageFlags.Ephemeral });
  } else if (interaction.commandName === 'help') {
    await interaction.reply({ content: 'E77 Control System Bridge is active.', flags: MessageFlags.Ephemeral });
  }
});

// دالة المطالبة الدورية (Polling / Claim Worker)
function startBridgePolling() {
  if (!CONTROL_URL || !BRIDGE_SECRET) {
    console.warn('[BRIDGE] EM7_CONTROL_URL or BRIDGE_SECRET is not configured.');
    return;
  }

  console.log('[BRIDGE] Starting claim polling worker towards Manus...');

  setInterval(async () => {
    try {
      const targetUrl = `${CONTROL_URL}/api/bridge/operations/claim`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIDGE_SECRET}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({})
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return;
      }

      console.log('[BRIDGE] Claim poll successful. Operation:', data.operation ?? 'null');
    } catch (err) {
      // تجاهل الأخطاء المؤقتة لضمان استقرار البوت
    }
  }, 15000); // طلب كل 15 ثانية لتثبيت حالة الاتصال الأخضر
}

// خادم الويب المحلي للاستجابة
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ success: true, status: 'running', botTag: client.user?.tag || null }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Server listening on port ${PORT}`);
});

client.login(TOKEN).catch(e => {
  console.error('Login failed:', e.message);
  process.exit(1);
});
