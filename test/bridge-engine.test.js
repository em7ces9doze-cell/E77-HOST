'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  BridgeExecutionEngine,
  IdempotencyStore,
  PERMISSION_BITS,
  fingerprintOperation,
  normalizeOperation,
  rolePermissionBits,
  validateBridgeConfiguration,
} = require('../bridge-engine');

const GUILD_ID = '12345678901234567';
const ROLE_ID = '22345678901234567';
const CHANNEL_ID = '32345678901234567';
const OPERATION_ID = '00000000-0000-4000-8000-000000000001';
const SECRET_FOR_TESTS_ONLY = 'a'.repeat(64);

function operation(type, payload, id = OPERATION_ID, key = 'b'.repeat(64)) {
  return { id, idempotencyKey: key, type, guildId: GUILD_ID, payload };
}

function response(status, data) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
  };
}

function makeGuild({ permissions = PERMISSION_BITS['Manage Channels'] | PERMISSION_BITS['Manage Roles'] } = {}) {
  let idCounter = 42345678901234567n;
  const channels = new Map();
  const roles = new Map();
  const calls = { channels: [], roles: [], edits: [], positions: [], overwrites: [] };

  const me = {
    permissions: { bitfield: permissions },
    roles: { highest: { position: 50 } },
  };

  const guild = {
    id: GUILD_ID,
    members: {
      me,
      fetchMe: async () => me,
    },
    channels: {
      cache: { get: id => channels.get(id) },
      fetch: async id => channels.get(id) ?? null,
      create: async options => {
        calls.channels.push(options);
        const id = String(++idCounter);
        const channel = {
          id,
          guildId: GUILD_ID,
          name: options.name,
          type: options.type,
          parentId: options.parent,
          permissionOverwrites: {
            edit: async (role, overwrite, editOptions) => {
              calls.overwrites.push({ roleId: role.id, overwrite, editOptions });
              return true;
            },
          },
        };
        channels.set(id, channel);
        return channel;
      },
    },
    roles: {
      cache: { get: id => roles.get(id) },
      fetch: async id => roles.get(id) ?? null,
      create: async options => {
        calls.roles.push(options);
        const id = String(++idCounter);
        const role = {
          id,
          guild,
          name: options.name,
          color: options.color,
          position: 1,
          permissions: { bitfield: options.permissions },
          edit: async changes => {
            const { permissions: updatedPermissions, reason, ...plainChanges } = changes;
            calls.edits.push({ roleId: id, changes, reason });
            Object.assign(role, plainChanges);
            if (updatedPermissions !== undefined) role.permissions.bitfield = updatedPermissions;
            return role;
          },
          setPosition: async (position, options2) => {
            calls.positions.push({ roleId: id, position, options: options2 });
            role.position = position;
            return role;
          },
        };
        roles.set(id, role);
        return role;
      },
    },
  };

  const existingRole = {
    id: ROLE_ID,
    guild,
    managed: false,
    position: 5,
    name: 'Existing',
    color: 0,
    permissions: { bitfield: 0n },
    edit: async changes => {
      const { permissions, reason, ...plainChanges } = changes;
      calls.edits.push({ roleId: ROLE_ID, changes, reason });
      Object.assign(existingRole, plainChanges);
      if (permissions !== undefined) existingRole.permissions.bitfield = permissions;
      return existingRole;
    },
    setPosition: async (position, options2) => {
      calls.positions.push({ roleId: ROLE_ID, position, options: options2 });
      existingRole.position = position;
      return existingRole;
    },
  };
  roles.set(ROLE_ID, existingRole);

  const existingChannel = {
    id: CHANNEL_ID,
    guildId: GUILD_ID,
    permissionOverwrites: {
      edit: async (role, overwrite, editOptions) => {
        calls.overwrites.push({ roleId: role.id, overwrite, editOptions });
        return true;
      },
    },
  };
  channels.set(CHANNEL_ID, existingChannel);

  return { guild, calls, roles, channels };
}

async function temporaryDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'em7-bridge-test-'));
}

