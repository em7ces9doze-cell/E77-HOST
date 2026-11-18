'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const FILE = path.resolve(process.env.E7_ECONOMY_FILE || path.join(process.cwd(), 'data', 'economy.json'));
const STARTING_BALANCE = 250;
const DAILY_REWARD = 150;
const WORK_MIN = 35;
const WORK_MAX = 90;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const WORK_COOLDOWN = 60 * 60 * 1000;

let state;
let queue = Promise.resolve();

function freshState() {
  return { version: 1, guilds: {} };
}
function ensureGuild(data, guildId) {
  data.guilds[guildId] ||= { users: {}, shop: [], transactions: [] };
  const guild = data.guilds[guildId];
  guild.users ||= {};
  guild.shop ||= [];
  guild.transactions ||= [];
  return guild;
}
function ensureUser(guild, userId) {
  guild.users[userId] ||= {
    balance: STARTING_BALANCE,
    bank: 0,
    dailyAt: 0,
    workAt: 0,
    inventory: [],
    totalEarned: 0,
    totalSpent: 0,
  };
  const user = guild.users[userId];
  user.inventory ||= [];
  user.bank = Number.isSafeInteger(user.bank) && user.bank >= 0 ? user.bank : 0;
  user.balance = Number.isSafeInteger(user.balance) && user.balance >= 0 ? user.balance : 0;
  return user;
}
async function load() {
  if (state) return;
  await fs.mkdir(path.dirname(FILE), { recursive: true, mode: 0o700 });
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'));
    if (!parsed || parsed.version !== 1 || typeof parsed.guilds !== 'object') throw new Error('ECONOMY_SCHEMA_INVALID');
    state = parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = freshState();
    await persist();
  }
}
async function persist() {
  const temp = FILE + '.tmp';
  await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 });
  await fs.rename(temp, FILE);
}
function mutate(fn) {
  const task = queue.then(async () => {
    await load();
    const result = await fn(state);
    await persist();
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
async function read(fn) {
  await queue;
  await load();
  return fn(state);
}
function record(guild, type, userId, amount, note) {
  guild.transactions.unshift({ id: require('node:crypto').randomUUID(), type, userId, amount, note, at: Date.now() });
  if (guild.transactions.length > 1000) guild.transactions.length = 1000;
}
function safeAmount(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 1000000000) throw new Error('INVALID_AMOUNT');
  return value;
}

module.exports = {
  STARTING_BALANCE, DAILY_REWARD, WORK_MIN, WORK_MAX, DAILY_COOLDOWN, WORK_COOLDOWN,
  balance: (g,u) => read(s => { const x=ensureUser(ensureGuild(s,g),u); return { ...x }; }),
  daily: (g,u) => mutate(s => {
    const guild=ensureGuild(s,g), user=ensureUser(guild,u), now=Date.now();
    const remaining=DAILY_COOLDOWN-(now-user.dailyAt);
    if (user.dailyAt && remaining>0) return { ok:false, remaining };
    user.dailyAt=now; user.balance+=DAILY_REWARD; user.totalEarned+=DAILY_REWARD;
    record(guild,'daily',u,DAILY_REWARD,'Daily reward');
    return { ok:true, amount:DAILY_REWARD, balance:user.balance };
  }),
  work: (g,u) => mutate(s => {
    const guild=ensureGuild(s,g), user=ensureUser(guild,u), now=Date.now();
    const remaining=WORK_COOLDOWN-(now-user.workAt);
    if (user.workAt && remaining>0) return { ok:false, remaining };
    const amount=WORK_MIN+Math.floor(Math.random()*(WORK_MAX-WORK_MIN+1));
    user.workAt=now; user.balance+=amount; user.totalEarned+=amount;
    record(guild,'work',u,amount,'Work reward');
    return { ok:true, amount, balance:user.balance };
  }),
  transfer: (g,from,to,amount) => mutate(s => {
    safeAmount(amount);
    if (from===to) throw new Error('SAME_USER');
    const guild=ensureGuild(s,g), a=ensureUser(guild,from), b=ensureUser(guild,to);
    if (a.balance<amount) throw new Error('INSUFFICIENT_FUNDS');
    a.balance-=amount; b.balance+=amount;
    record(guild,'transfer_out',from,amount,to); record(guild,'transfer_in',to,amount,from);
    return { from:a.balance, to:b.balance };
  }),
  leaderboard: (g) => read(s => {
    const guild=ensureGuild(s,g);
    return Object.entries(guild.users).map(([id,u])=>({id,balance:u.balance,bank:u.bank,total:u.balance+u.bank,totalEarned:u.totalEarned||0}))
      .sort((a,b)=>b.total-a.total).slice(0,10);
  }),
  shop: (g) => read(s => ensureGuild(s,g).shop.map(x=>({...x}))),
  addItem: (g,item) => mutate(s => {
    const guild=ensureGuild(s,g);
    if (guild.shop.some(x=>x.id===item.id || x.name.toLowerCase()===item.name.toLowerCase())) throw new Error('ITEM_EXISTS');
    guild.shop.push(item); return item;
  }),
  removeItem: (g,id) => mutate(s => {
    const guild=ensureGuild(s,g), index=guild.shop.findIndex(x=>x.id===id);
    if(index<0) throw new Error('ITEM_NOT_FOUND');
    return guild.shop.splice(index,1)[0];
  }),
  buy: (g,u,id) => mutate(s => {
    const guild=ensureGuild(s,g), user=ensureUser(guild,u), item=guild.shop.find(x=>x.id===id);
    if(!item) throw new Error('ITEM_NOT_FOUND');
    if(user.balance<item.price) throw new Error('INSUFFICIENT_FUNDS');
    user.balance-=item.price; user.totalSpent=(user.totalSpent||0)+item.price; user.inventory.push({id:item.id,name:item.name,boughtAt:Date.now()});
    record(guild,'purchase',u,item.price,item.name);
    return {item,balance:user.balance};
  }),
  inventory: (g,u) => read(s => ensureUser(ensureGuild(s,g),u).inventory.map(x=>({...x}))),
  adminAdjust: (g,u,amount,mode) => mutate(s => {
    if (mode === 'set') { if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) throw new Error('INVALID_AMOUNT'); }
    else safeAmount(amount);
    const guild=ensureGuild(s,g), user=ensureUser(guild,u);
    if(mode==='add'){user.balance+=amount;user.totalEarned+=amount;}
    else if(mode==='remove'){if(user.balance<amount)throw new Error('INSUFFICIENT_FUNDS');user.balance-=amount;}
    else if(mode==='set'){user.balance=amount;}
    record(guild,'admin_'+mode,u,amount,'Administrator adjustment');
    return {balance:user.balance};
  }),
};
