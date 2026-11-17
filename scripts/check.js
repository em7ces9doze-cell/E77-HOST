"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const roots = ["src", "scripts"];
const files = [];

function collect(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }
}

for (const root of roots) collect(path.resolve(root));
if (!files.includes(path.resolve("src/index.js"))) {
  console.error("Missing src/index.js");
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    console.error("Syntax error: " + path.relative(process.cwd(), file));
    if (result.stderr) console.error(result.stderr.trim());
  } else {
    console.log("OK " + path.relative(process.cwd(), file));
  }
}

if (failed) process.exit(1);
console.log("E77 syntax check passed for " + files.length + " JavaScript files.");
