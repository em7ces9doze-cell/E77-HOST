"use strict";

const { Events } = require("discord.js");
const commands = require("../commands");
const safeReply = require("../utils/safeReply");
const logger = require("../utils/logger");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error("Command failed", { command: interaction.commandName, message: error.message });
      await safeReply(interaction, { content: "حدث خطأ أثناء تنفيذ الأمر. راجع سجل الاستضافة.", ephemeral: true });
    }
  }
};