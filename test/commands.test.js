'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');
const { commands, ADMIN_COMMANDS } = require('../commands');

test('slash command names are unique and command catalog is substantial', () => {
  const names = commands.map(command => command.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.length >= 20);
});

test('every administrative command is hidden behind Administrator permission', () => {
  const byName = new Map(commands.map(command => [command.name, command]));
  assert.ok(ADMIN_COMMANDS.size >= 12);
  for (const name of ADMIN_COMMANDS) {
    const command = byName.get(name);
    assert.ok(command, `Missing command definition: ${name}`);
    assert.equal(command.default_member_permissions, PermissionFlagsBits.Administrator.toString());
  }
});

test('member commands remain available without default administrator restriction', () => {
  const byName = new Map(commands.map(command => [command.name, command]));
  for (const name of ['help', 'ping', 'botinfo', 'serverinfo', 'userinfo', 'avatar', 'roleinfo', 'channelinfo', 'poll']) {
    assert.ok(byName.has(name), `Missing member command: ${name}`);
    assert.equal(byName.get(name).default_member_permissions, undefined);
  }
});