function setupEngine({ claimedOperation, guild = makeGuild(), fetchImpl, directory, logger } = {}) {
  const requests = [];
  const results = [];
  const logs = [];
  const logTarget = logger ?? { log: line => logs.push(line) };
  const effectiveFetch = fetchImpl ?? (async (url, init) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith('/api/bridge/operations/claim')) {
      return response(200, { operation: claimedOperation ?? null });
    }
    if (String(url).endsWith('/result')) {
      const result = JSON.parse(init.body);
      results.push(result);
      return response(200, { ok: true, status: result.success ? 'succeeded' : 'failed' });
    }
    throw new Error('unexpected mocked URL');
  });
  const client = {
    guilds: {
      cache: { get: id => id === GUILD_ID ? guild.guild : null },
      fetch: async id => id === GUILD_ID ? guild.guild : null,
    },
  };
  const engine = new BridgeExecutionEngine({
    client,
    controlUrl: 'https://control.example.test',
    secret: SECRET_FOR_TESTS_ONLY,
    stateFile: path.join(directory, 'state', 'bridge-state.json'),
    fetchImpl: effectiveFetch,
    logger: logTarget,
  });
  return { engine, guild, requests, results, logs };
}

test('validates the existing Authorization Bearer contract without returning secret data', () => {
  assert.equal(validateBridgeConfiguration({
    controlUrl: 'https://control.example.test/',
    secret: SECRET_FOR_TESTS_ONLY,
    headerName: 'Authorization',
    authScheme: 'Bearer',
  }), 'https://control.example.test');
  assert.throws(() => validateBridgeConfiguration({
    controlUrl: 'https://control.example.test',
    secret: SECRET_FOR_TESTS_ONLY,
    headerName: 'X-Bridge-Secret',
    authScheme: 'Bearer',
  }), /Authorization: Bearer/);
  assert.throws(() => validateBridgeConfiguration({
    controlUrl: 'http://control.example.test',
    secret: SECRET_FOR_TESTS_ONLY,
  }), /HTTPS/);
});

test('validates every supported operation and never grants Administrator', () => {
  const cases = [
    operation('create_channel', { name: 'general', channelType: 'text' }),
    operation('create_rooms', { categories: [{ name: 'Public', channels: [{ name: 'chat', type: 'text' }] }], roles: [] }),
    operation('create_role', { name: 'Member', permissions: { 'View Channel': true } }),
    operation('update_role', { roleId: ROLE_ID, color: '#123456', permissions: { 'Send Messages': true } }),
    operation('set_channel_permissions', { channelId: CHANNEL_ID, roleId: ROLE_ID, permissions: { 'View Channel': false } }),
  ];
  for (const value of cases) assert.doesNotThrow(() => normalizeOperation(value));
  assert.throws(() => normalizeOperation(operation('create_channel', { name: 'bad', channelType: 'category' })));
  assert.throws(() => normalizeOperation(operation('create_role', { name: 'Admin', permissions: { Administrator: true } })));
  assert.equal((rolePermissionBits({ 'View Channel': true }) & (1n << 3n)), 0n);
});

