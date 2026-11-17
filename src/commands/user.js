"use strict";

const { SlashCommandBuilder } = require("discord.js");
const { embed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("عرض معلومات عضو")
    .addUserOption(option => option.setName("member").setDescription("العضو").setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser("member") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    await interaction.reply({ embeds: [embed("معلومات العضو", [
      "**الاسم:** " + user.tag,
      "**المعرف:** " + user.id,
      "**انضم للسيرفر:** " + (member?.joinedAt?.toLocaleDateString("ar-SA") || "غير متاح"),
      "**أنشأ الحساب:** " + user.createdAt.toLocaleDateString("ar-SA")
    ].join("\\n")).setThumbnail(user.displayAvatarURL())] });
  }
};