"use strict";
function createRouterAdapter(env = process.env) {
  const mode = String(env.ROUTER_CONNECTOR || "disabled").toLowerCase();
  return {
    async getStatus() {
      if (mode === "disabled") return { state: "NOT_CONFIGURED", message: "Router connector has not been configured. No verified network data is available." };
      return { state: "UNSUPPORTED", message: "This router connector is not supported by this build." };
    },
    async getDevices() {
      return { state: mode === "disabled" ? "NOT_CONFIGURED" : "UNSUPPORTED", devices: [], message: "Device discovery is unavailable until the router interface is verified." };
    }
  };
}
module.exports = { createRouterAdapter };
