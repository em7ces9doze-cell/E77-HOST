'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = Object.freeze({
  categoryName: 'E77 STORE • المتجر',
  salesName: '🛒・البيع',
  adminName: '🛡️・الإدارة',
  staffRoleId: null
});

const filePath = path.resolve(
  process.env.E77_STORE_SETTINGS_FILE || path.join(__dirname, 'data', 'store-settings.json')
);

function readAll() {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.guilds || typeof parsed.guilds !== 'object' || Array.isArray(parsed.guilds)) {
      throw new Error('STORE_SETTINGS_SCHEMA_INVALID');
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return { schemaVersion: 1, guilds: {} };
    if (error instanceof SyntaxError) throw new Error('STORE_SETTINGS_FILE_CORRUPT');
    throw error;
  }
}

function get(guildId) {
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) throw new Error('INVALID_GUILD_ID');
  const data = readAll();
  return { ...DEFAULTS, ...(data.guilds[guildId] || {}) };
}

function update(guildId, patch = {}) {
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) throw new Error('INVALID_GUILD_ID');
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('INVALID_SETTINGS');
  const allowed = new Set(['categoryName', 'salesName', 'adminName', 'staffRoleId']);
  for (const key of Object.keys(patch)) if (!allowed.has(key)) throw new Error('UNKNOWN_SETTING');
  const next = { ...get(guildId) };
  for (const key of ['categoryName', 'salesName', 'adminName']) {
    if (patch[key] === undefined) continue;
    if (typeof patch[key] !== 'string') throw new Error('INVALID_SETTING_VALUE');
    const value = patch[key].trim();
    if (!value || value.length > 90) throw new Error('INVALID_SETTING_VALUE');
    next[key] = value;
  }
  if (patch.staffRoleId !== undefined) {
    if (patch.staffRoleId !== null && (typeof patch.staffRoleId !== 'string' || !/^\d{17,20}$/.test(patch.staffRoleId))) {
      throw new Error('INVALID_SETTING_VALUE');
    }
    next.staffRoleId = patch.staffRoleId;
  }
  const data = readAll();
  data.guilds[guildId] = next;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = filePath + '.' + process.pid + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
  return { ...next };
}

module.exports = { DEFAULTS, get, update };
