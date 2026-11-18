'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { getProduct, getPlan } = require('./bot-catalog');

const FILE = path.resolve(process.env.E77_SUBSCRIPTIONS_FILE || path.join(process.cwd(), 'data', 'subscriptions.json'));
let state;
let queue = Promise.resolve();

function emptyState() { return { version: 1, orders: {}, subscriptions: {} }; }
async function load() {
  if (state) return;
  await fs.mkdir(path.dirname(FILE), { recursive: true, mode: 0o700 });
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'));
    if (!parsed || parsed.version !== 1 || !parsed.orders || !parsed.subscriptions) throw new Error('E77_SUBSCRIPTION_SCHEMA_INVALID');
    state = parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = emptyState();
    await persist();
  }
}
async function persist() {
  const temp = FILE + '.tmp';
  await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 });
  await fs.rename(temp, FILE);
}
function mutate(fn) {
  const task = queue.then(async () => { await load(); const result = await fn(state); await persist(); return result; });
  queue = task.catch(() => {});
  return task;
}
async function read(fn) { await queue; await load(); return fn(state); }
function publicOrder(order) { return order ? { ...order } : null; }

async function createOrder(input) {
  return mutate(data => {
    const product = getProduct(input.productId);
    const plan = getPlan(input.planId);
    if (!product) throw new Error('E77_PRODUCT_NOT_FOUND');
    if (!plan) throw new Error('E77_PLAN_NOT_FOUND');
    if (!/^\d{17,20}$/.test(String(input.ownerId || ''))) throw new Error('E77_INVALID_OWNER_ID');
    if (!/^\d{17,20}$/.test(String(input.guildId || ''))) throw new Error('E77_INVALID_GUILD_ID');
    const botName = String(input.botName || '').trim();
    const botUsername = String(input.botUsername || '').trim();
    if (!/^[\p{L}\p{N} _.-]{2,32}$/u.test(botName)) throw new Error('E77_INVALID_BOT_NAME');
    if (!/^[a-z0-9_.]{2,32}$/.test(botUsername)) throw new Error('E77_INVALID_BOT_USERNAME');
    const now = Date.now();
    const order = {
      id: randomUUID(), productId: product.id, productName: product.name,
      planId: plan.id, planLabel: plan.label, durationDays: plan.durationDays,
      ownerId: String(input.ownerId), guildId: String(input.guildId),
      requestedBotName: botName, requestedBotUsername: botUsername,
      avatarUrl: input.avatarUrl || null, bannerUrl: input.bannerUrl || null,
      status: 'pending_review', createdAt: now, updatedAt: now,
      applicationId: null, botUserId: null, inviteUrl: null, activatedAt: null,
      expiresAt: null, subscriptionId: null, rejectionReason: null,
    };
    data.orders[order.id] = order;
    return publicOrder(order);
  });
}
async function getOrder(orderId) { return read(data => publicOrder(data.orders[orderId])); }
async function listOrders({ ownerId, status, limit = 25 } = {}) {
  return read(data => Object.values(data.orders)
    .filter(order => !ownerId || order.ownerId === String(ownerId))
    .filter(order => !status || order.status === status)
    .sort((a,b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(1, Math.min(100, limit))).map(publicOrder));
}
async function approveForProvisioning(orderId) {
  return mutate(data => {
    const order = data.orders[orderId];
    if (!order) throw new Error('E77_ORDER_NOT_FOUND');
    if (order.status !== 'pending_review') throw new Error('E77_ORDER_NOT_PENDING');
    order.status = 'awaiting_bot_application';
    order.updatedAt = Date.now();
    return publicOrder(order);
  });
}
async function attachBotApplication(orderId, { applicationId, botUserId, inviteUrl }) {
  return mutate(data => {
    const order = data.orders[orderId];
    if (!order) throw new Error('E77_ORDER_NOT_FOUND');
    if (order.status !== 'awaiting_bot_application') throw new Error('E77_ORDER_NOT_AWAITING_APPLICATION');
    if (!/^\d{17,20}$/.test(String(applicationId || '')) || !/^\d{17,20}$/.test(String(botUserId || ''))) throw new Error('E77_INVALID_APPLICATION_ID');
    if (typeof inviteUrl !== 'string' || !inviteUrl.startsWith('https://discord.com/oauth2/authorize?')) throw new Error('E77_INVALID_INVITE_URL');
    order.applicationId = String(applicationId);
    order.botUserId = String(botUserId);
    order.inviteUrl = inviteUrl;
    order.status = 'awaiting_customer_install';
    order.updatedAt = Date.now();
    return publicOrder(order);
  });
}
async function activateSubscription(orderId, { installedGuildId, installedByOwnerId }) {
  return mutate(data => {
    const order = data.orders[orderId];
    if (!order) throw new Error('E77_ORDER_NOT_FOUND');
    if (order.status !== 'awaiting_customer_install') throw new Error('E77_ORDER_NOT_READY');
    if (String(installedGuildId) !== order.guildId || String(installedByOwnerId) !== order.ownerId) throw new Error('E77_INSTALLATION_IDENTITY_MISMATCH');
    const now = Date.now();
    const subscription = {
      id: randomUUID(), orderId, productId: order.productId, ownerId: order.ownerId,
      guildId: order.guildId, applicationId: order.applicationId, botUserId: order.botUserId,
      planId: order.planId, durationDays: order.durationDays,
      status: 'active', activatedAt: now, expiresAt: now + order.durationDays * 86400000,
      createdAt: now, updatedAt: now,
    };
    data.subscriptions[subscription.id] = subscription;
    order.status = 'active';
    order.subscriptionId = subscription.id;
    order.activatedAt = now;
    order.expiresAt = subscription.expiresAt;
    order.updatedAt = now;
    return { order: publicOrder(order), subscription: { ...subscription } };
  });
}
async function expireDueSubscriptions(now = Date.now()) {
  return mutate(data => {
    const expired = [];
    for (const sub of Object.values(data.subscriptions)) {
      if (sub.status === 'active' && sub.expiresAt <= now) {
        sub.status = 'expired'; sub.updatedAt = now; expired.push(sub.id);
        const order = data.orders[sub.orderId];
        if (order) { order.status = 'expired'; order.updatedAt = now; }
      }
    }
    return expired;
  });
}
async function extendSubscription(subscriptionId, planId) {
  return mutate(data => {
    const sub = data.subscriptions[subscriptionId];
    const plan = getPlan(planId);
    if (!sub) throw new Error('E77_SUBSCRIPTION_NOT_FOUND');
    if (!plan) throw new Error('E77_PLAN_NOT_FOUND');
    if (!['active','expired'].includes(sub.status)) throw new Error('E77_SUBSCRIPTION_NOT_EXTENDABLE');
    const now = Date.now();
    const base = Math.max(now, sub.expiresAt);
    sub.expiresAt = base + plan.durationDays * 86400000;
    sub.status = 'active'; sub.planId = plan.id; sub.durationDays += plan.durationDays; sub.updatedAt = now;
    const order = data.orders[sub.orderId];
    if (order) { order.expiresAt = sub.expiresAt; order.status = 'active'; order.updatedAt = now; }
    return { ...sub };
  });
}
async function getSubscription(id) { return read(data => data.subscriptions[id] ? { ...data.subscriptions[id] } : null); }

module.exports = { createOrder, getOrder, listOrders, approveForProvisioning, attachBotApplication, activateSubscription, expireDueSubscriptions, extendSubscription, getSubscription };
