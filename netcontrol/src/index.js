"use strict";
require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, Events } = require("discord.js");
const { parseAdminIds, isAdmin } = require("./security/admin");
const { createRouterAdapter } = require("./router/adapter");
const token = process.env.DISCORD_TOKEN;
const prefix = process.env.BOT_PREFIX || "!";
const admins = parseAdminIds(process.env.ADMIN_USER_IDS);
const router = createRouterAdapter();
if (!token) { console.error("[NETCONTROL] DISCORD_TOKEN is missing."); process.exit(1); }
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
function panel(status) {
  const label = status.state === "CONNECTED" ? "Connected" : status.state === "NOT_CONFIGURED" ? "Not configured" : "Unavailable";
  return new EmbedBuilder().setColor(0x26384f).setTitle("NETCONTROL | Network Monitor")
    .setDescription("Home network monitoring foundation")
    .addFields(
      { name: "Router connector", value: label, inline: true },
      { name: "Connected devices", value: "Unavailable - no verified router data", inline: true },
      { name: "Details", value: status.message }
    ).setFooter({ text: "No simulated network data" }).setTimestamp();
}
async function runCommand(message, command) {
  if (command === "help") return message.reply("NETCONTROL commands: !netcontrol, !nc status, !nc devices, !nc help.");
  if (!isAdmin(message.author.id, admins)) return message.reply("You are not authorized to use NETCONTROL network commands.");
  if (command === "panel" || command === "status") return message.reply({ embeds: [panel(await router.getStatus())] });
  if (command === "devices") {
    const result = await router.getDevices();
    return message.reply("Device discovery unavailable. " + result.message + " No fictional device list was generated.");
  }
  return message.reply("Unknown command. Use !nc help.");
}
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;
  const parts = message.content.slice(prefix.length).trim().split(/\s+/);
  const root = (parts.shift() || "").toLowerCase();
  if (root !== "nc" && root !== "netcontrol") return;
  const command = (parts.shift() || (root === "netcontrol" ? "panel" : "help")).toLowerCase();
  try { await runCommand(message, command); }
  catch (error) { console.error("[NETCONTROL] Command failed:", error); await message.reply("Request failed. No router change was confirmed.").catch(() => {}); }
});
client.once(Events.ClientReady, (ready) => console.log("[NETCONTROL] Online as " + ready.user.tag));
client.on(Events.Error, (error) => console.error("[Discord]", error));
process.on("unhandledRejection", (error) => console.error("[Unhandled rejection]", error));
client.login(token);
