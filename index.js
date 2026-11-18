require("dotenv").config();
const {Client,GatewayIntentBits,Partials,Events,EmbedBuilder,AttachmentBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle}=require("discord.js");
const fs=require("node:fs/promises"),path=require("node:path"),store=require("./src/store"),{render}=require("./src/render");
const token=process.env.DISCORD_TOKEN||process.env.BOT_TOKEN,prefix=process.env.PREFIX||"+",maxFrames=Number(process.env.MAX_FRAMES||80),maxImage=Number(process.env.MAX_IMAGE_BYTES||8388608),maxAudio=Number(process.env.MAX_AUDIO_BYTES||15728640);
const uploads=new Map(),busy=new Set();if(!token){console.error("[startup] Set DISCORD_TOKEN in host secrets.");process.exit(1);}
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent],partials:[Partials.Channel]});
const key=(g,u)=>(g||"dm")+":"+u;
const btn=(id,label,emoji,style=ButtonStyle.Secondary,disabled=false)=>new ButtonBuilder().setCustomId("sm:"+id).setLabel(label).setEmoji(emoji).setStyle(style).setDisabled(disabled);
function panel(p,status="جاهز لاستقبال أوامرك"){const s=p?.settings||{fps:10,quality:720,aspect:"landscape"},count=p?.frames.length||0,aspect={landscape:"16:9 أفقي",portrait:"9:16 عمودي",square:"1:1 مربع"}[s.aspect]||s.aspect;return new EmbedBuilder().setColor(0x5865F2).setTitle("🎬 STOP MOTION STUDIO").setDescription("لوحة التحكم الدائمة — نفّذ جميع عمليات الاستوديو من الأزرار أدناه. لن تحتاج إلى إعادة كتابة الأوامر لكل خطوة.").addFields({name:"المشروع النشط",value:p?.name||"لا يوجد مشروع",inline:true},{name:"الإطارات",value:`${count}/${maxFrames}`,inline:true},{name:"حالة الاستوديو",value:status,inline:true},{name:"سرعة الفيديو",value:`${s.fps} FPS`,inline:true},{name:"الدقة",value:`${s.quality}p`,inline:true},{name:"نسبة العرض",value:aspect,inline:true},{name:"الصوت",value:p?.audio?"مضاف":"بدون صوت",inline:true},{name:"التصدير",value:String(p?.exports||0),inline:true}).setFooter({text:p?"Studio owner:"+p.ownerId:"افتح لوحة مشروعك"}).setTimestamp();}
function rows(p){const yes=!!p,frames=(p?.frames.length||0)>=2;return[
new ActionRowBuilder().addComponents(btn("create","مشروع جديد","🆕",ButtonStyle.Primary),btn("add","إضافة صور","🖼️",ButtonStyle.Success,!yes),btn("finish","إنهاء الرفع","✅",ButtonStyle.Secondary,!yes)),
new ActionRowBuilder().addComponents(btn("preview","معاينة","▶️",ButtonStyle.Secondary,!frames),btn("settings","إعدادات الفيديو","⚙️",ButtonStyle.Secondary,!yes),btn("delete-last","حذف آخر إطار","↩️",ButtonStyle.Danger,!p?.frames.length)),
new ActionRowBuilder().addComponents(btn("audio","الصوت والموسيقى","🎵",ButtonStyle.Secondary,!yes),btn("export","تصدير MP4","🎞️",ButtonStyle.Success,!frames),btn("projects","مشاريعي","📁")),
new ActionRowBuilder().addComponents(btn("rename","تسمية المشروع","✏️",ButtonStyle.Secondary,!yes),btn("remove-frame","حذف إطار برقم","🗑️",ButtonStyle.Danger,!p?.frames.length)),
new ActionRowBuilder().addComponents(btn("help","شرح الاستخدام","❔"))
];}
function settingsRows(p){const s=p.settings;const menu=(id,placeholder,items,current)=>new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("sm:"+id).setPlaceholder(placeholder).addOptions(items.map(([label,value])=>({label,value,default:String(current)===value}))));return[
menu("set-fps","سرعة الفيديو — FPS",[[6,"6"],[8,"8"],[10,"10"],[12,"12"],[15,"15"],[24,"24"],[30,"30"]].map(([n,v])=>[`${n} FPS`,v]),s.fps),
menu("set-quality","دقة الفيديو",[[480,"480"],[720,"720"],[1080,"1080"]].map(([n,v])=>[`${n}p`,v]),s.quality),
menu("set-aspect","نسبة العرض",[["16:9 — أفقي","landscape"],["9:16 — عمودي","portrait"],["1:1 — مربع","square"]],s.aspect)
];}
function help(){return new EmbedBuilder().setColor(0x5865F2).setTitle("دليل STOP MOTION STUDIO").setDescription("ابدأ من لوحة التحكم الثابتة باستخدام `+add` أو `+panel`.").addFields(
{name:"إنشاء ورفع",value:"أنشئ مشروعًا، اضغط إضافة صور، ثم أرسل الصور كمرفقات في القناة بالترتيب. اضغط إنهاء الرفع عند الانتهاء."},
{name:"إعدادات مستقلة",value:"حدد FPS من 6 إلى 30، والدقة 480p/720p/1080p، ونسبة العرض أفقي 16:9 أو عمودي 9:16 أو مربع 1:1."},
{name:"إدارة المشروع",value:"سمّ المشروع، احذف إطارًا محددًا برقم ترتيبه، احذف آخر إطار، أو انتقل بين مشاريعك المحفوظة."},
{name:"المعاينة والتصدير",value:"عاين الفيديو قبل التصدير إلى MP4. يمكن إضافة ملف صوتي واحد للمشروع."},
{name:"الأوامر",value:"`+add` أو `+panel` اللوحة · `+help` المساعدة · `+done` إنهاء الرفع · `+cancel` إيقاف استقبال الملفات."},
{name:"الحدود",value:`حتى ${maxFrames} إطارًا، ${Math.round(maxImage/1048576)}MB لكل صورة، و${Math.round(maxAudio/1048576)}MB للصوت. تخضع الملفات لحدود Discord.`});}
async function boardMessage(channel,g,u){const id=await store.getDashboard(g,u,channel.id);if(!id)return null;try{return await channel.messages.fetch(id);}catch{return null;}}
async function refreshBoard(g,u,channel,status){try{const p=await store.get(g,u),msg=await boardMessage(channel,g,u);if(msg)await msg.edit({embeds:[panel(p,status)],components:rows(p)});}catch(e){console.error("[dashboard]",e);}}
async function openBoard(m){const p=await store.get(m.guildId,m.author.id);let msg=await boardMessage(m.channel,m.guildId,m.author.id);const payload={embeds:[panel(p)],components:rows(p)};if(msg)await msg.edit(payload);else{msg=await m.channel.send(payload);await store.setDashboard(m.guildId,m.author.id,m.channel.id,msg.id);}return msg;}
async function download(a,d,max,types){if(!types.some(t=>(a.contentType||"").toLowerCase().startsWith(t)))throw Error("صيغة الملف غير مدعومة.");if(a.size>max)throw Error("حجم الملف أكبر من الحد المسموح.");const r=await fetch(a.url);if(!r.ok)throw Error("تعذر تنزيل المرفق من Discord.");const b=Buffer.from(await r.arrayBuffer());if(b.length>max)throw Error("حجم الملف تجاوز الحد.");await fs.writeFile(d,b,{flag:"wx"});}
async function sendRender(i,preview){const k=key(i.guildId,i.user.id);if(busy.has(k))return i.reply({content:"هناك تصدير جارٍ لمشروعك. انتظر حتى ينتهي.",ephemeral:true});const p=await store.get(i.guildId,i.user.id);if(!p||p.frames.length<2)return i.reply({content:"أضف إطارين على الأقل أولًا.",ephemeral:true});busy.add(k);await i.deferReply();try{const file=await render(p,preview);await i.editReply({content:preview?"معاينة الفيديو جاهزة:":"اكتمل تصدير فيلمك:",files:[new AttachmentBuilder(file,{name:preview?"preview.mp4":"stop-motion.mp4"})]});if(!preview)await store.exported(i.guildId,i.user.id);await refreshBoard(i.guildId,i.user.id,i.channel,preview?"اكتملت المعاينة":"اكتمل التصدير بنجاح");}catch(e){console.error("[render]",e);await i.editReply("فشل التصدير. تحقق من الصور أو خفّض الجودة وعد المحاولة.");await refreshBoard(i.guildId,i.user.id,i.channel,"فشل التصدير — راجع السجل أو جرّب جودة أقل");}finally{busy.delete(k);}}
client.on(Events.MessageCreate,async m=>{if(m.author.bot)return;const k=key(m.guildId,m.author.id),session=uploads.get(k);
try{
if(session&&Date.now()-session.started>900000)uploads.delete(k);
else if(session&&m.attachments.size){const p=await store.get(m.guildId,m.author.id);if(!p){uploads.delete(k);await m.reply("انتهى المشروع. افتح +add وأنشئ مشروعًا.");return;}
if(session.kind==="audio"){const a=m.attachments.first(),ext=path.extname(a.name||"").toLowerCase()||".mp3",dest=store.audioPath(p.id,ext);await download(a,dest,maxAudio,["audio/"]);await store.setAudio(m.guildId,m.author.id,dest);uploads.delete(k);await refreshBoard(m.guildId,m.author.id,m.channel,"تم حفظ الملف الصوتي");return;}
let added=0;for(const a of m.attachments.values()){if(p.frames.length+added>=maxFrames)break;const mime=(a.contentType||"").split(";")[0].toLowerCase(),ext=({"image/jpeg":".jpg","image/png":".png","image/webp":".webp"})[mime];if(!ext)continue;const dest=store.framePath(p.id,p.frames.length+added+1,ext);try{await download(a,dest,maxImage,["image/jpeg","image/png","image/webp"]);await store.add(m.guildId,m.author.id,dest);added++;}catch(e){await fs.unlink(dest).catch(()=>{});console.error("[upload]",e.message);}}
const latest=await store.get(m.guildId,m.author.id);await refreshBoard(m.guildId,m.author.id,m.channel,`تمت إضافة ${added} إطار — الإجمالي ${latest.frames.length}/${maxFrames}`);return;
}
if(!m.content.startsWith(prefix))return;const cmd=m.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
if(["add","panel","studio","استوديو","لوحة"].includes(cmd))await openBoard(m);
else if(["help","مساعدة"].includes(cmd))await m.reply({embeds:[help()]});
else if(["done","تم"].includes(cmd)){uploads.delete(k);const p=await store.get(m.guildId,m.author.id);await refreshBoard(m.guildId,m.author.id,m.channel,p?`انتهى الرفع — ${p.frames.length} إطار`:"لا يوجد مشروع نشط");}
else if(["cancel","إلغاء"].includes(cmd)){uploads.delete(k);await refreshBoard(m.guildId,m.author.id,m.channel,"تم إيقاف استقبال الملفات");}
}catch(e){console.error("[message]",e);await m.reply("حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى.").catch(()=>{});}
});
client.on(Events.InteractionCreate,async i=>{if(!i.isButton()&&!i.isStringSelectMenu()&&!i.isModalSubmit())return;const [ns,action]=i.customId.split(":");if(ns!=="sm")return;const owner=i.message?.embeds?.[0]?.footer?.text?.match(/owner:(\d+)/)?.[1];if(owner&&owner!==i.user.id)return i.reply({content:"هذه لوحة مستخدم آخر. اكتب +panel لفتح لوحتك.",ephemeral:true});const g=i.guildId,u=i.user.id,k=key(g,u);
try{
if(i.isModalSubmit()){
if(action==="rename-submit"){const name=i.fields.getTextInputValue("project-name").trim();const p=await store.rename(g,u,name);await refreshBoard(g,u,i.channel,"تم تحديث اسم المشروع");return i.reply({content:`تم تغيير اسم المشروع إلى: **${p.name}**`,ephemeral:true});}
if(action==="remove-frame-submit"){const n=Number(i.fields.getTextInputValue("frame-number"));const p=await store.removeFrame(g,u,n);await refreshBoard(g,u,i.channel,`تم حذف الإطار رقم ${n}`);return i.reply({content:`تم حذف الإطار رقم ${n}. المتبقي ${p.frames.length} إطار.`,ephemeral:true});}
}
if(action==="create"){const p=await store.create(g,u);return i.update({embeds:[panel(p,"تم إنشاء مشروع جديد")],components:rows(p)});}
if(action==="add"){if(!await store.get(g,u))return i.reply({content:"أنشئ مشروعًا أولًا.",ephemeral:true});uploads.set(k,{kind:"frames",started:Date.now()});await refreshBoard(g,u,i.channel,"بانتظار رفع الصور — أرسلها بالترتيب");return i.reply({content:`أرسل صور JPG أو PNG أو WEBP في هذه القناة بالترتيب. الحد ${maxFrames} صورة. اضغط إنهاء الرفع عند الانتهاء.`,ephemeral:true});}
if(action==="audio"){if(!await store.get(g,u))return i.reply({content:"أنشئ مشروعًا أولًا.",ephemeral:true});uploads.set(k,{kind:"audio",started:Date.now()});return i.reply({content:"أرسل ملفًا صوتيًا واحدًا في هذه القناة.",ephemeral:true});}
if(action==="finish"){uploads.delete(k);const p=await store.get(g,u);return i.update({embeds:[panel(p,"تم إنهاء استقبال الملفات")],components:rows(p)});}
if(action==="preview")return sendRender(i,true);if(action==="export")return sendRender(i,false);
if(action==="help")return i.reply({embeds:[help()],ephemeral:true});
if(action==="delete-last"){const p=await store.removeLast(g,u);return i.update({embeds:[panel(p,"تم حذف آخر إطار")],components:rows(p)});}
if(action==="rename"){const modal=new ModalBuilder().setCustomId("sm:rename-submit").setTitle("تسمية المشروع").addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("project-name").setLabel("اسم المشروع").setStyle(TextInputStyle.Short).setMaxLength(60).setRequired(true)));return i.showModal(modal);}
if(action==="remove-frame"){const modal=new ModalBuilder().setCustomId("sm:remove-frame-submit").setTitle("حذف إطار محدد").addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("frame-number").setLabel("رقم الإطار المراد حذفه").setPlaceholder("مثال: 3").setStyle(TextInputStyle.Short).setMaxLength(4).setRequired(true)));return i.showModal(modal);}
if(action==="projects"){const ps=await store.list(g,u);if(!ps.length)return i.reply({content:"لا توجد مشاريع محفوظة حتى الآن.",ephemeral:true});const menu=new StringSelectMenuBuilder().setCustomId("sm:project-select").setPlaceholder("اختر المشروع الذي تريد فتحه").addOptions(ps.slice(0,25).map(p=>({label:p.name.slice(0,100),description:`${p.frames.length} إطار · ${p.exports} تصدير`.slice(0,100),value:p.id,default:(await store.get(g,u))?.id===p.id})));return i.reply({content:"اختر مشروعًا للتبديل إليه:",components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});}
if(action==="project-select"){const p=await store.activate(g,u,i.values[0]);await refreshBoard(g,u,i.channel,"تم فتح المشروع المحدد");return i.update({content:`المشروع النشط الآن: **${p.name}**`,components:[]});}
if(action==="settings"){const p=await store.get(g,u);return i.reply({content:`إعدادات مشروع **${p.name}** — اختر كل إعداد من قائمته المستقلة:`,components:settingsRows(p),ephemeral:true});}
if(["set-fps","set-quality","set-aspect"].includes(action)){const field={"set-fps":"fps","set-quality":"quality","set-aspect":"aspect"}[action],p=await store.settings(g,u,field,i.values[0]);await refreshBoard(g,u,i.channel,"تم حفظ إعدادات الفيديو");return i.update({content:`تم الحفظ بنجاح. الإعدادات الحالية: **${p.settings.fps} FPS · ${p.settings.quality}p · ${({landscape:"16:9 أفقي",portrait:"9:16 عمودي",square:"1:1 مربع"})[p.settings.aspect]}**`,components:settingsRows(p)});}
}catch(e){console.error("[interaction]",e);const payload={content:"تعذر تنفيذ الإجراء. تحقق من المدخلات وحاول مجددًا.",ephemeral:true};if(i.deferred||i.replied)await i.followUp(payload).catch(()=>{});else await i.reply(payload).catch(()=>{});}
});
client.once(Events.ClientReady,c=>console.log(`[ready] ${c.user.tag} · STOP MOTION STUDIO online`));
client.on(Events.Error,e=>console.error("[discord]",e));process.on("unhandledRejection",e=>console.error("[unhandledRejection]",e));
store.ensure().then(()=>client.login(token)).catch(e=>{console.error("[startup] Storage init failed",e);process.exit(1);});
