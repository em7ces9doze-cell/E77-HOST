'use strict';
const http = require('node:http');
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const { handleMessage, handleComponent } = require('./bank');
const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
const client = new Client({ intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent], partials:[Partials.Channel] });
const server=http.createServer((req,res)=>{if(req.url==='/'||req.url==='/health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({success:true,service:'Gulf Bank',status:client.isReady()?'online':'starting'}));return;}res.writeHead(404);res.end();});
server.listen(PORT,'0.0.0.0',()=>console.log('[HTTP] Gulf Bank health server on '+PORT));
async function clearLegacySlashCommands(){
 if(!TOKEN||!client.application?.id)return;
 const rest=new REST({version:'10'}).setToken(TOKEN);
 await rest.put(Routes.applicationCommands(client.application.id),{body:[]});
 const guildIds=[...client.guilds.cache.keys()];
 for(const id of guildIds) await rest.put(Routes.applicationGuildCommands(client.application.id,id),{body:[]});
 console.log('[COMMANDS] Cleared global and '+guildIds.length+' guild-specific slash command registrations.');
}
client.once('clientReady',async()=>{console.log('[READY] Gulf Bank connected as '+client.user.tag);try{await clearLegacySlashCommands();}catch(e){console.error('[COMMANDS] Slash cleanup failed:',e?.code||e?.message||'UNKNOWN');}});
client.on('messageCreate',m=>{void handleMessage(m).catch(e=>console.error('[BANK] Message handler:',e?.code||e?.name||'UNKNOWN'));});
client.on('interactionCreate',i=>{if(!i.isButton()&&!i.isStringSelectMenu())return;void handleComponent(i).catch(async e=>{console.error('[BANK] Component handler:',e?.code||e?.name||'UNKNOWN');if(i.isRepliable()&&!i.replied&&!i.deferred)await i.reply({content:'تعذر تنفيذ العملية.',ephemeral:true}).catch(()=>{});});});
client.on('error',e=>console.error('[DISCORD] Client error:',e?.code||e?.name||'UNKNOWN'));
if(!TOKEN)console.error('[DISCORD] Missing DISCORD_TOKEN secret.');else client.login(TOKEN).catch(e=>{console.error('[DISCORD] Login failed:',e?.code||e?.name||'UNKNOWN');process.exitCode=1;});
let stopping=false;async function shutdown(signal){if(stopping)return;stopping=true;console.log('[SYSTEM] Shutdown: '+signal);client.destroy();server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();}
process.once('SIGINT',()=>void shutdown('SIGINT'));process.once('SIGTERM',()=>void shutdown('SIGTERM'));
