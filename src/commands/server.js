"use strict";

const { SlashCommandBuilder } = require("discord.js");
const { embed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("server").setDescription("عرض معلومات السيرفر"),
  async execute(interaction) {
    const guild = interaction.guild;
    await interaction.reply({ embeds: [embed("معلومات السيرفر", [
      "**الاسم:** " + guild.name,
      "**المعرف:** " + guild.id,
      "**الأعضاء:** " + guild.memberCount,
      "**تاريخ الإنشاء:** " + guild.createdAt.toLocaleDateString("ar-SA")
    ].join("\\n"))] });
  }
};