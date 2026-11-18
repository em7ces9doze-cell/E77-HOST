'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

test('token vault encrypts separated E77 references and customer app metadata',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'e77-vault-'));
 const file=path.join(dir,'vault.enc');
 const previous={file:process.env.E77_TOKEN_VAULT_FILE,key:process.env.E77_VAULT_ENCRYPTION_KEY,secret:process.env.E77_BOT_SECRET_E77_TEST_PRIMARY};
 process.env.E77_TOKEN_VAULT_FILE=file;
 process.env.E77_VAULT_ENCRYPTION_KEY='a'.repeat(64);
 process.env.E77_BOT_SECRET_E77_TEST_PRIMARY='test-secret-value-not-persisted';
 try{
  const vault=require('../token-vault');
  const owned=vault.addOwnedSecretReference({ref:'E77_TEST_PRIMARY',productId:'guard',actorId:'11111111111111111'});
  assert.equal(owned.status,'available');
  const customer=vault.addCustomerApp({applicationId:'22222222222222222',ownerId:'33333333333333333',guildId:'44444444444444444',actorId:'11111111111111111'});
  assert.equal(customer.status,'pending_install');
  assert.deepEqual(vault.counts(),{ownedTotal:1,ownedReady:1,ownedAssigned:0,customerApps:1,customerPending:1});
  const encrypted=fs.readFileSync(file,'utf8');
  assert.equal(encrypted.includes('E77_TEST_PRIMARY'),false);
  assert.equal(encrypted.includes('test-secret-value-not-persisted'),false);
  assert.equal(encrypted.includes('22222222222222222'),false);
  assert.equal(vault.listAudit(5).length,2);
  assert.throws(()=>vault.addOwnedSecretReference({ref:'E77_TEST_PRIMARY',productId:'guard',actorId:'11111111111111111'}),/E77_VAULT_DUPLICATE/);
 } finally {
  if(previous.file===undefined)delete process.env.E77_TOKEN_VAULT_FILE;else process.env.E77_TOKEN_VAULT_FILE=previous.file;
  if(previous.key===undefined)delete process.env.E77_VAULT_ENCRYPTION_KEY;else process.env.E77_VAULT_ENCRYPTION_KEY=previous.key;
  if(previous.secret===undefined)delete process.env.E77_BOT_SECRET_E77_TEST_PRIMARY;else process.env.E77_BOT_SECRET_E77_TEST_PRIMARY=previous.secret;
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
