"use strict";

const { SlashCommandBuilder } = require("discord.js");
const { embed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("قياس سرعة استجابة البوت"),
  async execute(interaction) {
    const latency = Math.round(interaction.client.ws.ping);
    await interaction.reply({ embeds: [embed("E77 • Pong", "زمن اتصال Discord: **" + latency + "ms**")] });
  }
};