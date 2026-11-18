'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'e77-economy-test-'));
process.env.E7_ECONOMY_FILE = path.join(directory, 'economy.json');
const economy = require('../economy-store');

test('bank deposits and withdrawals are atomic and appear in the transaction history', async t => {
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const before = await economy.balance('guild-test', 'user-test');
  assert.equal(before.balance, 100);
  assert.equal(before.bank, 0);

  const deposited = await economy.deposit('guild-test', 'user-test', 60);
  assert.deepEqual({ balance: deposited.balance, bank: deposited.bank }, { balance: 40, bank: 60 });

  const withdrawn = await economy.withdraw('guild-test', 'user-test', 40);
  assert.deepEqual({ balance: withdrawn.balance, bank: withdrawn.bank }, { balance: 80, bank: 20 });

  await assert.rejects(economy.withdraw('guild-test', 'user-test', 21), error => error.message === 'INSUFFICIENT_BANK_FUNDS');
  const final = await economy.balance('guild-test', 'user-test');
  assert.equal(final.balance, 80);
  assert.equal(final.bank, 20);

  const history = await economy.transactions('guild-test', 'user-test', 10);
  assert.deepEqual(history.map(entry => entry.type), ['withdraw', 'deposit']);
  assert.deepEqual(history.map(entry => entry.amount), [40, 60]);
});

test('v1 economy migration preserves existing balances and classifies legacy products safely', async t => {
  const migrationDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e77-migration-test-'));
  const file = path.join(migrationDir, 'economy.json');
  t.after(() => fs.rmSync(migrationDir, { recursive: true, force: true }));
  fs.writeFileSync(file, JSON.stringify({
    version: 1,
    guilds: {
      'guild-old': {
        users: { 'user-old': { balance: 9876, bank: 4321, dailyAt: 123, workAt: 456, inventory: [{ id: 'x' }], totalEarned: 10000, totalSpent: 124 } },
        shop: [{ id: 'legacy-plan', name: 'Legacy Plan', price: 500 }],
        transactions: [{ id: 'old-tx', type: 'purchase', userId: 'user-old', amount: 124, at: 789 }]
      }
    }
  }));
  const previousPath = process.env.E7_ECONOMY_FILE;
  process.env.E7_ECONOMY_FILE = file;
  const modulePath = require.resolve('../economy-store');
  delete require.cache[modulePath];
  const migratedEconomy = require('../economy-store');
  const account = await migratedEconomy.balance('guild-old', 'user-old');
  assert.equal(account.balance, 9876);
  assert.equal(account.bank, 4321);
  assert.equal(account.dailyAt, 123);
  assert.equal(account.workAt, 456);
  assert.equal((await migratedEconomy.shop('guild-old'))[0].kind, 'service');
  const migrated = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.guilds['guild-old'].transactions[0].id, 'old-tx');
  if (previousPath === undefined) delete process.env.E7_ECONOMY_FILE;
  else process.env.E7_ECONOMY_FILE = previousPath;
  delete require.cache[modulePath];
  require('../economy-store');
});
