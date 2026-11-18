'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {PermissionFlagsBits}=require('discord.js');
const {commands,ADMIN_ACTIONS,executeCommand,storeEntryRow,productSelectRow,planSelectRow,orderModal}=require('../commands');
const byName=new Map(commands.map(x=>[x.name,x]));
test('E77 exposes five clear top-level command groups',()=>{
 assert.deepEqual([...byName.keys()].sort(),['coins','e77-admin','hosting','store','token','رومات'].sort());
});
test('store rooms command exposes administrator-only setup and settings',()=>{
 const roomCommand=byName.get('رومات');
 assert.equal(roomCommand.default_member_permissions,PermissionFlagsBits.Administrator.toString());
 assert.deepEqual(roomCommand.options.map(x=>x.name),['setup','settings']);
 assert.deepEqual(roomCommand.options[1].options.map(x=>x.name),['category_name','sales_name','admin_name','staff_role']);
 assert.ok(ADMIN_ACTIONS.has('رومات:setup'));
 assert.ok(ADMIN_ACTIONS.has('رومات:settings'));
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

test('interactive store panel exposes a catalog button and all 24 products',()=>{
 const entry=storeEntryRow().toJSON();
 assert.equal(entry.components[0].custom_id,'e77:catalog');
 const products=productSelectRow().toJSON().components[0];
 assert.equal(products.custom_id,'e77:product');
 assert.equal(products.options.length,24);
});
test('interactive store offers all five plans and collects safe order identity fields',()=>{
 const plans=planSelectRow('guard').toJSON().components[0];
 assert.equal(plans.custom_id,'e77:plan:guard');
 assert.equal(plans.options.length,5);
 const modal=orderModal('guard','7d').toJSON();
 assert.equal(modal.custom_id,'e77:order:guard:7d');
 assert.deepEqual(modal.components.map(row=>row.components[0].custom_id),['bot_name','bot_username','guild_id']);
});

test('token vault command is administrator-only and creates a setup action',()=>{
 const command=byName.get('token');
 assert.equal(command.default_member_permissions,PermissionFlagsBits.Administrator.toString());
 assert.deepEqual(command.options.map(x=>x.name),['setup']);
 assert.ok(ADMIN_ACTIONS.has('token:setup'));
 const row=require('../commands').tokenVaultRow().toJSON();
 assert.deepEqual(row.components.map(x=>x.custom_id),['token:counts','token:add-owned','token:add-customer','token:audit']);
});
