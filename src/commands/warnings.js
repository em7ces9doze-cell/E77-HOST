"use strict";

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database");
const { hasPermission } = require("../utils/permissions");
const { embed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("warnings").setDescription("عرض إنذارات عضو")
    .addUserOption(o => o.setName("member").setDescription("العضو").setRequired(true)),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: "هذا الأمر يعمل داخل السيرفر فقط.", ephemeral: true });
    if (!hasPermission(interaction, PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: "تحتاج صلاحية إدارة الأعضاء.", ephemeral: true });
    const user = interaction.options.getUser("member");
    const rows = db.getWarnings(interaction.guildId, user.id);
    const description = rows.length
      ? rows.map(row => "**#" + row.id + "** — " + row.reason + " ( <@" + row.moderator_id + "> )").join("\n")
      : "لا توجد إنذارات مسجلة.";
    await interaction.reply({ embeds: [embed("إنذارات " + user.tag, description)], ephemeral: true });
  }
};