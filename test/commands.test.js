'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {PermissionFlagsBits}=require('discord.js');
const {commands,ADMIN_ACTIONS,executeCommand}=require('../commands');
const byName=new Map(commands.map(x=>[x.name,x]));
test('E77 exposes four clear top-level command groups only',()=>{
 assert.deepEqual([...byName.keys()].sort(),['coins','e77-admin','hosting','store'].sort());
});
test('hosting group contains setup, panel and guide actions',()=>{
 const names=byName.get('hosting').options.map(x=>x.name);
 assert.deepEqual(names,['setup','panel','guide','help']);
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

test('help is grouped under hosting rather than a separate top-level command',()=>{ assert.ok(byName.get('hosting').options.some(x=>x.name==='help')); });

test('legacy help command works without a subcommand',async()=>{
 let payload;
 const interaction={commandName:'help',user:{id:'u1'},guildId:'g1',inGuild:()=>true,
  options:{getSubcommand(required){assert.equal(required,false);return null;}},
  editReply:async value=>(payload=value)};
 await executeCommand(interaction);
 assert.ok(payload.embeds[0].data.title.includes('دليل E77 HOST'));
});
test('legacy ping command works without a subcommand',async()=>{
 let payload;
 const interaction={commandName:'ping',user:{id:'u1'},guildId:'g1',inGuild:()=>true,
  options:{getSubcommand(required){assert.equal(required,false);return null;}},
  editReply:async value=>(payload=value)};
 await executeCommand(interaction);
 assert.match(payload.content,/Pong/);
});
test('unknown root command without a subcommand returns a safe response',async()=>{
 let payload;
 const interaction={commandName:'old-command',user:{id:'u1'},guildId:'g1',inGuild:()=>true,
  options:{getSubcommand:()=>null},editReply:async value=>(payload=value)};
 await executeCommand(interaction);
 assert.match(payload.content,/يحتاج اختيار إجراء/);
});
