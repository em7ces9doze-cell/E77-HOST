'use strict';

const NAME_RE = /^[\p{L}\p{N} _.-]{2,32}$/u;
const USERNAME_RE = /^[a-z0-9_.]{2,32}$/;
const SNOWFLAKE_RE = /^\d{17,20}$/;

function validateBotIdentity(input = {}) {
  const botName = String(input.botName || '').trim();
  const botUsername = String(input.botUsername || '').trim();
  const ownerId = String(input.ownerId || '').trim();
  const guildId = String(input.guildId || '').trim();
  const errors = [];
  if (!NAME_RE.test(botName)) errors.push('INVALID_BOT_NAME');
  if (!USERNAME_RE.test(botUsername)) errors.push('INVALID_BOT_USERNAME');
  if (!SNOWFLAKE_RE.test(ownerId)) errors.push('INVALID_OWNER_ID');
  if (!SNOWFLAKE_RE.test(guildId)) errors.push('INVALID_GUILD_ID');
  for (const key of ['avatarUrl','bannerUrl']) {
    if (!input[key]) continue;
    try {
      const url = new URL(input[key]);
      if (url.protocol !== 'https:') errors.push('INVALID_' + key.toUpperCase());
    } catch { errors.push('INVALID_' + key.toUpperCase()); }
  }
  return { valid: errors.length === 0, errors, value: errors.length ? null : {
    botName, botUsername, ownerId, guildId,
    avatarUrl: input.avatarUrl || null, bannerUrl: input.bannerUrl || null,
  } };
}

module.exports = { validateBotIdentity };
