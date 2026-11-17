"use strict";

const fs = require("node:fs");
const path = require("node:path");

const commands = new Map();
const directory = __dirname;

for (const file of fs.readdirSync(directory).filter(name => name.endsWith(".js") && name !== "index.js" && name !== "register.js")) {
  const command = require(path.join(directory, file));
  if (command.data && typeof command.execute === "function") commands.set(command.data.name, command);
}

module.exports = commands;