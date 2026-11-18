'use strict';
const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,PermissionFlagsBits}=require('discord.js');
const db=require('./bank-store');
const NAV='gb:',LOGO='https://raw.githubusercontent.com/em7ces9doze-cell/E77-HOST/main/assets/gulf-bank-logo.svg';
const GOLD=0xC69A4A,COIN=process.env.GULF_COIN_EMOJI||'🪙';
const money=n=>COIN+' **'+Number(n||0).toLocaleString('en-US')+' خليج**';
const em=(title,description)=>new EmbedBuilder().setColor(GOLD).setTitle(title).setDescription(description).setThumbnail(LOGO).setFooter({text:'GULF BANK • عالم اقتصادي افتراضي'}).setTimestamp();
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
  {label:'الألعاب',value:'games',emoji:'🎮',description:'دليل الألعاب وطريقة اللعب'},
  {label:'الأثرياء',value:'leaderboard',emoji:'🏆',description:'ترتيب أعلى الحسابات'}
 );
 return {embeds:[em('بنك الخليج | GULF BANK','**مرحبًا بك في مصرفك الافتراضي.**\n\n🪙 عملة الخليج • حسابات • تحويلات\n🎁 مكافآت ومهام يومية\n🎮 ألعاب ومنافسات\n📈 تداول في 10 شركات افتراضية\n🌆 مدينة ثلاثية الأبعاد\n🏦 ادخار ومحافظ استثمارية\n\nاختر الخدمة من القائمة أو افتح عالم الخليج من الرابط الذي يرسله البوت عبر **+العالم**.\n\n*اقتصاد افتراضي للترفيه فقط، ولا يمثل أموالًا أو استثمارات حقيقية.*')],components:[new ActionRowBuilder().addComponents(menu),new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('gb:balance').setLabel('حسابي').setEmoji('💳').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('gb:daily').setLabel('مكافأتي').setEmoji('🎁').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('gb:work').setLabel('مهمة عمل').setEmoji('💼').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('gb:stocks').setLabel('تداول الشركات').setEmoji('📈').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('gb:games').setLabel('الألعاب').setEmoji('🎮').setStyle(ButtonStyle.Secondary)
 ),new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('gb:dice').setLabel('نرد مجاني').setEmoji('🎲').setStyle(ButtonStyle.Primary))]};
}
async function say(m,s){return m.reply({embeds:[em('بنك الخليج',s)]});}
function gamesGuide(){return em('🎮 مركز ألعاب بنك الخليج','**الألعاب المتاحة وطريقة تشغيلها**\n\n🎲 **+نرد** — جولة مجانية ضد البنك. أعلى رقم من 1 إلى 10 يفوز بنقاط خبرة؛ لا توجد رهانات.\n🧠 **+ذاكرة** — تحدي تذكر تسلسل الرموز، مع 3 محاولات.\n🧩 **+سؤال** — سؤال معلومات عام مع خيارات تفاعلية.\n🏁 **+تحدي** — تحديات يومية ومكافآت افتراضية.\n📈 **تداول 200** — حدد ميزانيتك ثم اختر شركة من قائمة التداول.\n🏙️ **+العالم** — رابط مدينة بنك الخليج ثلاثية الأبعاد.\n\n**أوامر البنك:** +رصيدي • +يومي • +عمل • +تحويل • +ايداع • +سحب • +شركات • +محفظة_الأسهم\n\n*الألعاب لا تستخدم رهانات مالية أو مشتريات حقيقية.*');}
function gamesPanel(){const components=[new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId('gb:dice').setLabel('تحدي النرد').setEmoji('🎲').setStyle(ButtonStyle.Primary),
 new ButtonBuilder().setCustomId('gb:quiz').setLabel('سؤال سريع').setEmoji('🧩').setStyle(ButtonStyle.Secondary),
 new ButtonBuilder().setCustomId('gb:challenge').setLabel('التحديات').setEmoji('🏆').setStyle(ButtonStyle.Success),
 new ButtonBuilder().setCustomId('gb:memory').setLabel('تحدي الذاكرة').setEmoji('🧠').setStyle(ButtonStyle.Secondary)
 )];
 if(process.env.PUBLIC_BASE_URL)components.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('افتح مدينة 3D').setURL(process.env.PUBLIC_BASE_URL.replace(/\\/$/,''))));
 return{embeds:[gamesGuide()],components};}
