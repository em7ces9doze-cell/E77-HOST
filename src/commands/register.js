"use strict";

const { REST, Routes } = require("discord.js");
const config = require("../config");
const commands = require("./index");
const logger = require("../utils/logger");

async function main() {
  const body = [...commands.values()].map(command => command.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(config.token);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);
  await rest.put(route, { body });
  logger.info("Registered " + body.length + " slash commands.");
}

main().catch(error => {
  logger.error("Command registration failed", { message: error.message });
  process.exitCode = 1;
});