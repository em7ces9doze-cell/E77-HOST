"use strict";

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error("Missing required environment variable: " + name);
  return value.trim();
}

module.exports = {
  token: required("DISCORD_TOKEN"),
  clientId: required("CLIENT_ID"),
  ownerId: process.env.OWNER_ID?.trim() || null,
  guildId: process.env.GUILD_ID?.trim() || null,
  databasePath: process.env.DATABASE_PATH || "./data/e77.sqlite",
  logLevel: process.env.LOG_LEVEL || "info"
};