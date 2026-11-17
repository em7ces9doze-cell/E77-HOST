"use strict";

const fs = require("node:fs");
const path = require("node:path");

const required = [
  "src/index.js",
  "src/config.js",
  "src/commands/index.js",
  "src/commands/register.js",
  "src/database/index.js",
  "src/events/interactionCreate.js",
  "src/events/ready.js"
];

let failed = false;
for (const file of required) {
  const full = path.resolve(file);
  if (!fs.existsSync(full)) {
    console.error("Missing required file: " + file);
    failed = true;
    continue;
  }
  try {
    new Function(fs.readFileSync(full, "utf8"));
    console.log("OK " + file);
  } catch (error) {
    console.error("Syntax error in " + file + ": " + error.message);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("E77 project structure check passed.");