test('claims a text channel, reports Discord IDs and duration, and blocks a duplicate execution', async () => {
  const directory = await temporaryDirectory();
  try {
    const claimed = operation('create_channel', { name: 'general', channelType: 'text' });
    const { engine, guild, results, logs, requests } = setupEngine({ claimedOperation: claimed, directory });
    await engine.pollOnce();
    await engine.pollOnce();

    assert.equal(guild.calls.channels.length, 1);
    assert.equal(guild.calls.channels[0].type, 0);
    assert.equal(results.length, 2);
    assert.equal(results[0].success, true);
    assert.equal(results[0].details.createdIds.length, 1);
    assert.equal(typeof results[0].details.executionMs, 'number');
    assert.equal(results[1].success, true);
    assert.equal(requests.every(item => item.init.headers.Authorization === `Bearer ${SECRET_FOR_TESTS_ONLY}`), true);
    assert.equal(logs.join('\n').includes(SECRET_FOR_TESTS_ONLY), false);
    assert.equal(logs.join('\n').includes('result_reported'), true);
    const state = JSON.parse(await fs.readFile(path.join(directory, 'state', 'bridge-state.json'), 'utf8'));
    assert.equal(Object.values(state.records)[0].status, 'completed');
    assert.equal(state.version, 2);
    assert.match(Object.values(state.records)[0].fingerprint, /^[a-f0-9]{64}$/);
    const mode = (await fs.stat(path.join(directory, 'state', 'bridge-state.json'))).mode & 0o777;
    assert.equal(mode, 0o600);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('creates categories, nested text/voice channels, and roles with permission-limited results', async () => {
  const directory = await temporaryDirectory();
  try {
    const claimed = operation('create_rooms', {
      categories: [{ name: 'Public', channels: [{ name: 'chat', type: 'text' }, { name: 'voice', type: 'voice' }] }],
      roles: [{ name: 'Member', color: '#336699', position: 2, permissions: { 'View Channel': true } }],
    });
    const { engine, guild, results } = setupEngine({ claimedOperation: claimed, directory });
    await engine.pollOnce();
    assert.deepEqual(guild.calls.channels.map(item => item.type), [4, 0, 2]);
    assert.equal(guild.calls.channels[1].parent, '42345678901234568');
    assert.equal(guild.calls.roles.length, 1);
    assert.equal(guild.calls.roles[0].permissions & (1n << 3n), 0n);
    assert.equal(guild.calls.positions.length, 1);
    assert.equal(results[0].success, true);
    assert.equal(results[0].details.resourceCount, 4);
    assert.equal(results[0].details.createdIds.length, 3);
    assert.equal(results[0].details.createdRoles.length, 1);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('updates a role while preserving unspecified permission bits and forwards the audit reason', async () => {
  const directory = await temporaryDirectory();
  try {
    const guild = makeGuild();
    guild.roles.get(ROLE_ID).permissions.bitfield = 1n << 11n;
    const claimed = operation('update_role', {
      roleId: ROLE_ID,
      name: 'Updated',
      permissions: { 'View Channel': true, 'Send Messages': false },
    });
    const { engine, results } = setupEngine({ claimedOperation: claimed, guild, directory });
    await engine.pollOnce();
    const changes = guild.calls.edits[0].changes;
    assert.equal(changes.name, 'Updated');
    assert.equal((changes.permissions & PERMISSION_BITS['View Channel']) !== 0n, true);
    assert.equal((changes.permissions & PERMISSION_BITS['Send Messages']) !== 0n, false);
    assert.equal(guild.calls.edits[0].reason, `EM7 operation ${claimed.id}`);
    assert.equal(results[0].success, true);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('sets channel overwrites using the Manage Roles permission and reports the target', async () => {
  const directory = await temporaryDirectory();
  try {
    const claimed = operation('set_channel_permissions', {
      channelId: CHANNEL_ID,
      roleId: ROLE_ID,
      permissions: { 'View Channel': false, 'Send Messages': true },
    });
    const { engine, guild, results } = setupEngine({ claimedOperation: claimed, directory });
    await engine.pollOnce();
    assert.equal(guild.calls.overwrites.length, 1);
    assert.deepEqual(guild.calls.overwrites[0].overwrite, { ViewChannel: false, SendMessages: true });
    assert.equal(results[0].success, true);
    assert.equal(results[0].details.changedPermissionCount, 2);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('fails closed before channel creation when the bot lacks Manage Channels', async () => {
  const directory = await temporaryDirectory();
  try {
    const guild = makeGuild({ permissions: 0n });
    const claimed = operation('create_channel', { name: 'blocked', channelType: 'text' });
    const { engine, results } = setupEngine({ claimedOperation: claimed, guild, directory });
    await engine.pollOnce();
    assert.equal(guild.calls.channels.length, 0);
    assert.equal(results[0].success, false);
    assert.equal(results[0].details.reason, 'permission_missing');
    assert.match(results[0].summary, /Manage Channels/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('does not retry an operation whose durable ledger says execution was interrupted', async () => {
  const directory = await temporaryDirectory();
  try {
    const claimed = operation('create_channel', { name: 'uncertain', channelType: 'text' });
    const setup = setupEngine({ claimedOperation: claimed, directory });
    await setup.engine.store.load();
    await setup.engine.store.put(claimed.idempotencyKey, {
      operationId: claimed.id,
      fingerprint: fingerprintOperation(normalizeOperation(claimed)),
      status: 'in_progress',
    });
    await setup.engine.pollOnce();
    assert.equal(setup.guild.calls.channels.length, 0);
    assert.equal(setup.results[0].success, false);
    assert.equal(setup.results[0].details.outcomeUncertain, true);
    assert.equal(setup.results[0].details.reason, 'execution_interrupted');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('reports Discord HTTP errors without logging provider messages or credentials', async () => {
  const directory = await temporaryDirectory();
  try {
    const guild = makeGuild();
    guild.guild.channels.create = async () => {
      const error = new Error(`private provider text ${SECRET_FOR_TESTS_ONLY}`);
      error.status = 403;
      error.code = 50013;
      throw error;
    };
    const claimed = operation('create_channel', { name: 'forbidden', channelType: 'text' });
    const { engine, results, logs } = setupEngine({ claimedOperation: claimed, guild, directory });
    await engine.pollOnce();
    assert.equal(results[0].success, false);
    assert.equal(results[0].details.discordStatus, 403);
    assert.equal(results[0].details.discordCode, '50013');
    assert.equal(logs.join('\n').includes(SECRET_FOR_TESTS_ONLY), false);
    assert.equal(logs.join('\n').includes('private provider text'), false);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('fails closed if persisted idempotency state has an unsupported or corrupt schema', async () => {
  const directory = await temporaryDirectory();
  try {
    const stateFile = path.join(directory, 'state', 'bridge-state.json');
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    await fs.writeFile(stateFile, JSON.stringify({ version: 1, records: {} }), { mode: 0o600 });
    const claimed = operation('create_channel', { name: 'must-not-run', channelType: 'text' });
    const setup = setupEngine({ claimedOperation: claimed, directory });
    await assert.rejects(setup.engine.pollOnce(), error => error.code === 'idempotency_store_unavailable');
    assert.equal(setup.guild.calls.channels.length, 0);
    assert.equal(setup.results.length, 0);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('rejects create_rooms batches above the result-detail-safe 40-resource limit before Discord calls', () => {
  const tooMany = operation('create_rooms', {
    categories: [{
      name: 'Large',
      channels: Array.from({ length: 40 }, (_, index) => ({ name: `channel-${index}`, type: 'text' })),
    }],
    roles: [],
  });
  assert.throws(() => normalizeOperation(tooMany), error => error.code === 'operation_too_large');
});

test('allows a definite failed update only after the same operation is explicitly claimed again', async () => {
  const directory = await temporaryDirectory();
  try {
    const guild = makeGuild();
    const role = guild.roles.get(ROLE_ID);
    const originalEdit = role.edit;
    let attempts = 0;
    role.edit = async (...args) => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error('permission denied');
        error.status = 403;
        error.code = 50013;
        throw error;
      }
      return originalEdit(...args);
    };
    const claimed = operation('update_role', { roleId: ROLE_ID, name: 'Retryable' });
    const { engine, results, logs } = setupEngine({ claimedOperation: claimed, guild, directory });
    await engine.pollOnce();
    assert.equal(results[0].success, false);
    await engine.pollOnce();
    assert.equal(attempts, 2);
    assert.equal(results[1].success, true);
    assert.equal(logs.join('\n').includes('safe_retry_authorized'), true);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('never retries an update when Discord outcome is uncertain', async () => {
  const directory = await temporaryDirectory();
  try {
    const guild = makeGuild();
    const role = guild.roles.get(ROLE_ID);
    let attempts = 0;
    role.edit = async () => {
      attempts += 1;
      const error = new Error('uncertain network outcome');
      error.status = 502;
      throw error;
    };
    const claimed = operation('update_role', { roleId: ROLE_ID, name: 'Uncertain' });
    const { engine, results } = setupEngine({ claimedOperation: claimed, guild, directory });
    await engine.pollOnce();
    assert.equal(results[0].details.outcomeUncertain, true);
    await engine.pollOnce();
    assert.equal(attempts, 1);
    assert.equal(results[1].success, false);
    assert.equal(results[1].details.reason, 'discord_result_uncertain');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('blocks replay when the same operation ID and key carry changed normalized contents', async () => {
  const directory = await temporaryDirectory();
  try {
    const claimed = operation('create_channel', { name: 'before', channelType: 'text' });
    const { engine, guild, results } = setupEngine({ claimedOperation: claimed, directory });
    await engine.pollOnce();
    claimed.payload.name = 'after';
    await engine.pollOnce();
    assert.equal(guild.calls.channels.length, 1);
    assert.equal(results[1].success, false);
    assert.equal(results[1].details.reason, 'idempotency_conflict');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('blocks replay when an operation ID is presented with a substituted idempotency key', async () => {
  const directory = await temporaryDirectory();
  try {
    const claimed = operation('create_channel', { name: 'stable', channelType: 'text' });
    const { engine, guild, results } = setupEngine({ claimedOperation: claimed, directory });
    await engine.pollOnce();
    claimed.idempotencyKey = 'c'.repeat(64);
    await engine.pollOnce();
    assert.equal(guild.calls.channels.length, 1);
    assert.equal(results[1].success, false);
    assert.equal(results[1].details.reason, 'idempotency_conflict');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('stop aborts a hanging bridge request and resolves worker shutdown', async () => {
  const directory = await temporaryDirectory();
  try {
    const fetchImpl = async (_url, init) => new Promise((_resolve, reject) => {
      const abort = () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (init.signal.aborted) abort();
      else init.signal.addEventListener('abort', abort, { once: true });
    });
    const { engine } = setupEngine({ claimedOperation: null, fetchImpl, directory });
    await engine.start();
    const startedAt = Date.now();
    await engine.stop();
    assert.ok(Date.now() - startedAt < 1000);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
