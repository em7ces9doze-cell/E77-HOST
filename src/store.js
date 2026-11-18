"use strict";
const fs=require("node:fs/promises"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(process.env.STUDIO_DATA_DIR||"data"),projectsDir=path.join(root,"projects"),db=path.join(root,"studio.json");
let state={version:2,projects:{},active:{},dashboards:{}},queue=Promise.resolve();
async function ensure(){await fs.mkdir(projectsDir,{recursive:true});try{const x=JSON.parse(await fs.readFile(db,"utf8"));if(x&&[1,2].includes(x.version)){state={version:2,projects:x.projects||{},active:x.active||{},dashboards:x.dashboards||{}};}}catch(e){if(e.code!=="ENOENT")throw e;}await persist();}
function persist(){queue=queue.then(async()=>{const tmp=db+"."+process.pid+".tmp";await fs.writeFile(tmp,JSON.stringify(state,null,2));await fs.rename(tmp,db);});return queue;}
const key=(g,u)=>(g||"dm")+":"+u,boardKey=(g,u,c)=>key(g,u)+":"+c,active=(g,u)=>state.projects[state.active[key(g,u)]]||null,dir=id=>path.join(projectsDir,id);
function framePath(id,n,ext){return path.join(dir(id),"frame-"+String(n).padStart(4,"0")+"-"+crypto.randomBytes(4).toString("hex")+ext);}
function audioPath(id,ext){return path.join(dir(id),"audio"+ext);}
async function create(g,u,name){const id=crypto.randomUUID(),now=new Date().toISOString(),p={id,guildId:g||"dm",ownerId:u,name:String(name||"مشروعي الجديد").trim().slice(0,60),createdAt:now,updatedAt:now,frames:[],audio:null,exports:0,settings:{fps:10,quality:720,aspect:"landscape"}};await fs.mkdir(dir(id),{recursive:true});state.projects[id]=p;state.active[key(g,u)]=id;await persist();return structuredClone(p);}
async function get(g,u){const p=active(g,u);return p?structuredClone(p):null;}
async function add(g,u,file){const p=active(g,u);if(!p)throw Error("No active project");p.frames.push({path:file,durationSec:null});p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function removeLast(g,u){const p=active(g,u);if(!p?.frames.length)throw Error("No frames");const f=p.frames.pop();await fs.unlink(f.path).catch(()=>{});p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function removeFrame(g,u,n){const p=active(g,u);if(!p||!Number.isInteger(n)||n<1||n>p.frames.length)throw Error("Invalid frame number");const [f]=p.frames.splice(n-1,1);await fs.unlink(f.path).catch(()=>{});p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function moveFrame(g,u,from,to){const p=active(g,u);if(!p||!Number.isInteger(from)||!Number.isInteger(to)||from<1||to>p.frames.length||to<1||from>p.frames.length)throw Error("Invalid frame position");const [f]=p.frames.splice(from-1,1);p.frames.splice(to-1,0,f);p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function setFrameDuration(g,u,n,seconds){const p=active(g,u);if(!p||!Number.isInteger(n)||n<1||n>p.frames.length||!Number.isFinite(seconds)||seconds<0.05||seconds>5)throw Error("Invalid frame duration");p.frames[n-1].durationSec=seconds;p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function rename(g,u,name){const p=active(g,u);name=String(name||"").trim();if(!p||!name||name.length>60)throw Error("Invalid project name");p.name=name;p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function activate(g,u,id){const p=state.projects[id];if(!p||p.ownerId!==u||p.guildId!==(g||"dm"))throw Error("Project not found");state.active[key(g,u)]=id;await persist();return structuredClone(p);}
async function deleteActive(g,u){const p=active(g,u);if(!p)throw Error("No active project");await fs.rm(dir(p.id),{recursive:true,force:true});delete state.projects[p.id];delete state.active[key(g,u)];await persist();return p.name;}
async function setAudio(g,u,file){const p=active(g,u);if(!p)throw Error("No active project");if(p.audio)await fs.unlink(p.audio).catch(()=>{});p.audio=file;p.updatedAt=new Date().toISOString();await persist();}
async function settings(g,u,f,v){const p=active(g,u),valid={fps:[6,8,10,12,15,24,30],quality:[480,720,1080],aspect:["landscape","portrait","square"]};if(!p||!valid[f]||!valid[f].includes(f==="aspect"?v:Number(v)))throw Error("Invalid setting");p.settings[f]=f==="aspect"?v:Number(v);p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function list(g,u){return Object.values(state.projects).filter(p=>p.guildId===(g||"dm")&&p.ownerId===u).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(p=>structuredClone(p));}
async function exported(g,u){const p=active(g,u);if(p){p.exports++;await persist();}}
async function getDashboard(g,u,c){return state.dashboards[boardKey(g,u,c)]||null;}
async function setDashboard(g,u,c,id){state.dashboards[boardKey(g,u,c)]=id;await persist();}
module.exports={ensure,persist,create,get,add,removeLast,removeFrame,moveFrame,setFrameDuration,rename,activate,deleteActive,setAudio,settings,list,exported,framePath,audioPath,getDashboard,setDashboard};
