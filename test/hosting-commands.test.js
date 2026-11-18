'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { commands, ADMIN_COMMANDS } = require('../commands');

const byName = new Map(commands.map(command => [command.name, command]));

test('hosting setup and embed commands are registered for administrators', () => {
  assert.ok(byName.has('hosting-room'));
  assert.ok(byName.has('hosting-embed'));
  assert.ok(ADMIN_COMMANDS.has('hosting-room'));
  assert.ok(ADMIN_COMMANDS.has('hosting-embed'));
});

test('hosting embed exposes a text channel, title, description and optional color', () => {
  const command = byName.get('hosting-embed');
  assert.ok(command);
  const options = new Map(command.options.map(option => [option.name, option]));
  assert.deepEqual([...options.keys()], ['channel', 'title', 'description', 'color']);
  assert.equal(options.get('channel').required, true);
  assert.equal(options.get('title').required, true);
  assert.equal(options.get('description').required, true);
  assert.equal(options.get('color').required, false);
});

test('hosting purchase and virtual currency information commands are available', () => {
  assert.ok(byName.has('hosting-buy'));
  assert.ok(byName.has('coin-info'));
  const purchase = byName.get('hosting-buy');
  assert.equal(purchase.options[0].name, 'item_id');
  assert.equal(purchase.options[0].required, true);
});
