'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {Client,GatewayIntentBits,Partials,REST,Routes}=require('discord.js');
const {handleMessage,handleComponent}=require('./bank');
const PORT=Number(process.env.PORT||8080),TOKEN=process.env.DISCORD_TOKEN||process.env.BOT_TOKEN;
const PUBLIC_DIR=path.resolve(__dirname,'public');
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8'};
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent],partials:[Partials.Channel]});
const server=http.createServer((req,res)=>{
 const pathname=(req.url||'/').split('?')[0];
 if(pathname==='/health'){res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify({success:true,service:'Gulf Bank',status:client.isReady()?'online':'starting',world:'available'}));return;}
 let decoded;try{decoded=decodeURIComponent(pathname);}catch{res.writeHead(400);res.end('Bad Request');return;}
 const relative=decoded==='/'?'index.html':decoded.replace(/^[/]+/,''),root=decoded.startsWith('/assets/')?path.resolve(__dirname):PUBLIC_DIR,file=path.resolve(root,relative);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not Found');return;}
  const type=TYPES[path.extname(file).toLowerCase()]||'application/octet-stream';res.writeHead(200,{'content-type':type,'x-content-type-options':'nosniff','cache-control':path.extname(file)==='.html'?'no-cache':'public, max-age=300'});fs.createReadStream(file).pipe(res);
 });
});
server.listen(PORT,'0.0.0.0',()=>console.log('[HTTP] Gulf Bank web and health server on '+PORT));
async function clearLegacySlashCommands(){if(!TOKEN||!client.application?.id)return;const rest=new REST({version:'10'}).setToken(TOKEN);await rest.put(Routes.applicationCommands(client.application.id),{body:[]});const guildIds=[...client.guilds.cache.keys()];for(const id of guildIds)await rest.put(Routes.applicationGuildCommands(client.application.id,id),{body:[]});console.log('[COMMANDS] Cleared global and '+guildIds.length+' guild-specific slash command registrations.');}
client.once('clientReady',async()=>{console.log('[READY] Gulf Bank connected as '+client.user.tag);try{await clearLegacySlashCommands();}catch(e){console.error('[COMMANDS] Slash cleanup failed:',e?.code||e?.message||'UNKNOWN');}});
client.on('messageCreate',m=>{void handleMessage(m).catch(e=>console.error('[BANK] Message handler:',e?.code||e?.name||'UNKNOWN'));});
client.on('interactionCreate',i=>{if(!i.isButton()&&!i.isStringSelectMenu())return;void handleComponent(i).catch(async e=>{console.error('[BANK] Component handler:',e?.code||e?.name||'UNKNOWN');if(i.isRepliable()&&!i.replied&&!i.deferred)await i.reply({content:'تعذر تنفيذ العملية.',ephemeral:true}).catch(()=>{});});});
client.on('error',e=>console.error('[DISCORD] Client error:',e?.code||e?.name||'UNKNOWN'));
if(!TOKEN)console.error('[DISCORD] Missing DISCORD_TOKEN secret.');else client.login(TOKEN).catch(e=>{console.error('[DISCORD] Login failed:',e?.code||e?.name||'UNKNOWN');process.exitCode=1;});
let stopping=false;async function shutdown(signal){if(stopping)return;stopping=true;console.log('[SYSTEM] Shutdown: '+signal);client.destroy();server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();}
process.once('SIGINT',()=>void shutdown('SIGINT'));process.once('SIGTERM',()=>void shutdown('SIGTERM'));
