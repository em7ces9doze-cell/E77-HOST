"use strict";
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const { parseAdminIds, isAdmin } = require("./security/admin");
const { createRouterAdapter } = require("./router/adapter");

const token = process.env.DISCORD_TOKEN;
const admins = parseAdminIds(process.env.ADMIN_USER_IDS);
const router = createRouterAdapter();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

if (!token) {
  console.error("[NETCONTROL] DISCORD_TOKEN is missing.");
  process.exit(1);
}

const commandData = [
  new SlashCommandBuilder()
    .setName("netcontrol")
    .setDescription("NETCONTROL home network monitor")
    .addSubcommand((sub) => sub.setName("status").setDescription("Show bot and router connector status"))
    .addSubcommand((sub) => sub.setName("devices").setDescription("Check whether device discovery is available"))
    .addSubcommand((sub) => sub.setName("diagnostics").setDescription("Show bot service diagnostics"))
    .addSubcommand((sub) => sub.setName("help").setDescription("Show NETCONTROL command help"))
    .toJSON()
];

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [days ? days + "d" : null, hours ? hours + "h" : null, minutes ? minutes + "m" : null, remaining + "s"]
    .filter(Boolean).join(" ");
}

function statusEmbed(status) {
  const label = status.state === "CONNECTED"
    ? "Connected"
    : status.state === "NOT_CONFIGURED"
      ? "Not configured"
      : "Unavailable";
  return new EmbedBuilder()
    .setColor(0x26384f)
    .setTitle("NETCONTROL | Network Monitor")
    .setDescription("Home network monitoring")
    .addFields(
      { name: "Bot", value: client.isReady() ? "Online" : "Starting", inline: true },
      { name: "Router connector", value: label, inline: true },
      { name: "Connected devices", value: "Unavailable — no verified router data", inline: false },
      { name: "Bot uptime", value: formatDuration(process.uptime()), inline: true },
      { name: "Discord latency", value: client.ws.ping >= 0 ? client.ws.ping + " ms" : "Unavailable", inline: true },
      { name: "Details", value: String(status.message || "No additional details").slice(0, 1000) }
    )
    .setFooter({ text: "Authorized monitoring • No simulated network data" })
    .setTimestamp();
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  const clientId = client.application.id;
  const guildId = process.env.DISCORD_GUILD_ID;
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);
  await rest.put(route, { body: commandData });
  console.log(guildId
    ? "[NETCONTROL] Slash commands registered for guild " + guildId
    : "[NETCONTROL] Global slash commands registered (propagation may take time).");
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "netcontrol") return;

  const action = interaction.options.getSubcommand();
  if (action === "help") {
    return interaction.reply({
      ephemeral: true,
      content: [
        "**NETCONTROL commands**",
        "`/netcontrol status` — bot and router connector status.",
        "`/netcontrol devices` — check device-discovery availability.",
        "`/netcontrol diagnostics` — bot uptime and Discord latency.",
        "`/netcontrol help` — show this help.",
        "",
        "Router integration is not configured yet. No router settings are changed by these commands."
      ].join("\n")
    });
  }

  if (!isAdmin(interaction.user.id, admins)) {
    return interaction.reply({
      ephemeral: true,
      content: "غير مصرح لك باستخدام أوامر مراقبة الشبكة. اطلب من مسؤول البوت إضافتك إلى قائمة المسؤولين."
    });
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    if (action === "status") {
      const status = await router.getStatus();
      return interaction.editReply({ embeds: [statusEmbed(status)] });
    }
    if (action === "diagnostics") {
      const embed = new EmbedBuilder()
        .setColor(0x26384f)
        .setTitle("NETCONTROL | Service Diagnostics")
        .addFields(
          { name: "Service", value: client.isReady() ? "Online" : "Starting", inline: true },
          { name: "Uptime", value: formatDuration(process.uptime()), inline: true },
          { name: "Discord gateway", value: client.ws.ping >= 0 ? client.ws.ping + " ms" : "Unavailable", inline: true },
          { name: "Guilds", value: String(client.guilds.cache.size), inline: true },
          { name: "Runtime", value: process.version, inline: true },
          { name: "Router integration", value: "Not configured", inline: true }
        )
        .setFooter({ text: "Diagnostics do not test or modify the router" })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }
    if (action === "devices") {
      const result = await router.getDevices();
      return interaction.editReply({
        content: result.state === "CONNECTED"
          ? "اكتمل طلب اكتشاف الأجهزة."
          : "اكتشاف الأجهزة غير متاح حاليًا. " + result.message + " لم يتم إنشاء قائمة أجهزة وهمية."
      });
    }
    return interaction.editReply("أمر غير معروف. استخدم /netcontrol help.");
  } catch (error) {
    console.error("[NETCONTROL] Interaction failed:", error);
    return interaction.editReply("تعذر تنفيذ الطلب. لم يتم تأكيد أي تغيير على إعدادات الراوتر.");
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log("[NETCONTROL] Online as " + readyClient.user.tag);
  try {
    await registerCommands();
  } catch (error) {
    console.error("[NETCONTROL] Slash command registration failed:", error);
  }
});

client.on(Events.InteractionCreate, (interaction) => {
  handleInteraction(interaction).catch((error) => {
    console.error("[NETCONTROL] Unhandled interaction error:", error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      interaction.reply({ ephemeral: true, content: "حدث خطأ أثناء تنفيذ الأمر." }).catch(() => {});
    }
  });
});

client.on(Events.Error, (error) => console.error("[Discord]", error));
process.on("unhandledRejection", (error) => console.error("[Unhandled rejection]", error));

client.login(token);
