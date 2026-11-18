'use strict';
const {SlashCommandBuilder,EmbedBuilder,PermissionFlagsBits,ChannelType}=require('discord.js');
const economy=require('./economy-store');
const ADMIN=PermissionFlagsBits.Administrator;
const commands=[
 new SlashCommandBuilder().setName('hosting').setDescription('مركز خدمات الاستضافة')
  .addSubcommand(s=>s.setName('setup').setDescription('إنشاء قسم ولوحة الاستضافة'))
  .addSubcommand(s=>s.setName('panel').setDescription('نشر لوحة الاستضافة في روم').addChannelOption(o=>o.setName('channel').setDescription('الروم').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(s=>s.setName('guide').setDescription('دليل طلب الاستضافة')),
 new SlashCommandBuilder().setName('store').setDescription('باقات وخدمات E77 HOST')
  .addSubcommand(s=>s.setName('browse').setDescription('عرض الباقات'))
  .addSubcommand(s=>s.setName('buy').setDescription('شراء باقة أو خدمة').addStringOption(o=>o.setName('item_id').setDescription('معرف المنتج').setRequired(true)))
  .addSubcommand(s=>s.setName('add').setDescription('إضافة منتج للإدارة').addStringOption(o=>o.setName('item_id').setDescription('معرف فريد').setMinLength(2).setMaxLength(32).setRequired(true)).addStringOption(o=>o.setName('name').setDescription('الاسم').setMaxLength(80).setRequired(true)).addIntegerOption(o=>o.setName('price').setDescription('السعر بعملة E77').setMinValue(1).setMaxValue(1000000000).setRequired(true)).addStringOption(o=>o.setName('kind').setDescription('نوع المنتج').setRequired(true).addChoices({name:'استضافة',value:'hosting'},{name:'خدمة رقمية',value:'service'})).addStringOption(o=>o.setName('description').setDescription('الوصف').setMaxLength(180)))
  .addSubcommand(s=>s.setName('remove').setDescription('حذف منتج').addStringOption(o=>o.setName('item_id').setDescription('معرف المنتج').setRequired(true))),
 new SlashCommandBuilder().setName('coins').setDescription('محفظة E77 الرقمية الداخلية')
  .addSubcommand(s=>s.setName('balance').setDescription('عرض المحفظة والبنك'))
  .addSubcommand(s=>s.setName('daily').setDescription('المكافأة اليومية'))
  .addSubcommand(s=>s.setName('work').setDescription('مكافأة نشاط المجتمع'))
  .addSubcommand(s=>s.setName('transfer').setDescription('تحويل عملات لعضو').addUserOption(o=>o.setName('member').setDescription('المستلم').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)))
  .addSubcommand(s=>s.setName('deposit').setDescription('إيداع في البنك').addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)))
  .addSubcommand(s=>s.setName('withdraw').setDescription('سحب من البنك').addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)))
  .addSubcommand(s=>s.setName('history').setDescription('آخر معاملاتك')),
 new SlashCommandBuilder().setName('e77-admin').setDescription('إدارة العملة والمنتجات').setDefaultMemberPermissions(ADMIN)
  .addSubcommand(s=>s.setName('coins-add').setDescription('إضافة رصيد').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)))
  .addSubcommand(s=>s.setName('coins-remove').setDescription('خصم رصيد').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)))
  .addSubcommand(s=>s.setName('coins-set').setDescription('تعيين رصيد').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('الرصيد').setMinValue(0).setMaxValue(1000000000).setRequired(true)))
].map(x=>x.toJSON());
const ADMIN_ACTIONS=new Set(['hosting:setup','hosting:panel','store:add','store:remove','e77-admin:coins-add','e77-admin:coins-remove','e77-admin:coins-set']);
const fmt=n=>new Intl.NumberFormat('en-US').format(n);
const makeEmbed=(title,description)=>new EmbedBuilder().setColor(0x7653D8).setTitle(title).setDescription(description).setFooter({text:'E77 HOST • Hosting Services'}).setTimestamp();
const isAdmin=i=>Boolean(i.memberPermissions?.has(ADMIN));
const waitText=ms=>{const n=Math.max(1,Math.ceil(ms/1000)),h=Math.floor(n/3600),m=Math.floor(n%3600/60);return [h&&h+' ساعة',m&&m+' دقيقة',!h&&!m&&n+' ثانية'].filter(Boolean).join(' و ');};
async function hostingArea(guild){
 const me=guild.members.me;if(!me?.permissions.has(PermissionFlagsBits.ManageChannels))throw Error('NEED_CHANNEL_PERMISSION');
 let category=guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name==='E77 HOST • الاستضافة');
 if(!category)category=await guild.channels.create({name:'E77 HOST • الاستضافة',type:ChannelType.GuildCategory,reason:'E77 HOST setup'});
 let panel=guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.parentId===category.id&&c.name==='ابدأ-من-هنا');
 if(!panel)panel=await guild.channels.create({name:'ابدأ-من-هنا',type:ChannelType.GuildText,parent:category.id,topic:'لوحة خدمات E77 HOST',reason:'E77 HOST setup'});
 return {category,panel};
}
function panelEmbed(){return makeEmbed('E77 HOST | مركز الاستضافة','مرحبًا بك في خدمات الاستضافة.\\n\\n1. استخدم /store browse لاستعراض الباقات.\\n2. استخدم /store buy لشراء الباقة بمعرفها.\\n3. بعد الدفع، تُفتح لك قناة خاصة لمتابعة طلب الاستضافة.\\n\\nعملة E77 رصيد افتراضي داخل السيرفر، وليست عملة مشفرة حقيقية أو قابلة للسحب النقدي.');}
async function openOrder(i,item){
 const {category}=await hostingArea(i.guild),me=i.guild.members.me;
 const old=i.guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.topic?.includes('E77_BUYER='+i.user.id)&&c.topic?.includes('E77_ITEM='+item.id));
 if(old)throw Error('ORDER_EXISTS');
 const admins=i.guild.roles.cache.filter(r=>r.permissions.has(ADMIN));
 return i.guild.channels.create({name:'طلب-'+i.user.username.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,15)+'-'+Date.now().toString().slice(-4),type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[
 {id:i.guild.id,deny:[PermissionFlagsBits.ViewChannel]},
 {id:i.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},
 {id:me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageChannels]},
 ...admins.map(r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))
 ],topic:'E77_BUYER='+i.user.id+' | E77_ITEM='+item.id,reason:'E77 HOST order'});
}
async function executeCommand(i){
 if(!i.inGuild())return i.editReply({content:'استخدم أوامر E77 HOST داخل السيرفر.'});
 const group=i.commandName,sub=i.options.getSubcommand(),key=group+':'+sub,g=i.guildId,u=i.user.id;
 if(ADMIN_ACTIONS.has(key)&&!isAdmin(i))return i.editReply({content:'هذا الإجراء مخصص للإدارة.'});
 if(group==='hosting'){
  if(sub==='guide')return i.editReply({embeds:[panelEmbed()]});
  if(sub==='setup'){const {panel}=await hostingArea(i.guild);const msgs=await panel.messages.fetch({limit:10}).catch(()=>null);if(!msgs?.some(m=>m.author.id===i.client.user.id&&m.embeds[0]?.title==='E77 HOST | مركز الاستضافة'))await panel.send({embeds:[panelEmbed()]});return i.editReply({content:'تم تجهيز مركز الاستضافة: '+panel.toString()});}
  if(sub==='panel'){const ch=i.options.getChannel('channel',true);await ch.send({embeds:[panelEmbed()]});return i.editReply({content:'تم نشر لوحة الاستضافة في '+ch.toString()});}
 }
 if(group==='store'){
  if(sub==='browse'){const items=await economy.shop(g);const text=items.length?items.map(x=>'**'+x.name+'** — '+fmt(x.price)+' E77\\n'+(x.description||'بدون وصف')+'\\nالنوع: '+(x.kind==='hosting'?'استضافة':'خدمة رقمية')+' | ID: '+x.id).join('\\n\\n').slice(0,3900):'لا توجد باقات منشورة حاليًا.';return i.editReply({embeds:[makeEmbed('متجر E77 HOST',text)]});}
  if(sub==='add'){const id=i.options.getString('item_id',true).toLowerCase(),name=i.options.getString('name',true).trim(),price=i.options.getInteger('price',true),kind=i.options.getString('kind',true),description=i.options.getString('description')||'';if(!/^[a-z0-9_-]{2,32}$/.test(id)||!name)return i.editReply({content:'تحقق من معرف المنتج واسمه.'});await economy.addItem(g,{id,name,price,kind,description,createdAt:Date.now()});return i.editReply({content:'تمت إضافة '+name+' إلى المتجر.'});}
  if(sub==='remove'){const item=await economy.removeItem(g,i.options.getString('item_id',true));return i.editReply({content:'تم حذف '+item.name+' من المتجر.'});}
  if(sub==='buy'){
   const id=i.options.getString('item_id',true),items=await economy.shop(g),item=items.find(x=>x.id===id);if(!item)throw Error('ITEM_NOT_FOUND');
   let room=null;if(item.kind==='hosting')room=await openOrder(i,item);
   try{const result=await economy.buy(g,u,id);if(room)await room.send({content:i.user.toString(),embeds:[makeEmbed('طلب استضافة جديد','الباقة: **'+result.item.name+'**\\nالمدفوع: **'+fmt(result.item.price)+' E77**\\nالرصيد المتبقي: **'+fmt(result.balance)+' E77**\\n\\nسيتابع فريق الاستضافة طلبك هنا. لا ترسل كلمات مرور أو توكنات في الروم.')]});return i.editReply({embeds:[makeEmbed('تم الشراء','المنتج: **'+result.item.name+'**\\nالسعر: **'+fmt(result.item.price)+' E77**\\nالرصيد المتبقي: **'+fmt(result.balance)+' E77**'+(room?'\\nقناة الطلب: '+room.toString():'\\nتم تسجيل الخدمة في مشترياتك.'))]});}
   catch(e){if(room)await room.delete('Purchase failed').catch(()=>{});throw e;}
  }
 }
 if(group==='coins'){
  if(sub==='balance'){const a=await economy.balance(g,u);return i.editReply({embeds:[makeEmbed('محفظة E77','المحفظة: **'+fmt(a.balance)+' E77**\\nالبنك: **'+fmt(a.bank)+' E77**\\nالإجمالي: **'+fmt(a.balance+a.bank)+' E77**')]});}
  if(sub==='daily'||sub==='work'){const r=await economy[sub](g,u);return i.editReply(r.ok?{embeds:[makeEmbed(sub==='daily'?'المكافأة اليومية':'مكافأة النشاط','ربحت **'+fmt(r.amount)+' E77**.\\nرصيدك: **'+fmt(r.balance)+' E77**.')] }:{content:'يمكنك المطالبة بعد '+waitText(r.remaining)+'.'});}
  if(sub==='transfer'){const target=i.options.getUser('member',true),amount=i.options.getInteger('amount',true);if(target.bot)return i.editReply({content:'لا يمكن التحويل إلى بوت.'});const r=await economy.transfer(g,u,target.id,amount);return i.editReply({embeds:[makeEmbed('تم التحويل','المستلم: '+target+'\\nالمبلغ: **'+fmt(amount)+' E77**\\nرصيدك: **'+fmt(r.from)+' E77**')]});}
  if(sub==='deposit'||sub==='withdraw'){const r=await economy[sub](g,u,i.options.getInteger('amount',true));return i.editReply({embeds:[makeEmbed(sub==='deposit'?'تم الإيداع':'تم السحب','المحفظة: **'+fmt(r.balance)+' E77**\\nالبنك: **'+fmt(r.bank)+' E77**')]});}
  if(sub==='history'){const rows=await economy.transactions(g,u,10),labels={daily:'مكافأة يومية',work:'مكافأة نشاط',transfer_in:'تحويل وارد',transfer_out:'تحويل صادر',purchase:'شراء',deposit:'إيداع',withdraw:'سحب',admin_add:'إضافة إدارية',admin_remove:'خصم إداري',admin_set:'تعديل إداري'};const text=rows.length?rows.map(x=>'**'+(labels[x.type]||'عملية')+'** · '+fmt(x.amount)+' E77\\n<t:'+Math.floor(x.at/1000)+':R>').join('\\n\\n'):'لا توجد معاملات.';return i.editReply({embeds:[makeEmbed('سجل محفظتك',text)]});}
 }
 if(group==='e77-admin'){const target=i.options.getUser('member',true),amount=i.options.getInteger('amount',true);if(target.bot)return i.editReply({content:'لا يمكن تعديل رصيد بوت.'});const mode={'coins-add':'add','coins-remove':'remove','coins-set':'set'}[sub];const r=await economy.adminAdjust(g,target.id,amount,mode);return i.editReply({content:'تم تحديث رصيد '+target+' إلى '+fmt(r.balance)+' E77.'});}
}
async function handleInteraction(i){
 if(!i.isChatInputCommand())return;
 await i.deferReply({ephemeral:true}).catch(()=>{});
 try{await executeCommand(i);}catch(e){const messages={NEED_CHANNEL_PERMISSION:'يحتاج البوت إلى صلاحية Manage Channels.',ORDER_EXISTS:'لديك طلب مفتوح لهذه الباقة بالفعل.',INVALID_AMOUNT:'المبلغ غير صالح.',SAME_USER:'لا يمكنك التحويل لنفسك.',INSUFFICIENT_FUNDS:'رصيدك غير كافٍ.',INSUFFICIENT_BANK_FUNDS:'رصيد البنك غير كافٍ.',BALANCE_LIMIT:'وصل الرصيد إلى الحد الآمن.',ITEM_EXISTS:'معرف المنتج أو اسمه مستخدم.',ITEM_NOT_FOUND:'المنتج غير موجود.'};await i.editReply({content:messages[e.message]||'تعذر تنفيذ العملية. حاول لاحقًا أو تواصل مع الإدارة.'}).catch(()=>{});console.error('[E77] '+i.commandName+' failed: '+String(e.message||'error').replace(/[^a-z0-9_]/gi,'').slice(0,48));}
}
async function registerCommands(client){if(!client.application?.commands)throw Error('APPLICATION_NOT_READY');const id=process.env.DISCORD_GUILD_ID;const result=await client.application.commands.set(commands,id||undefined);console.log('[COMMANDS] Registered '+result.size+' E77 HOST command groups.');}
module.exports={commands,ADMIN_ACTIONS,executeCommand,handleInteraction,registerCommands};
