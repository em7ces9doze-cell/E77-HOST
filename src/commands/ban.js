"use strict";

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { canModerate } = require("../utils/permissions");
const { embed, COLORS } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("ban").setDescription("حظر عضو من السيرفر")
    .addUserOption(o => o.setName("member").setDescription("العضو").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("السبب").setMaxLength(400).setRequired(false)),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: "هذا الأمر يعمل داخل السيرفر فقط.", ephemeral: true });
    const user = interaction.options.getUser("member");
    const reason = interaction.options.getString("reason") || "لم يتم تحديد سبب";
    const target = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!target || !canModerate(interaction, target, PermissionFlagsBits.BanMembers)) return interaction.reply({ content: "لا تملك صلاحية الحظر أو أن ترتيب الرتب لا يسمح بهذا الإجراء.", ephemeral: true });
    await target.ban({ reason: reason + " | بواسطة " + interaction.user.tag });
    await interaction.reply({ embeds: [embed("تم الحظر", "تم حظر " + user.tag + "\nالسبب: " + reason, COLORS.success)] });
  }
};