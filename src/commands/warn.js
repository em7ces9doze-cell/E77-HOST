"use strict";

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database");
const { embed, COLORS } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("warn").setDescription("تسجيل إنذار على عضو")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("member").setDescription("العضو").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("السبب").setMaxLength(400).setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser("member");
    const reason = interaction.options.getString("reason");
    const id = db.addWarning(interaction.guildId, user.id, interaction.user.id, reason);
    await interaction.reply({ embeds: [embed("تم تسجيل الإنذار", "رقم الإنذار: #" + id + "\\nالعضو: " + user.tag + "\\nالسبب: " + reason, COLORS.success)] });
  }
};