'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'e77-store-settings-'));
process.env.E77_STORE_SETTINGS_FILE=path.join(dir,'settings.json');
const settings=require('../store-settings');
const guildId='12345678901234567';
test('store settings provide safe defaults per server',()=>{
 assert.deepEqual(settings.get(guildId),{
  categoryName:'E77 STORE • المتجر',salesName:'🛒・البيع',adminName:'🛡️・الإدارة',staffRoleId:null
 });
});
test('store settings persist names and staff role independently per server',()=>{
 const result=settings.update(guildId,{categoryName:'متجر E77',salesName:'الطلبات',staffRoleId:'22345678901234567'});
 assert.equal(result.categoryName,'متجر E77');
 assert.equal(settings.get(guildId).salesName,'الطلبات');
 assert.equal(settings.get('32345678901234567').categoryName,'E77 STORE • المتجر');
});
test('store settings reject blank names, malformed role IDs and unknown fields',()=>{
 assert.throws(()=>settings.update(guildId,{adminName:'   '}),{message:'INVALID_SETTING_VALUE'});
 assert.throws(()=>settings.update(guildId,{staffRoleId:'not-a-role'}),{message:'INVALID_SETTING_VALUE'});
 assert.throws(()=>settings.update(guildId,{unsafe:true}),{message:'UNKNOWN_SETTING'});
});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
