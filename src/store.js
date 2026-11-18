"use strict";
const fs=require("node:fs/promises"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(process.env.STUDIO_DATA_DIR||"data"),projectsDir=path.join(root,"projects"),db=path.join(root,"studio.json");
let state={version:1,projects:{},active:{}},queue=Promise.resolve();
async function ensure(){await fs.mkdir(projectsDir,{recursive:true});try{const x=JSON.parse(await fs.readFile(db,"utf8"));if(x.version===1)state=x;}catch(e){if(e.code!=="ENOENT")throw e;}}
function persist(){queue=queue.then(async()=>{const tmp=db+"."+process.pid+".tmp";await fs.writeFile(tmp,JSON.stringify(state,null,2));await fs.rename(tmp,db);});return queue;}
const key=(g,u)=>(g||"dm")+":"+u,active=(g,u)=>state.projects[state.active[key(g,u)]]||null,dir=id=>path.join(projectsDir,id);
function framePath(id,n,ext){return path.join(dir(id),"frame-"+String(n).padStart(4,"0")+ext);}
function audioPath(id,ext){return path.join(dir(id),"audio"+ext);}
async function create(g,u){const id=crypto.randomUUID(),now=new Date().toISOString(),p={id,guildId:g||"dm",ownerId:u,name:"مشروعي الجديد",createdAt:now,updatedAt:now,frames:[],audio:null,exports:0,settings:{fps:10,quality:720,aspect:"landscape"}};await fs.mkdir(dir(id),{recursive:true});state.projects[id]=p;state.active[key(g,u)]=id;await persist();return structuredClone(p);}
async function get(g,u){const p=active(g,u);return p?structuredClone(p):null;}
async function add(g,u,file){const p=active(g,u);if(!p)throw Error("No active project");p.frames.push({path:file});p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function removeLast(g,u){const p=active(g,u);if(!p?.frames.length)throw Error("No frames");const f=p.frames.pop();await fs.unlink(f.path).catch(()=>{});p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function setAudio(g,u,file){const p=active(g,u);if(!p)throw Error("No active project");if(p.audio)await fs.unlink(p.audio).catch(()=>{});p.audio=file;p.updatedAt=new Date().toISOString();await persist();}
async function settings(g,u,f,v){const p=active(g,u),valid={fps:[6,8,10,12,15,24],quality:[480,720,1080],aspect:["landscape","portrait","square"]};if(!p||!valid[f]||!valid[f].includes(f==="aspect"?v:Number(v)))throw Error("Invalid setting");p.settings[f]=f==="aspect"?v:Number(v);p.updatedAt=new Date().toISOString();await persist();return structuredClone(p);}
async function list(g,u){return Object.values(state.projects).filter(p=>p.guildId===(g||"dm")&&p.ownerId===u).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(structuredClone);}
async function exported(g,u){const p=active(g,u);if(p){p.exports++;await persist();}}
module.exports={ensure,persist,create,get,add,removeLast,setAudio,settings,list,exported,framePath,audioPath};
