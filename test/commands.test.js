'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionFlagsBits } = require('discord.js');
const { commands, ADMIN_COMMANDS } = require('../commands');

test('E7 HOST economy slash commands are unique', () => {
  const names = commands.map(command => command.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.length, 19);
});

test('economy administration commands require Administrator', () => {
  const byName = new Map(commands.map(command => [command.name, command]));
  assert.deepEqual([...ADMIN_COMMANDS].sort(), ['coinsadd','coinsremove','coinsset','shopadd','shopremove'].sort());
  for (const name of ADMIN_COMMANDS) {
    assert.equal(byName.get(name).default_member_permissions, PermissionFlagsBits.Administrator.toString());
  }
});

test('member economy commands are available without admin restriction', () => {
  const byName = new Map(commands.map(command => [command.name, command]));
  for (const name of ['help','balance','bank','deposit','withdraw','transactions','daily','work','pay','leaderboard','shop','buy','inventory','profile']) {
    assert.ok(byName.has(name), 'Missing command: '+name);
    assert.equal(byName.get(name).default_member_permissions, undefined);
  }
});

test('generic moderation commands are not part of the E7 HOST economy product', () => {
  const names = new Set(commands.map(command => command.name));
  for (const name of ['kick','ban','timeout','clear','slowmode','createchannel','createrole']) {
    assert.equal(names.has(name), false);
  }
});
