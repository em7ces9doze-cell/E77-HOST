"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createRouterAdapter } = require("../src/router/adapter");
const { parseAdminIds, isAdmin } = require("../src/security/admin");
test("disabled adapter never invents router data", async () => {
  const adapter = createRouterAdapter({ ROUTER_CONNECTOR: "disabled" });
  assert.equal((await adapter.getStatus()).state, "NOT_CONFIGURED");
  const devices = await adapter.getDevices();
  assert.deepEqual(devices.devices, []);
  assert.equal(devices.state, "NOT_CONFIGURED");
});
test("unknown connector is unsupported", async () => {
  const adapter = createRouterAdapter({ ROUTER_CONNECTOR: "unknown" });
  assert.equal((await adapter.getStatus()).state, "UNSUPPORTED");
});
test("admin allowlist denies non-admin users", () => {
  const admins = parseAdminIds("123, 456");
  assert.equal(isAdmin("123", admins), true);
  assert.equal(isAdmin("999", admins), false);
});
