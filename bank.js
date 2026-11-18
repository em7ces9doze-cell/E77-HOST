'use strict';
const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
const db=require('./bank-store'),BLUE=0x164B8C;
const money=n=>Number(n||0).toLocaleString('en-US')+' GC';
const em=(t,d)=>new EmbedBuilder().setColor(BLUE).setTitle(t).setDescription(d).setFooter({text:'Gulf Bank • اقتصاد افتراضي'}).setTimestamp();
const panel=()=>({embeds:[em('🏦 بنك الخليج | Gulf Bank','كل عضو يبدأ بـ **1,000 GC** افتراضية.\n\n💳 الحساب والرصيد\n🎁 مكافأة يومية\n💼 العمل والتحديات\n🎲 نرد ضد البنك من 1 إلى 10\n📈 سوق واستثمارات افتراضية\n🏦 حساب توفير\n🏆 ترتيب الأثرياء\n\nاستخدم الأزرار أو اكتب +مساعدة.\nالأرصدة والأصول افتراضية للترفيه فقط.')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('gb:balance').setLabel('حسابي').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('gb:daily').setLabel('يومي').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId('gb:work').setLabel('عمل').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('gb:challenge').setLabel('تحدي').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('gb:market').setLabel('السوق').setStyle(ButtonStyle.Secondary))]});
const dur=ms=>Math.ceil(ms/60000)+' دقيقة';
async function say(m,s){return m.reply({embeds:[em('🏦 بنك الخليج',s)]});}
async function handleMessage(m){
 if(!m.guild||m.author.bot)return;const p=m.content.trim().split(/\s+/),c=p[0],id=m.author.id;
 if(c==='+بنك')return m.channel.send(panel());
 if(c==='+مساعدة')return say(m,'+بنك لوحة البنك\n+رصيدي الحساب\n+يومي مكافأة\n+عمل مهمة\n+نرد 100 رهان\n+تحويل @عضو 100\n+ايداع 100 / +سحب 100\n+السوق\n+شراء GOLD 2 / +بيع GOLD 1\n+محفظتي\n+سجل\n+تحدي\n+اغنياء');
 if(c==='+رصيدي'||c==='+حسابي'){const a=db.balance(id);return say(m,'الرصيد: **'+money(a.balance)+'**\nالتوفير: '+money(a.savings)+'\nالمستوى: '+(1+Math.floor(a.xp/100))+' | XP: '+a.xp);}
 if(c==='+يومي'){const r=db.daily(id);return say(m,r.ok?'استلمت '+money(r.amount)+'. رصيدك '+money(r.account.balance):'المكافأة بعد '+dur(r.remaining));}
 if(c==='+عمل'){const r=db.work(id);return say(m,r.ok?r.job+' — ربحت '+money(r.amount):'انتظر '+dur(r.remaining)+' قبل العمل مجددًا.');}
 if(c==='+نرد'){const r=db.dice(id,p[1]||100);if(!r.ok)return say(m,r.reason==='LOW'?'رصيدك لا يكفي.':'حدد رهانًا صحيحًا.');return say(m,'🎲 نردك: **'+r.player+'/10**\n🏦 نرد البنك: **'+r.bank+'/10**\n'+(r.result==='win'?'**فزت! ربحت قيمة الرهان.**':r.result==='loss'?'**فاز البنك وخسرت الرهان.**':'**تعادل، لا ربح ولا خسارة.**')+'\nرصيدك: '+money(r.balance));}
 if(c==='+تحويل'){const u=m.mentions.users.first(),n=p.find((v,i)=>i>0&&/^\d+$/.test(v)),r=db.transfer(id,u?.id,n);return say(m,r.ok?'تم التحويل. رصيدك '+money(r.balance):r.reason==='LOW'?'رصيدك لا يكفي.':'الاستخدام: +تحويل @عضو 100');}
 if(c==='+ايداع'||c==='+سحب'){const r=db.savings(id,c==='+ايداع'?'in':'out',p[1]);return say(m,r.ok?'تمت العملية. الرصيد '+money(r.account.balance)+' | التوفير '+money(r.account.savings):'المبلغ غير صحيح أو الرصيد غير كافٍ.');}
 if(c==='+السوق'){const s=Object.entries(db.market).map(([k,v])=>k+' — '+v.name+': '+money(v.price)).join('\n');return say(m,'**السوق الافتراضي**\n'+s+'\n+شراء GOLD 2\n+بيع GOLD 1');}
 if(c==='+شراء'||c==='+بيع'){const r=db.trade(id,c==='+شراء'?'buy':'sell',p[1],p[2]);return say(m,r.ok?'تمت العملية بقيمة '+money(r.total)+'. رصيدك '+money(r.account.balance):r.reason==='LOW'?'رصيدك لا يكفي.':r.reason==='ASSET'?'لا تملك الكمية.':'رمز أو كمية غير صحيحة.');}
 if(c==='+محفظتي'){const a=db.balance(id),s=Object.entries(a.holdings).filter(([,n])=>n>0).map(([k,n])=>k+': '+n).join('\n')||'محفظتك فارغة.';return say(m,s);}
 if(c==='+سجل'){const s=db.history(id).map(x=>x.note+' — '+money(Math.abs(x.amount))).join('\n')||'لا توجد عمليات.';return say(m,s);}
 if(c==='+تحدي'){const r=db.challenge(id);return say(m,r.ok?'ربحت '+money(r.reward)+'. التحديات المتبقية: '+r.remaining:'أنهيت تحديات اليوم الثلاثة.');}
 if(c==='+اغنياء'){const s=db.leaderboard().map((x,i)=>(i+1)+'. <@'+x.id+'> — '+money(x.total)).join('\n')||'لا توجد حسابات.';return say(m,s);}
}
async function handleComponent(i){if(!i.customId.startsWith('gb:'))return;const a=i.customId.slice(3),id=i.user.id;if(a==='balance'){const x=db.balance(id);return i.reply({content:'رصيدك '+money(x.balance)+' | التوفير '+money(x.savings),ephemeral:true});}if(a==='daily'){const x=db.daily(id);return i.reply({content:x.ok?'استلمت '+money(x.amount):'المكافأة بعد '+dur(x.remaining),ephemeral:true});}if(a==='work'){const x=db.work(id);return i.reply({content:x.ok?'ربحت '+money(x.amount):'انتظر '+dur(x.remaining),ephemeral:true});}if(a==='challenge'){const x=db.challenge(id);return i.reply({content:x.ok?'ربحت '+money(x.reward):'أنهيت تحديات اليوم.',ephemeral:true});}if(a==='market'){const s=Object.entries(db.market).map(([k,v])=>k+' '+money(v.price)).join('\n');return i.reply({embeds:[em('السوق الافتراضي',s)],ephemeral:true});}}
module.exports={handleMessage,handleComponent};
