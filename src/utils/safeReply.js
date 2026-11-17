"use strict";

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) return await interaction.followUp(payload);
    return await interaction.reply(payload);
  } catch (error) {
    console.error("Unable to respond to interaction:", error);
    return null;
  }
}

module.exports = safeReply;