function stockBoard(){const rows=db.stockMarket();return em('📈 بورصة بنك الخليج',rows.map(x=>'**'+x.name+'** ('+x.symbol+')\n'+x.sector+' • '+money(x.price)+' '+(x.change>0?'🟢 +':x.change<0?'🔴 ':'⚪ ')+Math.abs(x.change)).join('\n\n')+'\n\nلبدء الشراء: **تداول 200** ثم اختر الشركة.\nللبيع: **بيع_سهم NAMA 2**.');}
function stockPicker(userId,budget){const rows=db.stockMarket();const menu=new StringSelectMenuBuilder().setCustomId('gb:stockpick:'+userId+':'+budget).setPlaceholder('اختر الشركة التي تريد شراء أسهمها').addOptions(rows.map(x=>({label:x.name.slice(0,100),value:x.symbol,description:x.symbol+' • '+x.sector+' • '+x.price+' خليج'})));return{embeds:[em('اختيار الشركة','المبلغ المحدد: '+money(budget)+'\nاختر شركة واحدة من الشركات العشر. سيحسب البنك عدد الأسهم الممكن شراؤها.')],components:[new ActionRowBuilder().addComponents(menu)]};}
const quizzes=[{q:'ما الكوكب المعروف بالكوكب الأحمر؟',a:['المريخ','الزهرة','زحل'],correct:0},{q:'كم ضلعًا للمثلث؟',a:['4','3','5'],correct:1},{q:'ما أكبر محيط على الأرض؟',a:['الأطلسي','الهندي','الهادئ'],correct:2},{q:'ما الغاز الذي تمتصه النباتات غالبًا؟',a:['الأكسجين','ثاني أكسيد الكربون','الهيليوم'],correct:1}];
function quizCard(){const q=quizzes[Math.floor(Math.random()*quizzes.length)],menu=new StringSelectMenuBuilder().setCustomId('gb:quiz:'+q.correct).setPlaceholder('اختر إجابتك').addOptions(q.a.map((a,i)=>({label:a,value:String(i)})));return{embeds:[em('🧩 سؤال بنك الخليج',q.q+'\n\nاختر الإجابة الصحيحة. تحصل على نقاط خبرة عند الإجابة الصحيحة.')],components:[new ActionRowBuilder().addComponents(menu)]};}
function view(action,id){
 if(action==='balance'){const a=db.balance(id),shares=db.stockPortfolio(id).reduce((n,x)=>n+x.value,0),wealth=a.balance+a.savings+shares;return em('💳 ملخص الحساب','**الرصيد المتاح:** '+money(a.balance)+'\n**حساب التوفير:** '+money(a.savings)+'\n**قيمة الأسهم:** '+money(shares)+'\n**إجمالي الثروة:** '+money(wealth)+'\n**المستوى:** '+(1+Math.floor(a.xp/100))+' • **XP:** '+a.xp);}
 if(action==='daily'){const r=db.daily(id);return em('🎁 المكافأة اليومية',r.ok?'تم إيداع '+money(r.amount)+' في حسابك.':'المكافأة القادمة بعد **'+Math.ceil(r.remaining/3600000)+' ساعة** تقريبًا.');}
 if(action==='work'){const r=db.work(id);return em('💼 مركز العمل',r.ok?'**المهمة:** '+r.job+'\n**المكافأة:** '+money(r.amount):'لقد استخدمت فرصة العمل. عُد بعد **'+Math.ceil(r.remaining/60000)+' دقيقة**.');}
 if(action==='challenge'){const r=db.challenge(id);return em('🎯 التحديات اليومية',r.ok?'اكتمل تحدٍ! ربحت '+money(r.reward)+'.\nالمتبقي اليوم: '+r.remaining:'اكتملت تحديات اليوم الثلاثة.');}
 if(action==='dice'){const r=db.dice(id);return em('🎲 نرد بنك الخليج','نتيجتك **'+r.player+'/10** مقابل **'+r.bank+'/10**\n'+(r.result==='win'?'**فزت!** حصلت على نقطتي خبرة.':r.result==='loss'?'**فاز البنك هذه الجولة.** جرّب مرة أخرى.':'**تعادل!** لا تغيير في الرصيد.')+'\nرصيدك: '+money(r.balance));}
 if(action==='stocks')return stockBoard();
 if(action==='stockportfolio'){const rows=db.stockPortfolio(id);return em('📊 محفظة الأسهم',rows.length?rows.map(x=>'**'+x.name+'** ('+x.symbol+')\nالكمية: '+x.shares+' سهم • القيمة: '+money(x.value)+'\n'+(x.profit>=0?'🟢 ربح افتراضي: ':'🔴 خسارة افتراضية: ')+money(Math.abs(x.profit))).join('\n\n'):'لا تملك أسهمًا حاليًا. اكتب تداول 200 للبدء.');}
 if(action==='market'){const s=Object.entries(db.market).map(([k,v])=>'**'+k+'** — '+v.name+': '+money(v.price)).join('\n');return em('🏪 سوق الأصول الافتراضية',s+'\n\n+شراء GOLD 2 • +بيع GOLD 1');}
 if(action==='portfolio'){const a=db.balance(id),s=Object.entries(a.holdings).filter(([,n])=>n>0).map(([k,n])=>k+': '+n).join('\n')||'محفظتك فارغة.';return em('🗂️ محفظتي',s);}
 if(action==='history'){const s=db.history(id).map(x=>x.note+' — '+money(Math.abs(x.amount))).join('\n')||'لا توجد عمليات مسجلة.';return em('🧾 سجل العمليات',s);}
 if(action==='leaderboard'){const s=db.leaderboard().map((x,i)=>(i+1)+'. <@'+x.id+'> — '+money(x.total)).join('\n')||'لا توجد حسابات.';return em('🏆 كبار عملاء بنك الخليج',s);}
 if(action==='games')return gamesGuide();
 return em('بنك الخليج','اختر خدمة من القائمة.');
}
async function handleMessage(m){
 if(!m.guild||m.author.bot)return;
 const p=m.content.trim().split(/\s+/),c=p[0],id=m.author.id;
 if(c==='تداول'){if(!p[1])return say(m,'كم المبلغ الذي تريد تخصيصه للتداول؟ اكتب مثلًا: **تداول 200**');const budget=Number(p[1]);if(!Number.isSafeInteger(budget)||budget<1||budget>10000000)return say(m,'أدخل مبلغًا صحيحًا من 1 إلى 10,000,000 خليج.');if(db.balance(id).balance<budget)return say(m,'رصيدك المتاح أقل من المبلغ الذي حددته.');return m.reply(stockPicker(id,budget));}
 if(c==='بيع_سهم'){const r=db.sellStock(id,p[1],p[2]);return say(m,r.ok?'تم بيع **'+r.shares+'** سهم من '+r.name+' بسعر '+money(r.total)+'.\nنتيجة الصفقة: '+(r.realized>=0?'ربح ':'خسارة ')+money(Math.abs(r.realized))+'\nرصيدك: '+money(r.balance):r.reason==='SHARES'?'عدد الأسهم التي تملكها غير كافٍ.':'الاستخدام: بيع_سهم NAMA 2');}
 if(c==='+تفعيل'){if(!m.member.permissions.has(PermissionFlagsBits.ManageGuild))return say(m,'هذه العملية متاحة لإدارة السيرفر فقط.');const sent=await m.channel.send(dashboard());await sent.pin().catch(()=>{});return say(m,'تم إنشاء لوحة بنك الخليج التفاعلية وتثبيتها.');}
 if(c==='+العاب'||c==='+ألعاب'||c==='+الالعاب'||c==='+الألعاب')return m.reply(gamesPanel());
 if(c==='+العالم'||c==='+3d'){const base=process.env.PUBLIC_BASE_URL;if(!base)return say(m,'عالم بنك الخليج جاهز للنشر كواجهة ويب. يلزم ضبط PUBLIC_BASE_URL في إعدادات الاستضافة بعد نشر ملفات الموقع.');return m.reply({embeds:[em('🌆 مدينة بنك الخليج ثلاثية الأبعاد','افتح المدينة واستكشف البنك والبورصة وساحة الألعاب من المتصفح: '+base.replace(/\/$/,'') )]});}
 if(c==='+بنك')return m.channel.send(dashboard());
 if(c==='+مساعدة')return m.reply({embeds:[gamesGuide(),em('🏦 أوامر البنك','+بنك • +تفعيل • +العالم\n+رصيدي • +يومي • +عمل • +تحويل @عضو 100\n+ايداع 100 • +سحب 100 • +السوق\n+شركات • +محفظتي • +محفظة_الأسهم • +سجل • +اغنياء')]});
 if(c==='+رصيدي'||c==='+حسابي')return say(m,'رصيدك المتاح: '+money(db.balance(id).balance));
 if(c==='+يومي'||c==='+عمل'||c==='+تحدي'){const a=c==='+يومي'?'daily':c==='+عمل'?'work':'challenge';return m.reply({embeds:[view(a,id)]});}
 if(c==='+نرد')return m.reply({embeds:[view('dice',id)]});
 if(c==='+سؤال')return m.reply(quizCard());
 if(c==='+ذاكرة')return m.reply({embeds:[em('🧠 تحدي الذاكرة','افتح عالم بنك الخليج ثلاثي الأبعاد من **+العالم** لتجربة تحدي الذاكرة التفاعلي في ساحة الألعاب.')]});
 if(c==='+تحويل'){const u=m.mentions.users.first(),n=p.find((v,i)=>i>0&&/^\d+$/.test(v)),r=db.transfer(id,u?.id,n);return say(m,r.ok?'تم التحويل. رصيدك '+money(r.balance):'تعذر التحويل؛ تحقق من العضو والمبلغ والرصيد.');}
 if(c==='+ايداع'||c==='+سحب'){const r=db.savings(id,c==='+ايداع'?'in':'out',p[1]);return say(m,r.ok?'تمت العملية. الرصيد '+money(r.account.balance)+' | التوفير '+money(r.account.savings):'المبلغ غير صحيح أو الرصيد غير كافٍ.');}
 if(c==='+السوق')return m.reply({embeds:[view('market',id)]});
 if(c==='+شركات')return m.reply({embeds:[stockBoard()]});
 if(c==='+محفظة_الأسهم')return m.reply({embeds:[view('stockportfolio',id)]});
 if(c==='+شراء'||c==='+بيع'){const r=db.trade(id,c==='+شراء'?'buy':'sell',p[1],p[2]);return say(m,r.ok?'تمت العملية بقيمة '+money(r.total)+'. رصيدك '+money(r.account.balance):'تعذر تنفيذ الصفقة؛ تحقق من الرمز والكمية والرصيد.');}
 if(c==='+محفظتي'||c==='+سجل'||c==='+اغنياء'){const a=c==='+محفظتي'?'portfolio':c==='+سجل'?'history':'leaderboard';return m.reply({embeds:[view(a,id)]});}
}
async function handleComponent(i){
 if(!i.customId.startsWith(NAV))return;
 if(i.isStringSelectMenu()&&i.customId.startsWith('gb:stockpick:')){const [, ,owner,budgetRaw]=i.customId.split(':'),budget=Number(budgetRaw);if(i.user.id!==owner)return i.reply({content:'هذه القائمة تخص عضوًا آخر. ابدأ تداولك بكتابة تداول [المبلغ].',ephemeral:true});const symbol=i.values[0],r=db.buyStock(i.user.id,symbol,budget);if(!r.ok)return i.reply({embeds:[em('تعذر تنفيذ الصفقة',r.reason==='LOW'?'رصيدك لم يعد كافيًا.':r.reason==='BUDGET'?'المبلغ أقل من سعر سهم واحد.':'تحقق من المبلغ والشركة.')],ephemeral:true});return i.update({embeds:[em('✅ تم تنفيذ صفقة الشراء','اشتريت **'+r.shares+'** سهم من **'+r.name+'** ('+r.symbol+').\nسعر السهم: '+money(r.price)+'\nإجمالي الصفقة: '+money(r.total)+'\nالمتبقي من المبلغ: '+money(budget-r.total)+'\nرصيدك الحالي: '+money(r.balance))],components:[]});}
 if(i.isStringSelectMenu()&&i.customId.startsWith('gb:quiz:')){const correct=Number(i.customId.split(':')[2]),choice=Number(i.values[0]);return i.reply({embeds:[em(choice===correct?'✅ إجابة صحيحة':'❌ إجابة غير صحيحة',choice===correct?'أحسنت! إجابة صحيحة.':'ليست الإجابة الصحيحة. حاول في سؤال آخر.')],ephemeral:true});}
 const action=i.isStringSelectMenu()?i.values[0]:i.customId.slice(3);
 if(action==='stocks')return i.reply({embeds:[stockBoard()],ephemeral:true});
 if(action==='stockportfolio')return i.reply({embeds:[view(action,i.user.id)],ephemeral:true});\n if(action==='games')return i.reply({...gamesPanel(),ephemeral:true});\n if(action==='quiz')return i.reply({...quizCard(),ephemeral:true});\n if(action==='memory')return i.reply({embeds:[em('🧠 تحدي الذاكرة','افتح مدينة الخليج عبر +العالم ثم ادخل ساحة الألعاب لتجربة تحدي الذاكرة التفاعلي.')],ephemeral:true});\n if(action==='world'){const base=process.env.PUBLIC_BASE_URL;if(!base)return i.reply({content:'لم يتم ضبط PUBLIC_BASE_URL في إعدادات الاستضافة بعد.',ephemeral:true});return i.reply({content:'مدينة بنك الخليج ثلاثية الأبعاد: '+base,ephemeral:true});}
 return i.reply({embeds:[view(action,i.user.id)],ephemeral:true});
}
module.exports={handleMessage,handleComponent,dashboard};
