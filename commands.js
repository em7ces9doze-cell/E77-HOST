'use strict';
const {SlashCommandBuilder,EmbedBuilder,PermissionFlagsBits,ChannelType}=require('discord.js');
const economy=require('./economy-store');
const storeSettings=require('./store-settings');
const ADMIN=PermissionFlagsBits.Administrator;
const commands=[
 new SlashCommandBuilder().setName('رومات').setDescription('إعداد وإدارة رومات متجر E77').setDefaultMemberPermissions(ADMIN)
  .addSubcommand(s=>s.setName('setup').setDescription('إنشاء أو تحديث رومات المتجر حسب الإعدادات'))
  .addSubcommand(s=>s.setName('settings').setDescription('تعديل أسماء الرومات ورتبة فريق المتجر')
   .addStringOption(o=>o.setName('category_name').setDescription('اسم تصنيف المتجر').setMaxLength(90))
   .addStringOption(o=>o.setName('sales_name').setDescription('اسم روم البيع').setMaxLength(90))
   .addStringOption(o=>o.setName('admin_name').setDescription('اسم روم الإدارة').setMaxLength(90))
   .addRoleOption(o=>o.setName('staff_role').setDescription('رتبة فريق المتجر'))),
 new SlashCommandBuilder().setName('hosting').setDescription('مركز خدمات الاستضافة')
  .addSubcommand(s=>s.setName('setup').setDescription('إنشاء قسم ولوحة الاستضافة'))
  .addSubcommand(s=>s.setName('panel').setDescription('نشر لوحة الاستضافة في روم').addChannelOption(o=>o.setName('channel').setDescription('الروم').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(s=>s.setName('guide').setDescription('دليل طلب الاستضافة'))
  .addSubcommand(s=>s.setName('help').setDescription('عرض جميع أوامر البوت')),
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
  .addSubcommand(s=>s.setName('history').setDescription('آخر معاملاتك'))
  .addSubcommand(s=>s.setName('profile').setDescription('ملفك الاقتصادي').addUserOption(o=>o.setName('member').setDescription('عرض ملف عضو آخر')))
  .addSubcommand(s=>s.setName('leaderboard').setDescription('ترتيب أعلى الأرصدة في السيرفر'))
  .addSubcommand(s=>s.setName('inventory').setDescription('عرض مشترياتك').addUserOption(o=>o.setName('member').setDescription('عرض مشتريات عضو آخر'))),
 new SlashCommandBuilder().setName('e77-admin').setDescription('إدارة العملة والمنتجات').setDefaultMemberPermissions(ADMIN)
  .addSubcommand(s=>s.setName('coins-add').setDescription('إضافة رصيد').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)))
  .addSubcommand(s=>s.setName('coins-remove').setDescription('خصم رصيد').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)))
  .addSubcommand(s=>s.setName('coins-set').setDescription('تعيين رصيد').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('الرصيد').setMinValue(0).setMaxValue(1000000000).setRequired(true)))
].map(x=>x.toJSON());
const ADMIN_ACTIONS=new Set(['رومات:setup','رومات:settings','hosting:setup','hosting:panel','store:add','store:remove','e77-admin:coins-add','e77-admin:coins-remove','e77-admin:coins-set']);
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
async function createStoreRooms(guild){
 const me=guild.members.me;
 if(!me?.permissions.has(PermissionFlagsBits.ManageChannels))throw Error('NEED_CHANNEL_PERMISSION');
 const cfg=storeSettings.get(guild.id);
 const categoryName=cfg.categoryName;
 let category=guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&(c.name===categoryName||c.name==='E77 STORE • المتجر'));
 if(!category)category=await guild.channels.create({name:categoryName,type:ChannelType.GuildCategory,reason:'E77 STORE room setup'});
 else if(category.name!==categoryName)await category.setName(categoryName,'E77 STORE settings');
 if(category.topic!=='E77_STORE_CATEGORY')await category.setTopic('E77_STORE_CATEGORY','E77 STORE marker').catch(()=>{});
 const adminRoles=guild.roles.cache.filter(r=>r.permissions.has(ADMIN));
 const staffRole=cfg.staffRoleId?guild.roles.cache.get(cfg.staffRoleId):null;
 const everyone={id:guild.id,deny:[PermissionFlagsBits.SendMessages,PermissionFlagsBits.CreatePublicThreads,PermissionFlagsBits.CreatePrivateThreads]};
 const botAllow={id:me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.EmbedLinks,PermissionFlagsBits.ManageChannels]};
 let sales=guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.parentId===category.id&&(c.topic==='E77_STORE_SALES'||c.name===cfg.salesName||c.name==='🛒・البيع'));
 if(!sales)sales=await guild.channels.create({name:cfg.salesName,type:ChannelType.GuildText,parent:category.id,topic:'E77_STORE_SALES',permissionOverwrites:[everyone,botAllow],reason:'E77 STORE sales room'});
 else {if(sales.name!==cfg.salesName)await sales.setName(cfg.salesName,'E77 STORE settings');if(sales.topic!=='E77_STORE_SALES')await sales.setTopic('E77_STORE_SALES','E77 STORE marker').catch(()=>{});}
 let admin=guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.parentId===category.id&&(c.topic==='E77_STORE_ADMIN'||c.name===cfg.adminName||c.name==='🛡️・الإدارة'));
 const adminOverwrites=[
  {id:guild.id,deny:[PermissionFlagsBits.ViewChannel]},
  ...adminRoles.map(role=>({id:role.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]})),
  ...(staffRole?[{id:staffRole.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}]:[]),
  botAllow
 ];
 if(!admin)admin=await guild.channels.create({name:cfg.adminName,type:ChannelType.GuildText,parent:category.id,topic:'E77_STORE_ADMIN',permissionOverwrites:adminOverwrites,reason:'E77 STORE admin room'});
 else {if(admin.name!==cfg.adminName)await admin.setName(cfg.adminName,'E77 STORE settings');if(admin.topic!=='E77_STORE_ADMIN')await admin.setTopic('E77_STORE_ADMIN','E77 STORE marker').catch(()=>{});await admin.permissionOverwrites.set(adminOverwrites,'E77 STORE permissions sync');}
 const salesMessages=await sales.messages.fetch({limit:10}).catch(()=>null);
 if(!salesMessages?.some(m=>m.author.id===guild.client.user.id&&m.embeds[0]?.title==='E77 STORE | متجر البوتات')){
  await sales.send({embeds:[makeEmbed('E77 STORE | متجر البوتات','مرحبًا بك في متجر E77.\\n\\nتصفح المنتجات المتاحة باستخدام /store browse.\\nاختر البوت والاشتراك المناسب، ثم أكمل بيانات التفعيل.\\n\\nلا ترسل أي Bot Token أو كلمة مرور داخل Discord.')]});
 }
 const adminMessages=await admin.messages.fetch({limit:10}).catch(()=>null);
 if(!adminMessages?.some(m=>m.author.id===guild.client.user.id&&m.embeds[0]?.title==='E77 STORE | مركز الإدارة')){
  await admin.send({embeds:[makeEmbed('E77 STORE | مركز الإدارة','هذه القناة مخصصة لفريق الإدارة لمتابعة تجهيز المنتجات والطلبات والاشتراكات.\\n\\nتأكد من مراجعة هوية العميل والسيرفر قبل اعتماد أي تفعيل.')]});
 }
 return {category,sales,admin};
}

