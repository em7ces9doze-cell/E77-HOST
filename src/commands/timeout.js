"use strict";

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { canModerate } = require("../utils/permissions");
const { embed, COLORS } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("timeout").setDescription("تقييد عضو لمدة محددة")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("member").setDescription("العضو").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("المدة بالدقائق (1 إلى 10080)").setMinValue(1).setMaxValue(10080).setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("السبب").setMaxLength(400)),
  async execute(interaction) {
    const user = interaction.options.getUser("member");
    const minutes = interaction.options.getInteger("minutes");
    const reason = interaction.options.getString("reason") || "لم يتم تحديد سبب";
    const target = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!target || !canModerate(interaction, target)) return interaction.reply({ content: "لا يمكن تنفيذ الإجراء على هذا العضو بسبب الصلاحيات أو ترتيب الرتب.", ephemeral: true });
    await target.timeout(minutes * 60 * 1000, reason);
    await interaction.reply({ embeds: [embed("تم التقييد", "العضو: " + user.tag + "\\nالمدة: " + minutes + " دقيقة\\nالسبب: " + reason, COLORS.success)] });
  }
};