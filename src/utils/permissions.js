"use strict";

const config = require("../config");

function isOwner(userId) {
  return Boolean(config.ownerId && userId === config.ownerId);
}

function hasPermission(interaction, permission) {
  return Boolean(interaction.memberPermissions?.has(permission) || isOwner(interaction.user.id));
}

function canModerate(interaction, targetMember, permission) {
  if (!interaction.inGuild() || !targetMember) return false;
  if (isOwner(interaction.user.id)) return true;
  if (!permission || !interaction.memberPermissions?.has(permission)) return false;
  if (targetMember.id === interaction.guild.ownerId) return false;
  if (targetMember.id === interaction.user.id) return false;
  const botMember = interaction.guild.members.me;
  if (botMember && targetMember.roles.highest.position >= botMember.roles.highest.position) return false;
  const actor = interaction.member;
  if (actor?.roles?.highest && targetMember.roles.highest.position >= actor.roles.highest.position) return false;
  return true;
}

module.exports = { isOwner, hasPermission, canModerate };