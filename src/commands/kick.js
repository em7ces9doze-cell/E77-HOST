"use strict";

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { canModerate } = require("../utils/permissions");
const { embed, COLORS } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("kick").setDescription("طرد عضو من السيرفر")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("member").setDescription("العضو").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("السبب").setMaxLength(400).setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser("member");
    const reason = interaction.options.getString("reason") || "لم يتم تحديد سبب";
    const target = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!target || !canModerate(interaction, target)) return interaction.reply({ content: "لا يمكن تنفيذ الإجراء على هذا العضو بسبب الصلاحيات أو ترتيب الرتب.", ephemeral: true });
    await target.kick(reason + " | بواسطة " + interaction.user.tag);
    await interaction.reply({ embeds: [embed("تم الطرد", "تم طرد " + user.tag + "\\nالسبب: " + reason, COLORS.success)] });
  }
};