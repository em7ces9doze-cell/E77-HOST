'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {PermissionFlagsBits}=require('discord.js');
const {commands,ADMIN_ACTIONS}=require('../commands');
const byName=new Map(commands.map(x=>[x.name,x]));
test('E77 exposes four clear top-level command groups only',()=>{
 assert.deepEqual([...byName.keys()].sort(),['coins','e77-admin','help','hosting','store'].sort());
});
test('hosting group contains setup, panel and guide actions',()=>{
 const names=byName.get('hosting').options.map(x=>x.name);
 assert.deepEqual(names,['setup','panel','guide']);
});
test('store group separates customer and staff actions',()=>{
 const names=byName.get('store').options.map(x=>x.name);
 assert.deepEqual(names,['browse','buy','add','remove']);
 assert.ok(ADMIN_ACTIONS.has('store:add'));
 assert.ok(ADMIN_ACTIONS.has('store:remove'));
});
test('coin group keeps wallet actions together',()=>{
 const names=byName.get('coins').options.map(x=>x.name);
 assert.deepEqual(names,['balance','daily','work','transfer','deposit','withdraw','history','profile','leaderboard','inventory']);
});
test('admin group is Discord Administrator restricted',()=>{
 assert.equal(byName.get('e77-admin').default_member_permissions,PermissionFlagsBits.Administrator.toString());
 for(const name of ['hosting:setup','hosting:panel','store:add','store:remove'])assert.ok(ADMIN_ACTIONS.has(name));
});

test('help command is available as a top-level command',()=>{ assert.ok(byName.has('help')); });
