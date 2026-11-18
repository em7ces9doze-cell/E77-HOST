'use strict';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

function createSession({ guildId, channelId, hostId, now = Date.now() }) {
  if (!guildId || !channelId || !hostId) throw new Error('INVALID_SESSION');
  return {
    guildId: String(guildId),
    channelId: String(channelId),
    hostId: String(hostId),
    players: [String(hostId)],
    status: 'lobby',
    createdAt: now,
    startedAt: null,
    eliminated: [],
    currentChooserId: null,
    round: 0,
  };
}

function addPlayer(session, userId) {
  const id = String(userId);
  if (session.status !== 'lobby') return { ok: false, reason: 'GAME_STARTED' };
  if (session.players.includes(id)) return { ok: false, reason: 'ALREADY_JOINED' };
  if (session.players.length >= MAX_PLAYERS) return { ok: false, reason: 'LOBBY_FULL' };
  session.players.push(id);
  return { ok: true };
}

function removePlayer(session, userId) {
  const id = String(userId);
  if (session.status !== 'lobby') return { ok: false, reason: 'GAME_STARTED' };
  if (id === session.hostId) return { ok: false, reason: 'HOST_CANNOT_LEAVE' };
  const index = session.players.indexOf(id);
  if (index < 0) return { ok: false, reason: 'NOT_JOINED' };
  session.players.splice(index, 1);
  return { ok: true };
}

function startSession(session, { now = Date.now() } = {}) {
  if (session.status !== 'lobby') return { ok: false, reason: 'GAME_NOT_LOBBY' };
  if (session.players.length < MIN_PLAYERS) return { ok: false, reason: 'NOT_ENOUGH_PLAYERS' };
  session.status = 'playing';
  session.startedAt = now;
  session.round = 1;
  return { ok: true };
}

function choosePlayer(session, rng = Math.random) {
  if (session.status !== 'playing' || session.players.length < 2) return null;
  const index = Math.floor(rng() * session.players.length);
  session.currentChooserId = session.players[Math.max(0, Math.min(index, session.players.length - 1))];
  return session.currentChooserId;
}

function eliminatePlayer(session, chooserId, targetId) {
  if (session.status !== 'playing') return { ok: false, reason: 'GAME_NOT_PLAYING' };
  if (String(chooserId) !== session.currentChooserId) return { ok: false, reason: 'NOT_CURRENT_CHOOSER' };
  const target = String(targetId);
  if (target === session.currentChooserId) return { ok: false, reason: 'CANNOT_CHOOSE_SELF' };
  if (!session.players.includes(target)) return { ok: false, reason: 'TARGET_NOT_ACTIVE' };
  session.players = session.players.filter(id => id !== target);
  session.eliminated.push(target);
  session.round += 1;
  session.currentChooserId = null;
  if (session.players.length === 1) {
    session.status = 'finished';
    return { ok: true, winnerId: session.players[0], eliminatedId: target };
  }
  return { ok: true, winnerId: null, eliminatedId: target };
}

module.exports = {
  MIN_PLAYERS, MAX_PLAYERS,
  createSession, addPlayer, removePlayer, startSession, choosePlayer, eliminatePlayer,
};
