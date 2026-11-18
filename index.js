require("dotenv").config();
const {Client,GatewayIntentBits,Partials,Events,EmbedBuilder,AttachmentBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder}=require("discord.js");
const fs=require("node:fs/promises"),path=require("node:path"),store=require("./src/store"),{render}=require("./src/render");
const token=process.env.DISCORD_TOKEN||process.env.BOT_TOKEN,prefix=process.env.PREFIX||"+",maxFrames=Number(process.env.MAX_FRAMES||80),maxImage=Number(process.env.MAX_IMAGE_BYTES||8388608),maxAudio=Number(process.env.MAX_AUDIO_BYTES||15728640);
const uploads=new Map(),busy=new Set();if(!token){console.error("[startup] Set DISCORD_TOKEN in host secrets.");process.exit(1);}
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent],partials:[Partials.Channel]});
const key=(g,u)=>(g||"dm")+":"+u;
const btn=(id,label,emoji,style=ButtonStyle.Secondary,disabled=false)=>new ButtonBuilder().setCustomId("sm:"+id).setLabel(label).setEmoji(emoji).setStyle(style).setDisabled(disabled);
function panel(p){const s=p?.settings||{fps:10,quality:720,aspect:"landscape"},count=p?.frames.length||0;return new EmbedBuilder().setColor(0x5865F2).setTitle("🎬 STOP MOTION STUDIO").setDescription(p?"استوديو صناعة أفلام الإيقاف الحركي. تحكم بمشروعك من هذه اللوحة.":"أنشئ مشروعك الأول ثم أضف الصور بالترتيب.").addFields({name:"المشروع",value:p?.name||"لا يوجد مشروع",inline:true},{name:"الإطارات",value:`${count}/${maxFrames}`,inline:true},{name:"إعدادات الفيديو",value:`${s.fps} FPS · ${s.quality}p · ${s.aspect}`}).setFooter({text:p?"Studio owner:"+p.ownerId:"افتح لوحة مشروعك"});}
function rows(p){const yes=!!p,frames=(p?.frames.length||0)>=2;return[
new ActionRowBuilder().addComponents(btn("create","مشروع جديد","🆕",ButtonStyle.Primary),btn("add","إضافة صور","🖼️",ButtonStyle.Success,!yes),btn("finish","إنهاء الرفع","✅",ButtonStyle.Secondary,!yes)),
new ActionRowBuilder().addComponents(btn("preview","معاينة","▶️",ButtonStyle.Secondary,!frames),btn("settings","إعدادات الفيديو","⚙️",ButtonStyle.Secondary,!yes),btn("delete-last","حذف آخر صورة","↩️",ButtonStyle.Danger,!p?.frames.length)),
new ActionRowBuilder().addComponents(btn("audio","الصوت والموسيقى","🎵",ButtonStyle.Secondary,!yes),btn("export","تصدير MP4","🎞️",ButtonStyle.Success,!frames),btn("projects","مشاريعي","📁")),
new ActionRowBuilder().addComponents(btn("help","شرح الاستخدام","❔"))
];}
function help(){return new EmbedBuilder().setColor(0x5865F2).setTitle("دليل الاستوديو").setDescription("اكتب `+add` لفتح لوحة التحكم.").addFields(
{name:"1. مشروع جديد",value:"اضغط زر مشروع جديد."},{name:"2. إضافة الصور",value:"اضغط إضافة صور ثم أرسل صورك كمرفقات في نفس القناة بالترتيب المطلوب."},{name:"3. إنهاء الرفع",value:"اكتب `+done` أو اضغط إنهاء الرفع."},{name:"4. الإعدادات",value:"اختر سرعة 6–24 FPS، جودة 480p أو 720p أو 1080p، وأبعاد أفقي أو عمودي أو مربع."},{name:"5. المعاينة والتصدير",value:"عاين أولًا ثم اضغط تصدير MP4."},{name:"الصوت",value:"اضغط الصوت والموسيقى ثم ارفع ملفًا صوتيًا واحدًا."},{name:"أوامر مختصرة",value:"`+add` اللوحة · `+help` المساعدة · `+done` إنهاء الرفع · `+cancel` إلغاء الاستقبال."},
{name:"الحدود",value:`حتى ${maxFrames} إطارًا، ${Math.round(maxImage/1048576)}MB لكل صورة، و${Math.round(maxAudio/1048576)}MB للصوت. تخضع الملفات لحدود Discord.`});}
async function download(a,d,max,types){if(!types.some(t=>(a.contentType||"").toLowerCase().startsWith(t)))throw Error("صيغة الملف غير مدعومة.");if(a.size>max)throw Error("حجم الملف أكبر من الحد المسموح.");const r=await fetch(a.url);if(!r.ok)throw Error("تعذر تنزيل المرفق من Discord.");const b=Buffer.from(await r.arrayBuffer());if(b.length>max)throw Error("حجم الملف تجاوز الحد.");await fs.writeFile(d,b,{flag:"wx"});}
async function sendRender(i,preview){const k=key(i.guildId,i.user.id);if(busy.has(k))return i.reply({content:"هناك تصدير جارٍ لمشروعك. انتظر حتى ينتهي.",ephemeral:true});const p=await store.get(i.guildId,i.user.id);if(!p||p.frames.length<2)return i.reply({content:"أضف إطارين على الأقل أولًا.",ephemeral:true});busy.add(k);await i.deferReply();try{const file=await render(p,preview);await i.editReply({content:preview?"معاينة الفيديو جاهزة:":"اكتمل تصدير فيلمك:",files:[new AttachmentBuilder(file,{name:preview?"preview.mp4":"stop-motion.mp4"})]});if(!preview)await store.exported(i.guildId,i.user.id);}catch(e){console.error("[render]",e);await i.editReply("فشل التصدير. تحقق من الصور أو خفّض الجودة وعد المحاولة.");}finally{busy.delete(k);}}
client.on(Events.MessageCreate,async m=>{if(m.author.bot)return;const k=key(m.guildId,m.author.id),session=uploads.get(k);
try{
if(session&&Date.now()-session.started>900000)uploads.delete(k);
else if(session&&m.attachments.size){const p=await store.get(m.guildId,m.author.id);if(!p){uploads.delete(k);await m.reply("انتهى المشروع. افتح +add وأنشئ مشروعًا.");return;}
if(session.kind==="audio"){const a=m.attachments.first(),ext=path.extname(a.name||"").toLowerCase()||".mp3",dest=store.audioPath(p.id,ext);await download(a,dest,maxAudio,["audio/"]);await store.setAudio(m.guildId,m.author.id,dest);uploads.delete(k);await m.reply("تم حفظ الصوت في المشروع.");return;}
let added=0;for(const a of m.attachments.values()){if(p.frames.length+added>=maxFrames)break;const mime=(a.contentType||"").split(";")[0].toLowerCase(),ext=({"image/jpeg":".jpg","image/png":".png","image/webp":".webp"})[mime];if(!ext){await m.reply("الصيغ المدعومة للصور هي JPG وPNG وWEBP فقط.");continue;}const dest=store.framePath(p.id,p.frames.length+added+1,ext);try{await download(a,dest,maxImage,["image/jpeg","image/png","image/webp"]);await store.add(m.guildId,m.author.id,dest);added++;}catch(e){await fs.unlink(dest).catch(()=>{});await m.reply(e.message);}}
const latest=await store.get(m.guildId,m.author.id);await m.reply(`تمت إضافة ${added} صورة. الإجمالي ${latest.frames.length}/${maxFrames}. أرسل المزيد أو اكتب +done.`);return;
}
if(!m.content.startsWith(prefix))return;const cmd=m.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
if(["add","studio","استوديو"].includes(cmd)){const p=await store.get(m.guildId,m.author.id);await m.reply({embeds:[panel(p)],components:rows(p)});}
else if(["help","مساعدة"].includes(cmd))await m.reply({embeds:[help()]});
else if(["done","تم"].includes(cmd)){uploads.delete(k);const p=await store.get(m.guildId,m.author.id);await m.reply(p?`انتهى رفع الصور. لديك ${p.frames.length} إطارًا.`:"لا يوجد مشروع نشط.");}
else if(["cancel","إلغاء"].includes(cmd)){uploads.delete(k);await m.reply("تم إيقاف استقبال الملفات.");}
}catch(e){console.error("[message]",e);await m.reply("حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى.").catch(()=>{});}
});
client.on(Events.InteractionCreate,async i=>{if(!i.isButton()&&!i.isStringSelectMenu())return;const [ns,action]=i.customId.split(":");if(ns!=="sm")return;const owner=i.message?.embeds?.[0]?.footer?.text?.match(/owner:(\d+)/)?.[1];if(owner&&owner!==i.user.id)return i.reply({content:"هذه لوحة مستخدم آخر. اكتب +add لفتح لوحتك.",ephemeral:true});const g=i.guildId,u=i.user.id,k=key(g,u);
try{
if(action==="create"){const p=await store.create(g,u);return i.update({embeds:[panel(p)],components:rows(p)});}
if(action==="add"){if(!await store.get(g,u))return i.reply({content:"أنشئ مشروعًا أولًا.",ephemeral:true});uploads.set(k,{kind:"frames",started:Date.now()});return i.reply({content:`ارفع صور JPG أو PNG أو WEBP هنا بالترتيب. الحد ${maxFrames} صورة. اكتب +done عند الانتهاء.`,ephemeral:true});}
if(action==="audio"){if(!await store.get(g,u))return i.reply({content:"أنشئ مشروعًا أولًا.",ephemeral:true});uploads.set(k,{kind:"audio",started:Date.now()});return i.reply({content:"ارفع ملفًا صوتيًا واحدًا في هذه القناة.",ephemeral:true});}
if(action==="finish"){uploads.delete(k);const p=await store.get(g,u);return i.update({embeds:[panel(p)],components:rows(p)});}
if(action==="preview")return sendRender(i,true);if(action==="export")return sendRender(i,false);
if(action==="help")return i.reply({embeds:[help()],ephemeral:true});
if(action==="delete-last"){const p=await store.removeLast(g,u);return i.update({embeds:[panel(p)],components:rows(p)});}
if(action==="projects"){const ps=await store.list(g,u);const desc=ps.length?ps.slice(0,10).map((p,n)=>`**${n+1}.** ${p.name} — ${p.frames.length} إطار — ${p.exports} تصدير`).join("\n"):"لا توجد مشاريع محفوظة.";return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("مشاريعي").setDescription(desc)],ephemeral:true});}
if(action==="settings"){const menu=new StringSelectMenuBuilder().setCustomId("sm:setting-value").setPlaceholder("اختر إعداد الفيديو").addOptions(
{label:"6 FPS",value:"fps:6"},{label:"8 FPS",value:"fps:8"},{label:"10 FPS",value:"fps:10"},{label:"12 FPS",value:"fps:12"},{label:"15 FPS",value:"fps:15"},{label:"24 FPS",value:"fps:24"},{label:"480p",value:"quality:480"},{label:"720p",value:"quality:720"},{label:"1080p",value:"quality:1080"},{label:"16:9 أفقي",value:"aspect:landscape"},{label:"9:16 عمودي",value:"aspect:portrait"},{label:"1:1 مربع",value:"aspect:square"});return i.reply({content:"اختر الإعداد:",components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});}
if(action==="setting-value"){const [f,v]=i.values[0].split(":");const p=await store.settings(g,u,f,v);return i.update({content:`تم الحفظ: ${p.settings.fps} FPS · ${p.settings.quality}p · ${p.settings.aspect}`,components:[]});}
}catch(e){console.error("[interaction]",e);const payload={content:"تعذر تنفيذ الإجراء. حاول مجددًا.",ephemeral:true};if(i.deferred||i.replied)await i.followUp(payload).catch(()=>{});else await i.reply(payload).catch(()=>{});}
});
client.once(Events.ClientReady,c=>console.log(`[ready] ${c.user.tag} · STOP MOTION STUDIO online`));
client.on(Events.Error,e=>console.error("[discord]",e));process.on("unhandledRejection",e=>console.error("[unhandledRejection]",e));
store.ensure().then(()=>client.login(token)).catch(e=>{console.error("[startup] Storage init failed",e);process.exit(1);});
