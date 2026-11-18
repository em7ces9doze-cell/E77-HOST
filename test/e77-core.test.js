'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('catalog exposes 24 products and five subscription terms', () => {
  const { products, plans, getProduct, getPlan } = require('../bot-catalog');
  assert.equal(products.length, 24);
  assert.equal(new Set(products.map(x => x.id)).size, 24);
  assert.deepEqual(plans.map(x => x.durationDays), [7, 15, 30, 60, 90]);
  assert.equal(getProduct('guard').name, 'E77 GUARD');
  assert.equal(getPlan('3m').durationDays, 90);
});

test('customer identity validation checks names, IDs and HTTPS assets', () => {
  const { validateBotIdentity } = require('../bot-identity');
  const valid = validateBotIdentity({
    botName: 'E77 Test Bot', botUsername: 'e77_test_bot',
    ownerId: '12345678901234567', guildId: '23456789012345678',
    avatarUrl: 'https://cdn.example.com/avatar.png',
  });
  assert.equal(valid.valid, true);
  assert.equal(validateBotIdentity({ botName: 'x', botUsername: 'Invalid Name', ownerId: '1', guildId: '2' }).valid, false);
});

test('subscription lifecycle starts clock only after verified install', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'e77-subscriptions-'));
  process.env.E77_SUBSCRIPTIONS_FILE = path.join(dir, 'subscriptions.json');
  const store = require('../subscription-store');
  try {
    const order = await store.createOrder({
      productId: 'guard', planId: '7d', ownerId: '12345678901234567',
      guildId: '23456789012345678', botName: 'My Guard', botUsername: 'my_guard_bot',
    });
    assert.equal(order.status, 'pending_review');
    assert.equal(order.expiresAt, null);
    await store.approveForProvisioning(order.id);
    await store.attachBotApplication(order.id, {
      applicationId: '34567890123456789', botUserId: '45678901234567890',
      inviteUrl: 'https://discord.com/oauth2/authorize?client_id=34567890123456789',
    });
    await assert.rejects(
      store.activateSubscription(order.id, { installedGuildId: '99999999999999999', installedByOwnerId: order.ownerId }),
      { message: 'E77_INSTALLATION_IDENTITY_MISMATCH' },
    );
    const result = await store.activateSubscription(order.id, {
      installedGuildId: order.guildId, installedByOwnerId: order.ownerId,
    });
    assert.equal(result.order.status, 'active');
    assert.equal(result.subscription.durationDays, 7);
    assert.equal(result.subscription.expiresAt - result.subscription.activatedAt, 7 * 86400000);
    const expired = await store.expireDueSubscriptions(result.subscription.expiresAt + 1);
    assert.deepEqual(expired, [result.subscription.id]);
    assert.equal((await store.getSubscription(result.subscription.id)).status, 'expired');
  } finally {
    delete process.env.E77_SUBSCRIPTIONS_FILE;
    await fs.rm(dir, { recursive: true, force: true });
  }
});
