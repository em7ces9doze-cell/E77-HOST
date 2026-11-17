"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const config = require("./config");
const logger = require("./utils/logger");
require("./database");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.User, Partials.GuildMember]
});

const eventsPath = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsPath).filter(name => name.endsWith(".js"))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

process.on("unhandledRejection", error => logger.error("Unhandled rejection", { message: error?.message || String(error) }));
process.on("uncaughtException", error => {
  logger.error("Uncaught exception", { message: error.message });
  process.exit(1);
});

client.login(config.token).catch(error => {
  logger.error("Discord login failed", { message: error.message });
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    logger.info("Shutting down");
    client.destroy();
    process.exit(0);
  });
}