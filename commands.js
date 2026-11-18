'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const economy = require('./economy-store');
const ADMIN = PermissionFlagsBits.Administrator;
const commands = [];
const user = (n,d) => new SlashCommandBuilder().setName(n).setDescription(d);
const staff = (n,d) => user(n,d).setDefaultMemberPermissions(ADMIN);
commands.push(
 user('help','عرض أوامر E7 HOST').toJSON(),
 user('balance','عرض رصيدك أو رصيد عضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(false)).toJSON(),
 user('daily','استلام المكافأة اليومية').toJSON(),
 user('work','العمل وكسب العملات').toJSON(),
 user('pay','تحويل العملات لعضو').addUserOption(o=>o.setName('member').setDescription('المستلم').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
 user('leaderboard','ترتيب أغنى أعضاء السيرفر').toJSON(),
 user('shop','عرض متجر السيرفر').toJSON(),
 user('buy','شراء عنصر من المتجر').addStringOption(o=>o.setName('item_id').setDescription('معرف العنصر').setRequired(true)).toJSON(),
 user('inventory','عرض مقتنياتك أو مقتنيات عضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(false)).toJSON(),
 user('profile','عرض ملفك الاقتصادي').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(false)).toJSON(),
 staff('shopadd','إضافة منتج للمتجر').addStringOption(o=>o.setName('item_id').setDescription('معرف فريد').setMaxLength(32).setRequired(true)).addStringOption(o=>o.setName('name').setDescription('اسم المنتج').setMaxLength(80).setRequired(true)).addIntegerOption(o=>o.setName('price').setDescription('السعر').setMinValue(1).setMaxValue(1000000000).setRequired(true)).addStringOption(o=>o.setName('description').setDescription('الوصف').setMaxLength(180).setRequired(false)).toJSON(),
 staff('shopremove','حذف منتج من المتجر').addStringOption(o=>o.setName('item_id').setDescription('معرف المنتج').setRequired(true)).toJSON(),
 staff('coinsadd','إضافة عملات لعضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
 staff('coinsremove','سحب عملات من عضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
 staff('coinsset','تعيين رصيد عضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o=>o.setName('amount').setDescription('الرصيد الجديد').setMinValue(0).setMaxValue(1000000000).setRequired(true)).toJSON()
);
const ADMIN_COMMANDS = new Set(['shopadd','shopremove','coinsadd','coinsremove','coinsset']);
const fmt = n => new Intl.NumberFormat('en-US').format(n);
const makeEmbed = (title,description) => new EmbedBuilder().setColor(0x7653D8).setTitle(title).setDescription(description).setTimestamp();
const adminCheck = i => Boolean(i.memberPermissions && i.memberPermissions.has(ADMIN));
const errors = { INVALID_AMOUNT:'المبلغ غير صالح.', SAME_USER:'لا يمكنك التحويل لنفسك.', INSUFFICIENT_FUNDS:'رصيدك غير كافٍ.', ITEM_EXISTS:'معرف المنتج أو اسمه مستخدم مسبقًا.', ITEM_NOT_FOUND:'المنتج غير موجود.' };
function remaining(ms){const s=Math.ceil(ms/1000);return Math.floor(s/3600)+' ساعة و '+Math.floor((s%3600)/60)+' دقيقة';}
async function executeCommand(i){
 if(!i.inGuild()) return i.reply({content:'نظام E7 HOST الاقتصادي يعمل داخل السيرفرات فقط.',ephemeral:true});
 const n=i.commandName,g=i.guildId,uid=i.user.id;
 if(ADMIN_COMMANDS.has(n)&&!adminCheck(i)) return i.reply({content:'هذا الأمر مخصص لحاملي صلاحية Administrator.',ephemeral:true});
 if(n==='help') return i.reply({embeds:[makeEmbed('E7 HOST — Economy System','**أوامر الأعضاء**\n/balance — رصيد العملات\n/daily — مكافأة يومية\n/work — اكسب من العمل\n/pay — تحويل العملات\n/leaderboard — ترتيب الأعضاء\n/shop — المتجر\n/buy — شراء منتج\n/inventory — المقتنيات\n/profile — الملف الاقتصادي\n\n**أوامر الإدارة**\n/shopadd — إضافة منتج\n/shopremove — حذف منتج\n/coinsadd — إضافة رصيد\n/coinsremove — سحب رصيد\n/coinsset — تعيين رصيد')],ephemeral:true});
 if(n==='balance'||n==='profile'){
  const target=i.options.getUser('member')||i.user,b=await economy.balance(g,target.id),inv=await economy.inventory(g,target.id);
  return i.reply({embeds:[makeEmbed((n==='balance'?'رصيد ':'الملف الاقتصادي — ')+target.username,'**المحفظة:** '+fmt(b.balance)+' 🪙\n**إجمالي المكتسب:** '+fmt(b.totalEarned)+'\n**إجمالي المصروف:** '+fmt(b.totalSpent)+'\n**المقتنيات:** '+inv.length)]});
 }
 if(n==='daily'){const r=await economy.daily(g,uid);return i.reply(r.ok?{embeds:[makeEmbed('المكافأة اليومية','استلمت **'+fmt(r.amount)+'** 🪙\nرصيدك الآن **'+fmt(r.balance)+'** 🪙')]}:{content:'استلمت مكافأتك. ارجع بعد '+remaining(r.remaining)+'.',ephemeral:true});}
 if(n==='work'){const r=await economy.work(g,uid);return i.reply(r.ok?{embeds:[makeEmbed('عمل مكتمل','ربحت **'+fmt(r.amount)+'** 🪙\nرصيدك الآن **'+fmt(r.balance)+'** 🪙')]}:{content:'عملت مؤخرًا. حاول بعد '+remaining(r.remaining)+'.',ephemeral:true});}
 if(n==='pay'){const target=i.options.getUser('member',true),amount=i.options.getInteger('amount',true);if(target.bot)return i.reply({content:'لا يمكن تحويل العملات إلى حساب بوت.',ephemeral:true});const r=await economy.transfer(g,uid,target.id,amount);return i.reply({embeds:[makeEmbed('تم التحويل','حوّلت **'+fmt(amount)+'** 🪙 إلى '+target+'. رصيدك المتبقي **'+fmt(r.from)+'** 🪙')]});}
 if(n==='leaderboard'){const rows=await economy.leaderboard(g),text=rows.length?rows.map((x,k)=>(k+1)+'. <@'+x.id+'> — **'+fmt(x.total)+'** 🪙').join('\n'):'لا توجد أرصدة مسجلة بعد.';return i.reply({embeds:[makeEmbed('🏆 أغنى أعضاء السيرفر',text)]});}
 if(n==='shop'){const items=await economy.shop(g),text=items.length?items.map(x=>'**'+x.name+'** — '+fmt(x.price)+' 🪙\n'+(x.description||'بدون وصف')+'\nID: '+x.id).join('\n\n').slice(0,4000):'المتجر فارغ حاليًا.';return i.reply({embeds:[makeEmbed('🛒 متجر السيرفر',text)]});}
 if(n==='buy'){const r=await economy.buy(g,uid,i.options.getString('item_id',true));return i.reply({embeds:[makeEmbed('تم الشراء','اشتريت **'+r.item.name+'** مقابل **'+fmt(r.item.price)+'** 🪙.\nرصيدك المتبقي **'+fmt(r.balance)+'** 🪙.\nتم تسجيل العنصر في مقتنياتك.')]});}
 if(n==='inventory'){const target=i.options.getUser('member')||i.user,items=await economy.inventory(g,target.id),counts={};for(const item of items)counts[item.name]=(counts[item.name]||0)+1;const text=Object.keys(counts).length?Object.entries(counts).map(x=>'• **'+x[0]+'** × '+x[1]).join('\n').slice(0,4000):'الحقيبة فارغة.';return i.reply({embeds:[makeEmbed('مقتنيات '+target.username,text)],ephemeral:true});}
 if(n==='shopadd'){const id=i.options.getString('item_id',true).toLowerCase(),name=i.options.getString('name',true),price=i.options.getInteger('price',true),description=i.options.getString('description')||'';if(!/^[a-z0-9_-]{2,32}$/.test(id))return i.reply({content:'المعرف يجب أن يكون 2–32 حرفًا إنجليزيًا أو رقمًا أو _ أو -.',ephemeral:true});await economy.addItem(g,{id,name,price,description,createdAt:Date.now()});return i.reply({content:'تمت إضافة **'+name+'** بسعر **'+fmt(price)+'** 🪙.',ephemeral:true});}
 if(n==='shopremove'){const item=await economy.removeItem(g,i.options.getString('item_id',true));return i.reply({content:'تم حذف **'+item.name+'** من المتجر.',ephemeral:true});}
 if(['coinsadd','coinsremove','coinsset'].includes(n)){const target=i.options.getUser('member',true),amount=i.options.getInteger('amount',true);if(target.bot)return i.reply({content:'لا يمكن تعديل رصيد حساب بوت.',ephemeral:true});const mode={coinsadd:'add',coinsremove:'remove',coinsset:'set'}[n],r=await economy.adminAdjust(g,target.id,amount,mode);return i.reply({content:'تم تحديث رصيد '+target+'. الرصيد الحالي **'+fmt(r.balance)+'** 🪙.',ephemeral:true});}
}
async function handleInteraction(i){if(!i.isChatInputCommand())return;try{await executeCommand(i);}catch(e){const msg=errors[e.message]||'تعذر تنفيذ العملية. حاول لاحقًا.';if(i.replied||i.deferred)await i.followUp({content:msg,ephemeral:true}).catch(()=>{});else await i.reply({content:msg,ephemeral:true}).catch(()=>{});console.error('[ECONOMY] '+i.commandName+' failed: '+String(e.message||'error').replace(/[^a-z0-9_]/gi,'').slice(0,40));}}
async function registerCommands(client){if(!client.application||!client.application.commands)throw new Error('Discord application commands are not ready.');const gid=process.env.DISCORD_GUILD_ID,result=await client.application.commands.set(commands,gid||undefined);console.log('[COMMANDS] Registered '+result.size+' E7 HOST economy commands.');}
module.exports={commands,ADMIN_COMMANDS,executeCommand,handleInteraction,registerCommands};