function panelEmbed(){return makeEmbed('E77 HOST | مركز الاستضافة','مرحبًا بك في خدمات الاستضافة.\n\n1. استخدم /store browse لاستعراض الباقات.\n2. استخدم /store buy لشراء الباقة بمعرفها.\n3. بعد الدفع، تُفتح لك قناة خاصة لمتابعة طلب الاستضافة.\n\nعملة E77 رصيد افتراضي داخل السيرفر، وليست عملة مشفرة حقيقية أو قابلة للسحب النقدي.');}
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
 const group=i.commandName,sub=i.options.getSubcommand(false),key=group+':'+sub,g=i.guildId,u=i.user.id;
 if(group==='ping')return i.editReply({content:'Pong! 🟢 E77 HOST يعمل.'});
 if(group==='رومات'){
  if(sub==='settings'){
   const patch={};
   const categoryName=i.options.getString('category_name'),salesName=i.options.getString('sales_name'),adminName=i.options.getString('admin_name'),staffRole=i.options.getRole('staff_role');
   if(categoryName!==null)patch.categoryName=categoryName.trim();
   if(salesName!==null)patch.salesName=salesName.trim();
   if(adminName!==null)patch.adminName=adminName.trim();
   if(staffRole)patch.staffRoleId=staffRole.id;
   const cfg=await storeSettings.update(i.guildId,patch);
   return i.editReply({embeds:[makeEmbed('إعدادات E77 STORE','التصنيف: **'+cfg.categoryName+'**\\nروم البيع: **'+cfg.salesName+'**\\nروم الإدارة: **'+cfg.adminName+'**\\nرتبة الفريق: '+(cfg.staffRoleId?'<@&'+cfg.staffRoleId+'>':'رتب الإدارة فقط')+'\\n\\nشغّل /رومات setup لتطبيق التغييرات على الرومات الحالية.')]});
  }
  const rooms=await createStoreRooms(i.guild);
  return i.editReply({content:'تم تجهيز/تحديث مركز E77 STORE:\\n'+rooms.sales.toString()+'\\n'+rooms.admin.toString()});
 }
 if(group==='help')return i.editReply({embeds:[makeEmbed('دليل E77 HOST',
  '**الاستضافة**\\n/hosting guide — دليل الطلب\\n/hosting setup — تجهيز المركز (الإدارة)\\n/hosting panel — نشر اللوحة\\n\\n**المتجر**\\n/store browse — عرض الباقات\\n/store buy — شراء باقة\\n\\n**العملة E77**\\n/coins balance — رصيدك\\n/coins daily — المكافأة اليومية\\n/coins work — مكافأة النشاط\\n/coins transfer — تحويل\\n/coins deposit و /coins withdraw — البنك\\n/coins history — سجل العمليات\\n/coins profile — ملفك الاقتصادي\\n/coins leaderboard — ترتيب الأرصدة\\n/coins inventory — المشتريات\\n\\n**الإدارة**\\n/store add و /store remove\\n/e77-admin coins-add و coins-remove و coins-set')]});
 if(!sub)return i.editReply({content:'هذا الأمر يحتاج اختيار إجراء. استخدم /hosting help لعرض الأوامر.'});
 if(ADMIN_ACTIONS.has(key)&&!isAdmin(i))return i.editReply({content:'هذا الإجراء مخصص للإدارة.'});
 if(group==='hosting'){
  if(sub==='help')return i.editReply({embeds:[makeEmbed('دليل E77 HOST',
   '**الاستضافة**\n/hosting guide — دليل الطلب\n/hosting setup — تجهيز المركز (الإدارة)\n/hosting panel — نشر اللوحة\n\n**المتجر**\n/store browse — عرض الخدمات\n/store buy — شراء منتج\n\n**العملة E77**\n/coins balance — رصيدك\n/coins daily — المكافأة اليومية\n/coins work — مكافأة العمل\n/coins transfer — تحويل\n/coins deposit و /coins withdraw — البنك\n/coins history — سجل العمليات\n/coins profile — الملف الاقتصادي\n/coins leaderboard — ترتيب الأرصدة\n/coins inventory — المشتريات\n\n**للإدارة**\n/store add و /store remove\n/e77-admin coins-add و coins-remove و coins-set\n\nعملة E77 نقاط افتراضية داخل السيرفر وليست أموالًا قابلة للسحب.')]});

  if(sub==='guide')return i.editReply({embeds:[panelEmbed()]});
  if(sub==='setup'){const {panel}=await hostingArea(i.guild);const msgs=await panel.messages.fetch({limit:10}).catch(()=>null);if(!msgs?.some(m=>m.author.id===i.client.user.id&&m.embeds[0]?.title==='E77 HOST | مركز الاستضافة'))await panel.send({embeds:[panelEmbed()]});return i.editReply({content:'تم تجهيز مركز الاستضافة: '+panel.toString()});}
  if(sub==='panel'){const ch=i.options.getChannel('channel',true);await ch.send({embeds:[panelEmbed()]});return i.editReply({content:'تم نشر لوحة الاستضافة في '+ch.toString()});}
 }
 if(group==='store'){
  if(sub==='browse'){const items=await economy.shop(g);const text=items.length?items.map(x=>'**'+x.name+'** — '+fmt(x.price)+' E77\n'+(x.description||'بدون وصف')+'\nالنوع: '+(x.kind==='hosting'?'استضافة':'خدمة رقمية')+' | ID: '+x.id).join('\n\n').slice(0,3900):'لا توجد باقات منشورة حاليًا.';return i.editReply({embeds:[makeEmbed('متجر E77 HOST',text)]});}
  if(sub==='add'){const id=i.options.getString('item_id',true).toLowerCase(),name=i.options.getString('name',true).trim(),price=i.options.getInteger('price',true),kind=i.options.getString('kind',true),description=i.options.getString('description')||'';if(!/^[a-z0-9_-]{2,32}$/.test(id)||!name)return i.editReply({content:'تحقق من معرف المنتج واسمه.'});await economy.addItem(g,{id,name,price,kind,description,createdAt:Date.now()});return i.editReply({content:'تمت إضافة '+name+' إلى المتجر.'});}
  if(sub==='remove'){const item=await economy.removeItem(g,i.options.getString('item_id',true));return i.editReply({content:'تم حذف '+item.name+' من المتجر.'});}
  if(sub==='buy'){
   const id=i.options.getString('item_id',true),items=await economy.shop(g),item=items.find(x=>x.id===id);if(!item)throw Error('ITEM_NOT_FOUND');
   let room=null;if(item.kind==='hosting')room=await openOrder(i,item);
   try{const result=await economy.buy(g,u,id);if(room)await room.send({content:i.user.toString(),embeds:[makeEmbed('طلب استضافة جديد','الباقة: **'+result.item.name+'**\nالمدفوع: **'+fmt(result.item.price)+' E77**\nالرصيد المتبقي: **'+fmt(result.balance)+' E77**\n\nسيتابع فريق الاستضافة طلبك هنا. لا ترسل كلمات مرور أو توكنات في الروم.')]});return i.editReply({embeds:[makeEmbed('تم الشراء','المنتج: **'+result.item.name+'**\nالسعر: **'+fmt(result.item.price)+' E77**\nالرصيد المتبقي: **'+fmt(result.balance)+' E77**'+(room?'\nقناة الطلب: '+room.toString():'\nتم تسجيل الخدمة في مشترياتك.'))]});}
   catch(e){if(room)await room.delete('Purchase failed').catch(()=>{});throw e;}
  }
 }
 if(group==='coins'){
  if(sub==='balance'){const a=await economy.balance(g,u);return i.editReply({embeds:[makeEmbed('محفظة E77','المحفظة: **'+fmt(a.balance)+' E77**\nالبنك: **'+fmt(a.bank)+' E77**\nالإجمالي: **'+fmt(a.balance+a.bank)+' E77**')]});}
  if(sub==='daily'||sub==='work'){const r=await economy[sub](g,u);return i.editReply(r.ok?{embeds:[makeEmbed(sub==='daily'?'المكافأة اليومية':'مكافأة النشاط','ربحت **'+fmt(r.amount)+' E77**.\nرصيدك: **'+fmt(r.balance)+' E77**.')] }:{content:'يمكنك المطالبة بعد '+waitText(r.remaining)+'.'});}
  if(sub==='transfer'){const target=i.options.getUser('member',true),amount=i.options.getInteger('amount',true);if(target.bot)return i.editReply({content:'لا يمكن التحويل إلى بوت.'});const r=await economy.transfer(g,u,target.id,amount);return i.editReply({embeds:[makeEmbed('تم التحويل','المستلم: '+target+'\nالمبلغ: **'+fmt(amount)+' E77**\nرصيدك: **'+fmt(r.from)+' E77**')]});}
  if(sub==='deposit'||sub==='withdraw'){const r=await economy[sub](g,u,i.options.getInteger('amount',true));return i.editReply({embeds:[makeEmbed(sub==='deposit'?'تم الإيداع':'تم السحب','المحفظة: **'+fmt(r.balance)+' E77**\nالبنك: **'+fmt(r.bank)+' E77**')]});}
  if(sub==='history'){const rows=await economy.transactions(g,u,10),labels={daily:'مكافأة يومية',work:'مكافأة نشاط',transfer_in:'تحويل وارد',transfer_out:'تحويل صادر',purchase:'شراء',deposit:'إيداع',withdraw:'سحب',admin_add:'إضافة إدارية',admin_remove:'خصم إداري',admin_set:'تعديل إداري'};const text=rows.length?rows.map(x=>'**'+(labels[x.type]||'عملية')+'** · '+fmt(x.amount)+' E77\n<t:'+Math.floor(x.at/1000)+':R>').join('\n\n'):'لا توجد معاملات.';return i.editReply({embeds:[makeEmbed('سجل محفظتك',text)]});}
  if(sub==='profile'){
   const target=i.options.getUser('member')||i.user;
   const a=await economy.balance(g,target.id);
   return i.editReply({embeds:[makeEmbed('الملف الاقتصادي · '+target.username,
    'المحفظة: **'+fmt(a.balance)+' E77**\nالبنك: **'+fmt(a.bank)+' E77**\nالإجمالي: **'+fmt(a.balance+a.bank)+' E77**\n\nإجمالي المكتسب: **'+fmt(a.totalEarned||0)+' E77**\nإجمالي المصروف: **'+fmt(a.totalSpent||0)+' E77**')]});
  }
  if(sub==='leaderboard'){
   const rows=await economy.leaderboard(g);
   const body=rows.length?rows.map((x,n)=>'**'+(n+1)+'.** <@'+x.id+'> — **'+fmt(x.total)+' E77**').join('\n'):'لا توجد أرصدة مسجلة بعد.';
   return i.editReply({embeds:[makeEmbed('🏆 ترتيب اقتصاد E77',body)]});
  }
  if(sub==='inventory'){
   const target=i.options.getUser('member')||i.user;
   const rows=await economy.inventory(g,target.id);
   const body=rows.length?rows.slice(-10).reverse().map((x,n)=>'**'+(n+1)+'. '+x.name+'**\n'+(Number.isFinite(x.boughtAt)?'<t:'+Math.floor(x.boughtAt/1000)+':R>':'تاريخ الشراء غير متاح')).join('\n\n'):'لا توجد مشتريات مسجلة.';
   return i.editReply({embeds:[makeEmbed('مشتريات '+target.username,body)]});
  }
 }
 if(group==='e77-admin'){const target=i.options.getUser('member',true),amount=i.options.getInteger('amount',true);if(target.bot)return i.editReply({content:'لا يمكن تعديل رصيد بوت.'});const mode={'coins-add':'add','coins-remove':'remove','coins-set':'set'}[sub];const r=await economy.adminAdjust(g,target.id,amount,mode);return i.editReply({content:'تم تحديث رصيد '+target+' إلى '+fmt(r.balance)+' E77.'});}
}
async function handleInteraction(i){
 if(!i.isChatInputCommand())return;
 try{
  const sub=i.options.getSubcommand(false);
  await i.deferReply({ephemeral:!(i.commandName==='coins'&&sub==='leaderboard')});
  await executeCommand(i);
 }catch(e){
  const messages={NEED_CHANNEL_PERMISSION:'يحتاج البوت إلى صلاحية Manage Channels.',ORDER_EXISTS:'لديك طلب مفتوح لهذه الباقة بالفعل.',INVALID_AMOUNT:'المبلغ غير صالح.',SAME_USER:'لا يمكنك التحويل لنفسك.',INSUFFICIENT_FUNDS:'رصيدك غير كافٍ.',INSUFFICIENT_BANK_FUNDS:'رصيد البنك غير كافٍ.',BALANCE_LIMIT:'وصل الرصيد إلى الحد الآمن.',ITEM_EXISTS:'معرف المنتج أو اسمه مستخدم.',ITEM_NOT_FOUND:'المنتج غير موجود.'};
  const message=messages[e.message]||'تعذر تنفيذ العملية. حاول لاحقًا أو تواصل مع الإدارة.';
  if(i.deferred||i.replied)await i.editReply({content:message}).catch(()=>{});
  else await i.reply({content:message,ephemeral:true}).catch(()=>{});
  console.error('[E77] '+i.commandName+' failed: '+String(e.message||'error').replace(/[^a-z0-9_]/gi,'').slice(0,48));
 }
}
async function registerCommands(client){if(!client.application?.commands)throw Error('APPLICATION_NOT_READY');const id=process.env.DISCORD_GUILD_ID;const result=await client.application.commands.set(commands,id||undefined);console.log('[COMMANDS] Registered '+result.size+' E77 HOST command groups.');}
module.exports={commands,ADMIN_ACTIONS,executeCommand,handleInteraction,registerCommands};
