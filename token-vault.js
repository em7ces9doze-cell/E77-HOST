'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const FILE=path.resolve(process.env.E77_TOKEN_VAULT_FILE||path.join(process.cwd(),'data','token-vault.enc'));
function key(){
 const value=process.env.E77_VAULT_ENCRYPTION_KEY||'';
 if(!/^[a-f0-9]{64}$/i.test(value))throw new Error('E77_VAULT_KEY_NOT_CONFIGURED');
 return Buffer.from(value,'hex');
}
function empty(){return {version:1,owned:[],customerApps:[],audit:[]};}
function read(){
 try{
  const packed=JSON.parse(fs.readFileSync(FILE,'utf8'));
  if(packed.version!==1||!packed.iv||!packed.tag||!packed.data)throw new Error('E77_VAULT_FORMAT_INVALID');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(packed.iv,'base64'));
  decipher.setAuthTag(Buffer.from(packed.tag,'base64'));
  const raw=Buffer.concat([decipher.update(Buffer.from(packed.data,'base64')),decipher.final()]);
  const state=JSON.parse(raw.toString('utf8'));
  if(state.version!==1||!Array.isArray(state.owned)||!Array.isArray(state.customerApps)||!Array.isArray(state.audit))throw new Error('E77_VAULT_SCHEMA_INVALID');
  return state;
 }catch(e){if(e.code==='ENOENT')return empty();throw e;}
}
function write(state){
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
 const data=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(state),'utf8')),cipher.final()]);
 const packed=JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')});
 fs.mkdirSync(path.dirname(FILE),{recursive:true,mode:0o700});
 const tmp=FILE+'.'+process.pid+'.tmp';
 fs.writeFileSync(tmp,packed,{mode:0o600,flag:'w'});
 fs.renameSync(tmp,FILE);
}
function audit(state,action,actorId,ref){state.audit.unshift({action,actorId:String(actorId),ref:String(ref||''),at:Date.now()});state.audit=state.audit.slice(0,200);}
function counts(){
 const s=read();
 return {ownedTotal:s.owned.length,ownedReady:s.owned.filter(x=>x.status==='available').length,ownedAssigned:s.owned.filter(x=>x.status==='assigned').length,customerApps:s.customerApps.length,customerPending:s.customerApps.filter(x=>x.status==='pending_install').length};
}
function addOwnedSecretReference({ref,productId,actorId}){
 const id=String(ref||'').trim().toUpperCase();
 if(!/^[A-Z0-9_]{3,48}$/.test(id))throw new Error('E77_VAULT_INVALID_SECRET_REF');
 const envName='E77_BOT_SECRET_'+id;
 if(!process.env[envName])throw new Error('E77_VAULT_SECRET_MISSING');
 const s=read();
 if(s.owned.some(x=>x.secretRef===id))throw new Error('E77_VAULT_DUPLICATE');
 const row={id:crypto.randomUUID(),secretRef:id,productId:String(productId||'general').trim().toLowerCase(),status:'available',createdAt:Date.now()};
 s.owned.push(row);audit(s,'owned_secret_reference_added',actorId,id);write(s);
 return {id:row.id,secretRef:id,productId:row.productId,status:row.status};
}
function addCustomerApp({applicationId,ownerId,guildId,actorId}){
 for(const v of [applicationId,ownerId,guildId])if(!/^\d{17,20}$/.test(String(v||'')))throw new Error('E77_VAULT_INVALID_DISCORD_ID');
 const s=read();
 if(s.customerApps.some(x=>x.applicationId===String(applicationId)))throw new Error('E77_VAULT_CUSTOMER_APP_EXISTS');
 const row={id:crypto.randomUUID(),applicationId:String(applicationId),ownerId:String(ownerId),guildId:String(guildId),status:'pending_install',createdAt:Date.now()};
 s.customerApps.push(row);audit(s,'customer_app_registered',actorId,applicationId);write(s);
 return {...row};
}
function listAudit(limit=10){return read().audit.slice(0,Math.max(1,Math.min(25,limit))).map(x=>({...x}));}
module.exports={counts,addOwnedSecretReference,addCustomerApp,listAudit};
