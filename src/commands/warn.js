"use strict";

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database");
const { hasPermission } = require("../utils/permissions");
const { embed, COLORS } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("warn").setDescription("تسجيل إنذار على عضو")
    .addUserOption(o => o.setName("member").setDescription("العضو").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("السبب").setMaxLength(400).setRequired(true)),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: "هذا الأمر يعمل داخل السيرفر فقط.", ephemeral: true });
    if (!hasPermission(interaction, PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: "تحتاج صلاحية إدارة الأعضاء.", ephemeral: true });
    const user = interaction.options.getUser("member");
    const reason = interaction.options.getString("reason");
    const id = db.addWarning(interaction.guildId, user.id, interaction.user.id, reason);
    await interaction.reply({ embeds: [embed("تم تسجيل الإنذار", "رقم الإنذار: #" + id + "\nالعضو: " + user.tag + "\nالسبب: " + reason, COLORS.success)] });
  }
};