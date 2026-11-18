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
  assert.equal(before.balance, 250);
  assert.equal(before.bank, 0);

  const deposited = await economy.deposit('guild-test', 'user-test', 100);
  assert.deepEqual({ balance: deposited.balance, bank: deposited.bank }, { balance: 150, bank: 100 });

  const withdrawn = await economy.withdraw('guild-test', 'user-test', 40);
  assert.deepEqual({ balance: withdrawn.balance, bank: withdrawn.bank }, { balance: 190, bank: 60 });

  await assert.rejects(economy.withdraw('guild-test', 'user-test', 61), error => error.message === 'INSUFFICIENT_BANK_FUNDS');
  const final = await economy.balance('guild-test', 'user-test');
  assert.equal(final.balance, 190);
  assert.equal(final.bank, 60);

  const history = await economy.transactions('guild-test', 'user-test', 10);
  assert.deepEqual(history.map(entry => entry.type), ['withdraw', 'deposit']);
  assert.deepEqual(history.map(entry => entry.amount), [40, 100]);
});
