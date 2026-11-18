'use strict';

// Product templates are catalog entries, not deployed Discord applications.
// Every paid order must be provisioned as a separate Discord application/bot.
const products = [
  ['guard','E77 GUARD','الحماية','حماية السيرفر ومكافحة السبام والروابط المزعجة.',['anti-spam','anti-link','automod','warnings']],
  ['anti-raid','E77 ANTI-RAID','الحماية','حماية من موجات الانضمام والتغييرات غير الطبيعية.',['join-alerts','raid-mode','verification-gate']],
  ['auto-mod','E77 AUTO-MOD','الحماية','فلترة المحتوى والكلمات والمخالفات تلقائيًا.',['word-filter','mention-filter','automod-rules']],
  ['verify','E77 VERIFY','الحماية','بوابة تحقق للأعضاء الجدد.',['button-verification','role-on-verify','verification-logs']],
  ['manager','E77 MANAGER','الإدارة','أدوات إدارة القنوات والرتب والأعضاء.',['role-tools','channel-tools','member-tools']],
  ['welcome','E77 WELCOME','الإدارة','ترحيب ومغادرة ورسائل انضمام قابلة للتخصيص.',['welcome-card','leave-message','welcome-roles']],
  ['tickets','E77 TICKETS','الإدارة','نظام تذاكر دعم متعدد الأقسام.',['ticket-panels','claim-ticket','transcripts']],
  ['logs','E77 LOGS','الإدارة','سجل تدقيق لأحداث السيرفر.',['message-logs','member-logs','role-channel-logs']],
  ['roles','E77 ROLES','الإدارة','قوائم وأزرار توزيع الرتب ذاتيًا.',['button-roles','select-roles','role-panels']],
  ['giveaway','E77 GIVEAWAY','المجتمع','إدارة السحوبات والفائزين.',['giveaways','reroll','entry-requirements']],
  ['levels','E77 LEVELS','المجتمع','نظام خبرة ومستويات ومكافآت.',['xp','leaderboard','level-rewards']],
  ['economy','E77 ECONOMY','المجتمع','اقتصاد افتراضي ومحفظة ومتجر داخلي.',['wallet','daily-rewards','transactions']],
  ['suggest','E77 SUGGEST','المجتمع','اقتراحات وتصويت ومتابعة الحالات.',['suggestions','voting','staff-review']],
  ['polls','E77 POLLS','المجتمع','استطلاعات وتصويت متعدد الخيارات.',['polls','multi-choice','results']],
  ['birthday','E77 BIRTHDAY','المجتمع','تسجيل المناسبات والتنبيهات.',['birthdays','scheduled-greetings','opt-in-profile']],
  ['shop','E77 SHOP','الأعمال','كتالوج منتجات وخدمات داخل Discord.',['product-catalog','shopping-panels','order-links']],
  ['orders','E77 ORDERS','الأعمال','إدارة الطلبات وحالات التنفيذ.',['order-status','staff-assignment','order-history']],
  ['staff','E77 STAFF','الأعمال','إدارة مهام ودوام فريق العمل.',['staff-roster','tasks','activity-reports']],
  ['partners','E77 PARTNERS','الأعمال','إدارة طلبات الشراكات والتعاون.',['partner-applications','partner-list','review-workflow']],
  ['apply','E77 APPLY','الأعمال','نماذج تقديم للفرق والوظائف.',['application-forms','review-actions','decision-notices']],
  ['voice','E77 VOICE','الأدوات','إنشاء غرف صوتية مؤقتة وإدارتها.',['temporary-voice','voice-controls','cleanup']],
  ['music','E77 MUSIC','الأدوات','مشغل صوتي لمصادر متوافقة ومصرح بها.',['queue','playback-controls','playlists']],
  ['tools','E77 TOOLS','الأدوات','أدوات مساعدة ومعلومات للسيرفر.',['utility-commands','server-info','user-info']],
  ['stats','E77 STATS','الأدوات','إحصائيات ونمو ونشاط السيرفر.',['member-stats','activity-metrics','stat-panels']],
].map(([id,name,category,description,features]) => Object.freeze({id,name,category,description,features:Object.freeze(features)}));

const plans = Object.freeze([
  { id:'7d', label:'7 أيام', durationDays:7 },
  { id:'15d', label:'15 يومًا', durationDays:15 },
  { id:'1m', label:'شهر', durationDays:30 },
  { id:'2m', label:'شهران', durationDays:60 },
  { id:'3m', label:'3 أشهر', durationDays:90 },
]);
function getProduct(id) { return products.find(product => product.id === id) || null; }
function getPlan(id) { return plans.find(plan => plan.id === id) || null; }
module.exports = { products, plans, getProduct, getPlan };
