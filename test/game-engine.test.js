'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../game-engine');

test('creates a lobby with its host', () => {
  const game = engine.createSession({ guildId: 'g1', channelId: 'c1', hostId: 'u1', now: 10 });
  assert.deepEqual(game.players, ['u1']);
  assert.equal(game.status, 'lobby');
  assert.equal(game.createdAt, 10);
});

test('enforces unique players and a ten-player limit', () => {
  const game = engine.createSession({ guildId: 'g1', channelId: 'c1', hostId: 'u1' });
  assert.equal(engine.addPlayer(game, 'u1').reason, 'ALREADY_JOINED');
  for (let i = 2; i <= 10; i++) assert.equal(engine.addPlayer(game, 'u' + i).ok, true);
  assert.equal(engine.addPlayer(game, 'u11').reason, 'LOBBY_FULL');
});

test('requires at least two players and prevents lobby edits after start', () => {
  const game = engine.createSession({ guildId: 'g1', channelId: 'c1', hostId: 'u1' });
  assert.equal(engine.startSession(game).reason, 'NOT_ENOUGH_PLAYERS');
  engine.addPlayer(game, 'u2');
  assert.equal(engine.startSession(game, { now: 20 }).ok, true);
  assert.equal(engine.addPlayer(game, 'u3').reason, 'GAME_STARTED');
});

test('only the selected chooser can eliminate another active player', () => {
  const game = engine.createSession({ guildId: 'g1', channelId: 'c1', hostId: 'u1' });
  engine.addPlayer(game, 'u2');
  engine.addPlayer(game, 'u3');
  engine.startSession(game);
  assert.equal(engine.choosePlayer(game, () => 0), 'u1');
  assert.equal(engine.eliminatePlayer(game, 'u2', 'u3').reason, 'NOT_CURRENT_CHOOSER');
  assert.equal(engine.eliminatePlayer(game, 'u1', 'u1').reason, 'CANNOT_CHOOSE_SELF');
  const result = engine.eliminatePlayer(game, 'u1', 'u2');
  assert.equal(result.ok, true);
  assert.equal(game.players.length, 1);
  assert.equal(game.status, 'finished');
  assert.equal(result.winnerId, 'u3');
});
