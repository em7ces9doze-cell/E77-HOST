"use strict";

const { Events } = require("discord.js");
const logger = require("../utils/logger");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info("Ready as " + client.user.tag);
    client.user.setPresence({ activities: [{ name: "/help • E77" }], status: "online" });
  }
};