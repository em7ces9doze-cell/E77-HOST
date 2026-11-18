'use strict';
const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,PermissionFlagsBits}=require('discord.js');
const db=require('./bank-store');
const NAV='gb:';
const GOLD=0xC6A15B,NAVY=0x101D31;
const money=n=>Number(n||0).toLocaleString('en-US')+' GC';
const em=(title,description)=>new EmbedBuilder().setColor(GOLD).setTitle(title).setDescription(description).setFooter({text:'GULF BANK • اقتصاد افتراضي | بنك الخليج'}).setTimestamp();
function dashboard(){
 const menu=new StringSelectMenuBuilder().setCustomId('gb:navigate').setPlaceholder('اختر قسمًا من البنك').addOptions(
  {label:'ملخص حسابي',value:'balance',emoji:'💳',description:'الرصيد والتوفير والمستوى'},
  {label:'المكافآت اليومية',value:'daily',emoji:'🎁',description:'استلام مكافأتك اليومية'},
  {label:'العمل والمهام',value:'work',emoji:'💼',description:'نفّذ مهمة واربح GC'},
  {label:'التحديات',value:'challenge',emoji:'🎯',description:'تحديات ومكافآت اليوم'},
  {label:'السوق',value:'market',emoji:'📈',description:'أسعار الأصول الافتراضية'},
  {label:'محفظتي',value:'portfolio',emoji:'🗂️',description:'ممتلكاتك الاستثمارية'},
  {label:'سجل العمليات',value:'history',emoji:'🧾',description:'آخر عمليات حسابك'},
  {label:'الأثرياء',value:'leaderboard',emoji:'🏆',description:'ترتيب أعلى الحسابات'}
 );
 return {embeds:[em('بنك الخليج | GULF BANK','**مصرفك الافتراضي داخل Discord**\n\n💳 الحسابات والأرصدة\n🎁 مكافآت ومهام يومية\n🎲 ألعاب وتحديات\n📈 استثمارات وسوق افتراضي\n🏦 ادخار وتحويلات\n🏆 مستويات ومنافسة\n\nاختر الخدمة من القائمة أدناه. لا تحتاج إلى كتابة أمر لكل عملية.\n\n*جميع الأرصدة والأصول افتراضية للترفيه فقط.*')],components:[new ActionRowBuilder().addComponents(menu),new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('gb:balance').setLabel('حسابي').setEmoji('💳').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('gb:daily').setLabel('مكافأتي').setEmoji('🎁').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('gb:work').setLabel('مهمة عمل').setEmoji('💼').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('gb:market').setLabel('السوق').setEmoji('📈').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('gb:challenge').setLabel('تحدي').setEmoji('🎯').setStyle(ButtonStyle.Secondary)
 )]};
}
async function say(m,s){return m.reply({embeds:[em('بنك الخليج',s)]});}
function view(action,id){
 if(action==='balance'){const a=db.balance(id);return em('💳 ملخص الحساب','**الرصيد المتاح:** '+money(a.balance)+'\n**حساب التوفير:** '+money(a.savings)+'\n**إجمالي الثروة النقدية:** '+money(a.balance+a.savings)+'\n**المستوى:** '+(1+Math.floor(a.xp/100))+' • **XP:** '+a.xp);}
 if(action==='daily'){const r=db.daily(id);return em('🎁 المكافأة اليومية',r.ok?'تم إيداع **'+money(r.amount)+'** في حسابك.':'المكافأة القادمة بعد **'+Math.ceil(r.remaining/3600000)+' ساعة** تقريبًا.');}
 if(action==='work'){const r=db.work(id);return em('💼 مركز العمل',r.ok?'**المهمة:** '+r.job+'\n**المكافأة:** '+money(r.amount):'لقد استخدمت فرصة العمل. عُد بعد **'+Math.ceil(r.remaining/60000)+' دقيقة**.');}
 if(action==='challenge'){const r=db.challenge(id);return em('🎯 التحديات اليومية',r.ok?'اكتمل تحدٍ! ربحت **'+money(r.reward)+'**.\nالمتبقي اليوم: '+r.remaining:'اكتملت تحديات اليوم الثلاثة.');}
 if(action==='market'){const s=Object.entries(db.market).map(([k,v])=>'**'+k+'** — '+v.name+' — '+money(v.price)).join('\n');return em('📈 سوق الخليج الافتراضي',s+'\n\nالشراء والبيع عبر الأوامر: +شراء GOLD 2 • +بيع GOLD 1');}
 if(action==='portfolio'){const a=db.balance(id),s=Object.entries(a.holdings).filter(([,n])=>n>0).map(([k,n])=>'**'+k+'**: '+n).join('\n')||'لا تملك أصولًا حاليًا.';return em('🗂️ محفظتي الاستثمارية',s);}
 if(action==='history'){const s=db.history(id).map(x=>x.note+' — '+money(Math.abs(x.amount))).join('\n')||'لا توجد عمليات مسجلة.';return em('🧾 سجل العمليات',s);}
 if(action==='leaderboard'){const s=db.leaderboard().map((x,i)=>(i+1)+'. <@'+x.id+'> — '+money(x.total)).join('\n')||'لا توجد حسابات بعد.';return em('🏆 كبار عملاء بنك الخليج',s);}
 return em('بنك الخليج','اختر خدمة من القائمة.');
}
async function handleMessage(m){
 if(!m.guild||m.author.bot)return;
 const p=m.content.trim().split(/\s+/),c=p[0],id=m.author.id;
 if(c==='+تفعيل'){
  if(!m.member.permissions.has(PermissionFlagsBits.ManageGuild))return say(m,'هذه العملية متاحة لإدارة السيرفر فقط.');
  const sent=await m.channel.send(dashboard());
  await sent.pin().catch(()=>{});
  return say(m,'تم إنشاء لوحة بنك الخليج التفاعلية وتثبيتها. من الآن يستطيع الأعضاء استخدام الأزرار والقائمة دون كتابة +بنك كل مرة.');
 }
 if(c==='+بنك')return m.channel.send(dashboard());
 if(c==='+مساعدة')return say(m,'لوحة البنك: +بنك (للمشرف ينفذ +تفعيل مرة واحدة لتثبيت اللوحة)\n+رصيدي • +يومي • +عمل • +نرد 100\n+تحويل @عضو 100 • +ايداع 100 • +سحب 100\n+السوق • +شراء GOLD 2 • +بيع GOLD 1\n+محفظتي • +سجل • +تحدي • +اغنياء');
 if(c==='+رصيدي'||c==='+حسابي')return say(m,'الرصيد: **'+money(db.balance(id).balance)+'**');
 if(c==='+يومي'||c==='+عمل'||c==='+تحدي'){const a=c==='+يومي'?'daily':c==='+عمل'?'work':'challenge';return say(m,view(a,id).data.description);}
 if(c==='+نرد'){const r=db.dice(id,p[1]||100);if(!r.ok)return say(m,r.reason==='LOW'?'رصيدك لا يكفي.':'حدد رهانًا صحيحًا.');return say(m,'🎲 نتيجتك **'+r.player+'/10** مقابل **'+r.bank+'/10**\n'+(r.result==='win'?'فزت وربحت قيمة الرهان!':r.result==='loss'?'فاز البنك.':'تعادل؛ لا ربح ولا خسارة.')+'\nرصيدك: '+money(r.balance));}
 if(c==='+تحويل'){const u=m.mentions.users.first(),n=p.find((v,i)=>i>0&&/^\d+$/.test(v)),r=db.transfer(id,u?.id,n);return say(m,r.ok?'تم التحويل. الرصيد المتبقي '+money(r.balance):'تعذر التحويل؛ تحقق من العضو والمبلغ والرصيد.');}
 if(c==='+ايداع'||c==='+سحب'){const r=db.savings(id,c==='+ايداع'?'in':'out',p[1]);return say(m,r.ok?'تمت العملية. الرصيد '+money(r.account.balance)+' | التوفير '+money(r.account.savings):'المبلغ غير صحيح أو الرصيد غير كافٍ.');}
 if(c==='+السوق')return say(m,view('market',id).data.description);
 if(c==='+شراء'||c==='+بيع'){const r=db.trade(id,c==='+شراء'?'buy':'sell',p[1],p[2]);return say(m,r.ok?'تمت العملية بقيمة '+money(r.total)+'. رصيدك '+money(r.account.balance):'تعذر تنفيذ الصفقة؛ تحقق من الرمز والكمية والرصيد.');}
 if(c==='+محفظتي'||c==='+سجل'||c==='+اغنياء'){const a=c==='+محفظتي'?'portfolio':c==='+سجل'?'history':'leaderboard';return m.reply({embeds:[view(a,id)]});}
}
async function handleComponent(i){
 if(!i.customId.startsWith(NAV))return;
 const action=i.isStringSelectMenu()?i.values[0]:i.customId.slice(3);
 const embed=view(action,i.user.id);
 return i.reply({embeds:[embed],ephemeral:true});
}
module.exports={handleMessage,handleComponent,dashboard};
