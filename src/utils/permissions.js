"use strict";

const { PermissionFlagsBits } = require("discord.js");
const config = require("../config");

function isOwner(userId) {
  return Boolean(config.ownerId && userId === config.ownerId);
}

function hasPermission(interaction, permission) {
  return interaction.memberPermissions?.has(permission) || isOwner(interaction.user.id);
}

function canModerate(interaction, targetMember) {
  if (!interaction.inGuild() || !targetMember) return false;
  if (isOwner(interaction.user.id)) return true;
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return false;
  if (targetMember.id === interaction.guild.ownerId) return false;
  if (targetMember.id === interaction.user.id) return false;
  const moderator = interaction.guild.members.me;
  if (moderator && targetMember.roles.highest.position >= moderator.roles.highest.position) return false;
  const actor = interaction.member;
  if (actor?.roles?.highest && targetMember.roles.highest.position >= actor.roles.highest.position) return false;
  return true;
}

module.exports = { isOwner, hasPermission, canModerate };