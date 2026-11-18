'use strict';
const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,PermissionFlagsBits}=require('discord.js');
const db=require('./bank-store');
const NAV='gb:',LOGO='https://raw.githubusercontent.com/em7ces9doze-cell/E77-HOST/main/assets/gulf-bank-logo.svg';
const GOLD=0xC69A4A,COIN=process.env.GULF_COIN_EMOJI||'🪙';
const money=n=>COIN+' **'+Number(n||0).toLocaleString('en-US')+' خليج**';
const em=(title,description)=>new EmbedBuilder().setColor(GOLD).setTitle(title).setDescription(description).setThumbnail(LOGO).setFooter({text:'GULF BANK • عملة الخليج الافتراضية'}).setTimestamp();
function dashboard(){
 const menu=new StringSelectMenuBuilder().setCustomId('gb:navigate').setPlaceholder('اختر خدمة من بنك الخليج').addOptions(
  {label:'ملخص حسابي',value:'balance',emoji:'💳',description:'الرصيد والتوفير والثروة'},
  {label:'المكافأة اليومية',value:'daily',emoji:'🎁',description:'استلام مكافأتك اليومية'},
  {label:'العمل والمهام',value:'work',emoji:'💼',description:'نفّذ مهمة واربح عملة الخليج'},
  {label:'التحديات',value:'challenge',emoji:'🎯',description:'تحديات ومكافآت اليوم'},
  {label:'سوق الشركات',value:'stocks',emoji:'📈',description:'تداول في عشر شركات افتراضية'},
  {label:'محفظة الأسهم',value:'stockportfolio',emoji:'📊',description:'قيمة أسهمك ونتائجها'},
  {label:'سوق الأصول',value:'market',emoji:'🏪',description:'الذهب والطاقة والتقنية والأغذية'},
  {label:'محفظتي',value:'portfolio',emoji:'🗂️',description:'ممتلكاتك الاستثمارية'},
  {label:'سجل العمليات',value:'history',emoji:'🧾',description:'آخر عمليات حسابك'},
  {label:'الأثرياء',value:'leaderboard',emoji:'🏆',description:'ترتيب أعلى الحسابات'}
 );
 return {embeds:[em('بنك الخليج | GULF BANK','**مرحبًا بك في مصرفك الافتراضي.**\n\n🪙 عملة الخليج • حسابات • تحويلات\n🎁 مكافآت ومهام يومية\n🎲 ألعاب وتحديات\n📈 تداول في 10 شركات افتراضية\n🏦 ادخار ومحافظ استثمارية\n🏆 مستويات ومنافسة\n\nاختر الخدمة من القائمة أو استخدم الأزرار.\n\n*اقتصاد افتراضي للترفيه فقط، ولا يمثل أموالًا أو استثمارات حقيقية.*')],components:[new ActionRowBuilder().addComponents(menu),new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('gb:balance').setLabel('حسابي').setEmoji('💳').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('gb:daily').setLabel('مكافأتي').setEmoji('🎁').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('gb:work').setLabel('مهمة عمل').setEmoji('💼').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('gb:stocks').setLabel('تداول الشركات').setEmoji('📈').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('gb:challenge').setLabel('تحدي').setEmoji('🎯').setStyle(ButtonStyle.Secondary)
 ),new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('gb:dice').setLabel('نرد 100 خليج').setEmoji('🎲').setStyle(ButtonStyle.Primary))]};
}
async function say(m,s){return m.reply({embeds:[em('بنك الخليج',s)]});}
function stockBoard(){const rows=db.stockMarket();return em('📈 بورصة بنك الخليج',rows.map(x=>'**'+x.name+'** ('+x.symbol+')\n'+x.sector+' • '+money(x.price)+' '+(x.change>0?'🟢 +':x.change<0?'🔴 ':'⚪ ')+Math.abs(x.change)).join('\n\n')+'\n\nلبدء الشراء: **تداول 200** ثم اختر الشركة.\nللبيع: **بيع_سهم NAMA 2** (الرمز ثم عدد الأسهم).');}
function stockPicker(userId,budget){
 const rows=db.stockMarket();
 const menu=new StringSelectMenuBuilder().setCustomId('gb:stockpick:'+userId+':'+budget).setPlaceholder('اختر الشركة التي تريد شراء أسهمها').addOptions(rows.map(x=>({label:x.name.slice(0,100),value:x.symbol,description:x.symbol+' • '+x.sector+' • '+x.price+' خليج'})));
 return {embeds:[em('اختيار الشركة','المبلغ المحدد: '+money(budget)+'\nاختر شركة واحدة من الشركات العشر. سيحسب البنك عدد الأسهم الممكن شراؤها ويعرض نتيجة العملية.')],components:[new ActionRowBuilder().addComponents(menu)]};
}
function view(action,id){
 if(action==='balance'){const a=db.balance(id);return em('💳 ملخص الحساب','**الرصيد المتاح:** '+money(a.balance)+'\n**حساب التوفير:** '+money(a.savings)+'\n**الثروة النقدية:** '+money(a.balance+a.savings)+'\n**المستوى:** '+(1+Math.floor(a.xp/100))+' • **XP:** '+a.xp);}
 if(action==='daily'){const r=db.daily(id);return em('🎁 المكافأة اليومية',r.ok?'تم إيداع '+money(r.amount)+' في حسابك.':'المكافأة القادمة بعد **'+Math.ceil(r.remaining/3600000)+' ساعة** تقريبًا.');}
 if(action==='work'){const r=db.work(id);return em('💼 مركز العمل',r.ok?'**المهمة:** '+r.job+'\n**المكافأة:** '+money(r.amount):'لقد استخدمت فرصة العمل. عُد بعد **'+Math.ceil(r.remaining/60000)+' دقيقة**.');}
 if(action==='challenge'){const r=db.challenge(id);return em('🎯 التحديات اليومية',r.ok?'اكتمل تحدٍ! ربحت '+money(r.reward)+'.\nالمتبقي اليوم: '+r.remaining:'اكتملت تحديات اليوم الثلاثة.');}
 if(action==='dice'){const r=db.dice(id,100);return em('🎲 نرد بنك الخليج',!r.ok?'رصيدك لا يكفي للمشاركة.':'نتيجتك **'+r.player+'/10** مقابل **'+r.bank+'/10**\n'+(r.result==='win'?'**فزت!** ربحت 100 خليج.':r.result==='loss'?'**فاز البنك.** خسرت 100 خليج.':'**تعادل.** لا ربح ولا خسارة.')+'\nرصيدك الحالي: '+money(r.balance));}
 if(action==='stocks')return stockBoard();
 if(action==='stockportfolio'){const rows=db.stockPortfolio(id);return em('📊 محفظة الأسهم',rows.length?rows.map(x=>'**'+x.name+'** ('+x.symbol+')\nالكمية: '+x.shares+' سهم • القيمة: '+money(x.value)+'\n'+(x.profit>=0?'🟢 ربح غير محقق: ':'🔴 خسارة غير محققة: ')+money(Math.abs(x.profit))).join('\n\n'):'لا تملك أسهمًا حاليًا. اكتب تداول 200 للبدء.');}
 if(action==='market'){const s=Object.entries(db.market).map(([k,v])=>'**'+k+'** — '+v.name+': '+money(v.price)).join('\n');return em('🏪 سوق الأصول الافتراضية',s+'\n\n+شراء GOLD 2 • +بيع GOLD 1');}
 if(action==='portfolio'){const a=db.balance(id),s=Object.entries(a.holdings).filter(([,n])=>n>0).map(([k,n])=>k+': '+n).join('\n')||'محفظتك فارغة.';return em('🗂️ محفظتي',s);}
 if(action==='history'){const s=db.history(id).map(x=>x.note+' — '+money(Math.abs(x.amount))).join('\n')||'لا توجد عمليات مسجلة.';return em('🧾 سجل العمليات',s);}
 if(action==='leaderboard'){const s=db.leaderboard().map((x,i)=>(i+1)+'. <@'+x.id+'> — '+money(x.total)).join('\n')||'لا توجد حسابات.';return em('🏆 كبار عملاء بنك الخليج',s);}
 return em('بنك الخليج','اختر خدمة من القائمة.');
}
async function handleMessage(m){
 if(!m.guild||m.author.bot)return;
 const p=m.content.trim().split(/\s+/),c=p[0],id=m.author.id;
 if(c==='تداول'){
  if(!p[1])return say(m,'كم المبلغ الذي تريد تخصيصه للتداول؟ اكتب مثلًا: **تداول 200**');
  const budget=Number(p[1]);if(!Number.isSafeInteger(budget)||budget<1||budget>10000000)return say(m,'أدخل مبلغًا صحيحًا من 1 إلى 10,000,000 خليج.');
  if(db.balance(id).balance<budget)return say(m,'رصيدك المتاح أقل من المبلغ الذي حددته.');
  return m.reply(stockPicker(id,budget));
 }
 if(c==='بيع_سهم'){const r=db.sellStock(id,p[1],p[2]);return say(m,r.ok?'تم بيع **'+r.shares+'** سهم من '+r.name+' بسعر '+money(r.total)+'.\nنتيجة الصفقة: '+(r.realized>=0?'ربح ':'خسارة ')+money(Math.abs(r.realized))+'\nرصيدك: '+money(r.balance):r.reason==='SHARES'?'عدد الأسهم التي تملكها غير كافٍ.':'الاستخدام: بيع_سهم NAMA 2');}
 if(c==='+تفعيل'){
  if(!m.member.permissions.has(PermissionFlagsBits.ManageGuild))return say(m,'هذه العملية متاحة لإدارة السيرفر فقط.');
  const sent=await m.channel.send(dashboard());await sent.pin().catch(()=>{});
  return say(m,'تم إنشاء لوحة بنك الخليج التفاعلية وتثبيتها. استخدم القائمة والأزرار بدل تكرار الأوامر.');
 }
 if(c==='+بنك')return m.channel.send(dashboard());
 if(c==='+مساعدة')return say(m,'لوحة البنك: +بنك • +تفعيل (للمشرف مرة واحدة)\nتداول 200 — اختر شركة من القائمة لشراء الأسهم\nبيع_سهم NAMA 2 — بيع سهمين من شركة نماء\n+رصيدي • +يومي • +عمل • +نرد 100\n+تحويل @عضو 100 • +ايداع 100 • +سحب 100\n+السوق • +شراء GOLD 2 • +بيع GOLD 1\n+محفظتي • +سجل • +تحدي • +اغنياء');
 if(c==='+رصيدي'||c==='+حسابي')return say(m,'رصيدك المتاح: '+money(db.balance(id).balance));
 if(c==='+يومي'||c==='+عمل'||c==='+تحدي'){const a=c==='+يومي'?'daily':c==='+عمل'?'work':'challenge';return m.reply({embeds:[view(a,id)]});}
 if(c==='+نرد'){const r=db.dice(id,p[1]||100);if(!r.ok)return say(m,r.reason==='LOW'?'رصيدك لا يكفي.':'حدد رهانًا صحيحًا.');return say(m,'🎲 نتيجتك **'+r.player+'/10** مقابل **'+r.bank+'/10**\n'+(r.result==='win'?'فزت وربحت قيمة الرهان!':r.result==='loss'?'فاز البنك.':'تعادل؛ لا ربح ولا خسارة.')+'\nرصيدك: '+money(r.balance));}
 if(c==='+تحويل'){const u=m.mentions.users.first(),n=p.find((v,i)=>i>0&&/^\d+$/.test(v)),r=db.transfer(id,u?.id,n);return say(m,r.ok?'تم التحويل. رصيدك '+money(r.balance):'تعذر التحويل؛ تحقق من العضو والمبلغ والرصيد.');}
 if(c==='+ايداع'||c==='+سحب'){const r=db.savings(id,c==='+ايداع'?'in':'out',p[1]);return say(m,r.ok?'تمت العملية. الرصيد '+money(r.account.balance)+' | التوفير '+money(r.account.savings):'المبلغ غير صحيح أو الرصيد غير كافٍ.');}
 if(c==='+السوق')return m.reply({embeds:[view('market',id)]});
 if(c==='+شركات')return m.reply({embeds:[stockBoard()]});
 if(c==='+شراء'||c==='+بيع'){const r=db.trade(id,c==='+شراء'?'buy':'sell',p[1],p[2]);return say(m,r.ok?'تمت العملية بقيمة '+money(r.total)+'. رصيدك '+money(r.account.balance):'تعذر تنفيذ الصفقة؛ تحقق من الرمز والكمية والرصيد.');}
 if(c==='+محفظتي'||c==='+سجل'||c==='+اغنياء'){const a=c==='+محفظتي'?'portfolio':c==='+سجل'?'history':'leaderboard';return m.reply({embeds:[view(a,id)]});}
}
async function handleComponent(i){
 if(!i.customId.startsWith(NAV))return;
 if(i.isStringSelectMenu()&&i.customId.startsWith('gb:stockpick:')){
  const [, ,owner,budgetRaw]=i.customId.split(':'),budget=Number(budgetRaw);
  if(i.user.id!==owner)return i.reply({content:'هذه القائمة تخص عضوًا آخر. ابدأ تداولك بكتابة تداول [المبلغ].',ephemeral:true});
  const symbol=i.values[0],r=db.buyStock(i.user.id,symbol,budget);
  if(!r.ok)return i.reply({embeds:[em('تعذر تنفيذ الصفقة',r.reason==='LOW'?'رصيدك لم يعد كافيًا.':r.reason==='BUDGET'?'المبلغ أقل من سعر سهم واحد.':'تحقق من المبلغ والشركة.')],ephemeral:true});
  return i.update({embeds:[em('✅ تم تنفيذ صفقة الشراء','اشتريت **'+r.shares+'** سهم من **'+r.name+'** ('+r.symbol+').\nسعر السهم: '+money(r.price)+'\nإجمالي الصفقة: '+money(r.total)+'\nالمتبقي من المبلغ: '+money(budget-r.total)+'\nرصيدك الحالي: '+money(r.balance))],components:[]});
 }
 const action=i.isStringSelectMenu()?i.values[0]:i.customId.slice(3);
 if(action==='stocks')return i.reply({embeds:[stockBoard()],ephemeral:true});
 if(action==='stockportfolio')return i.reply({embeds:[view(action,i.user.id)],ephemeral:true});
 return i.reply({embeds:[view(action,i.user.id)],ephemeral:true});
}
module.exports={handleMessage,handleComponent,dashboard};
