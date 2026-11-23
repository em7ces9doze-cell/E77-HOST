"use strict";
function parseAdminIds(value = "") { return new Set(String(value).split(",").map((x) => x.trim()).filter(Boolean)); }
function isAdmin(userId, admins) { return Boolean(userId && admins instanceof Set && admins.has(String(userId))); }
module.exports = { parseAdminIds, isAdmin };
