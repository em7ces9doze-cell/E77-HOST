'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const economy = require('./economy-store');

const ADMIN = PermissionFlagsBits.Administrator;
const commands = [];
const user = (name, description) => new SlashCommandBuilder().setName(name).setDescription(description);
const staff = (name, description) => user(name, description).setDefaultMemberPermissions(ADMIN);
const amountOption = () => command => command
  .addIntegerOption(option => option.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true));
const memberOption = command => command
  .addUserOption(option => option.setName('member').setDescription('العضو').setRequired(true));

commands.push(
  user('help', 'عرض جميع أوامر E77 HOST').toJSON(),
  user('balance', 'عرض رصيدك أو رصيد عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(false)).toJSON(),
  user('bank', 'عرض المحفظة والبنك').toJSON(),
  user('deposit', 'إيداع العملات في البنك').addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
  user('withdraw', 'سحب العملات من البنك').addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
  user('transactions', 'عرض آخر عملياتك المالية').toJSON(),
  user('daily', 'استلام المكافأة اليومية').toJSON(),
  user('work', 'العمل وكسب العملات').toJSON(),
  user('pay', 'تحويل العملات لعضو').addUserOption(o => o.setName('member').setDescription('المستلم').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
  user('leaderboard', 'ترتيب أغنى أعضاء السيرفر').toJSON(),
  user('shop', 'عرض متجر السيرفر').toJSON(),
  user('buy', 'شراء عنصر من المتجر').addStringOption(o => o.setName('item_id').setDescription('معرف العنصر').setRequired(true)).toJSON(),
  user('inventory', 'عرض مقتنياتك أو مقتنيات عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(false)).toJSON(),
  user('profile', 'عرض ملفك الاقتصادي').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(false)).toJSON(),
  staff('shopadd', 'إضافة منتج للمتجر')
    .addStringOption(o => o.setName('item_id').setDescription('معرف فريد').setMinLength(2).setMaxLength(32).setRequired(true))
    .addStringOption(o => o.setName('name').setDescription('اسم المنتج').setMaxLength(80).setRequired(true))
    .addIntegerOption(o => o.setName('price').setDescription('السعر').setMinValue(1).setMaxValue(1000000000).setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('الوصف').setMaxLength(180).setRequired(false)).toJSON(),
  staff('shopremove', 'حذف منتج من المتجر').addStringOption(o => o.setName('item_id').setDescription('معرف المنتج').setRequired(true)).toJSON(),
  staff('coinsadd', 'إضافة عملات لعضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
  staff('coinsremove', 'سحب عملات من عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setMinValue(1).setMaxValue(1000000000).setRequired(true)).toJSON(),
  staff('coinsset', 'تعيين رصيد عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('الرصيد الجديد').setMinValue(0).setMaxValue(1000000000).setRequired(true)).toJSON()
);

const ADMIN_COMMANDS = new Set(['shopadd', 'shopremove', 'coinsadd', 'coinsremove', 'coinsset']);
const fmt = value => new Intl.NumberFormat('en-US').format(value);
const makeEmbed = (title, description) => new EmbedBuilder()
  .setColor(0x7653D8).setTitle(title).setDescription(description).setTimestamp();
const adminCheck = interaction => Boolean(interaction.memberPermissions?.has(ADMIN));
const errors = {
  INVALID_AMOUNT: 'المبلغ غير صالح.',
  SAME_USER: 'لا يمكنك التحويل لنفسك.',
  INSUFFICIENT_FUNDS: 'رصيد محفظتك غير كافٍ.',
  INSUFFICIENT_BANK_FUNDS: 'رصيد البنك غير كافٍ.',
  BALANCE_LIMIT: 'وصل الرصيد إلى الحد الآمن المسموح.',
  ITEM_EXISTS: 'معرف المنتج أو اسمه مستخدم مسبقًا.',
  ITEM_NOT_FOUND: 'المنتج غير موجود.',
};
function remaining(ms) {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours ? hours + ' ساعة' : '', minutes ? minutes + ' دقيقة' : '', (!hours && !minutes) ? rest + ' ثانية' : '']
    .filter(Boolean).join(' و ');
}
function transactionLabel(type) {
  return ({
    daily: 'مكافأة يومية',
    work: 'مكافأة عمل',
    transfer_in: 'تحويل وارد',
    transfer_out: 'تحويل صادر',
    purchase: 'شراء من المتجر',
    deposit: 'إيداع في البنك',
    withdraw: 'سحب من البنك',
    admin_add: 'إضافة إدارية',
    admin_remove: 'خصم إداري',
    admin_set: 'تعديل إداري',
  })[type] || 'عملية مالية';
}

async function executeCommand(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: 'نظام E77 HOST الاقتصادي يعمل داخل السيرفرات فقط.', ephemeral: true });
  }
  const name = interaction.commandName;
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (ADMIN_COMMANDS.has(name) && !adminCheck(interaction)) {
    return interaction.reply({ content: 'هذا الأمر مخصص لحاملي صلاحية Administrator.', ephemeral: true });
  }

  if (name === 'help') {
    const description = [
      '**أوامر الأعضاء**',
      '/balance — عرض الرصيد',
      '/bank — المحفظة والبنك',
      '/deposit — إيداع العملات',
      '/withdraw — سحب العملات',
      '/transactions — آخر العمليات المالية',
      '/daily — المكافأة اليومية',
      '/work — كسب العملات',
      '/pay — تحويل العملات',
      '/leaderboard — ترتيب الأغنياء',
      '/shop — المتجر',
      '/buy — شراء منتج',
      '/inventory — المقتنيات',
      '/profile — الملف الاقتصادي',
      '',
      '**أوامر الإدارة**',
      '/shopadd — إضافة منتج',
      '/shopremove — حذف منتج',
      '/coinsadd — إضافة رصيد',
      '/coinsremove — سحب رصيد',
      '/coinsset — تعيين رصيد',
    ].join('\n');
    return interaction.reply({ embeds: [makeEmbed('E77 HOST — Economy System', description)], ephemeral: true });
  }

  if (name === 'balance' || name === 'profile' || name === 'bank') {
    const target = name === 'bank' ? interaction.user : (interaction.options.getUser('member') || interaction.user);
    const account = await economy.balance(guildId, target.id);
    const inventory = name === 'profile' ? await economy.inventory(guildId, target.id) : [];
    const title = name === 'profile' ? 'الملف الاقتصادي — ' : name === 'bank' ? 'حسابك البنكي' : 'رصيد ';
    const description = [
      '**المحفظة:** ' + fmt(account.balance) + ' 🪙',
      '**البنك:** ' + fmt(account.bank) + ' 🏦',
      '**إجمالي الثروة:** ' + fmt(account.balance + account.bank) + ' 🪙',
      '**إجمالي المكتسب:** ' + fmt(account.totalEarned || 0),
      '**إجمالي المصروف:** ' + fmt(account.totalSpent || 0),
      ...(name === 'profile' ? ['**المقتنيات:** ' + inventory.length] : []),
    ].join('\n');
    return interaction.reply({ embeds: [makeEmbed(title + target.username, description)], ephemeral: name === 'bank' });
  }

  if (name === 'deposit' || name === 'withdraw') {
    const amount = interaction.options.getInteger('amount', true);
    const result = name === 'deposit'
      ? await economy.deposit(guildId, userId, amount)
      : await economy.withdraw(guildId, userId, amount);
    const action = name === 'deposit' ? 'إيداع' : 'سحب';
    return interaction.reply({
      embeds: [makeEmbed('تمت عملية ' + action,
        'المبلغ: **' + fmt(amount) + '** 🪙\nالمحفظة: **' + fmt(result.balance) + '** 🪙\nالبنك: **' + fmt(result.bank) + '** 🏦')],
      ephemeral: true,
    });
  }

  if (name === 'transactions') {
    const entries = await economy.transactions(guildId, userId, 10);
    const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    const description = entries.length
      ? entries.map(entry => {
        const sign = ['transfer_out', 'purchase', 'admin_remove'].includes(entry.type) ? '−' : '+';
        return '**' + transactionLabel(entry.type) + '** · ' + sign + fmt(entry.amount) + ' 🪙\n' + date.format(new Date(entry.at));
      }).join('\n\n')
      : 'لا توجد عمليات مالية مسجلة حتى الآن.';
    return interaction.reply({ embeds: [makeEmbed('آخر 10 عمليات مالية', description)], ephemeral: true });
  }

  if (name === 'daily') {
    const result = await economy.daily(guildId, userId);
    return interaction.reply(result.ok
      ? { embeds: [makeEmbed('المكافأة اليومية', 'استلمت **' + fmt(result.amount) + '** 🪙\nرصيد المحفظة: **' + fmt(result.balance) + '** 🪙')] }
      : { content: 'استلمت مكافأتك. ارجع بعد ' + remaining(result.remaining) + '.', ephemeral: true });
  }

  if (name === 'work') {
    const result = await economy.work(guildId, userId);
    return interaction.reply(result.ok
      ? { embeds: [makeEmbed('عمل مكتمل', 'ربحت **' + fmt(result.amount) + '** 🪙\nرصيد المحفظة: **' + fmt(result.balance) + '** 🪙')] }
      : { content: 'عملت مؤخرًا. حاول بعد ' + remaining(result.remaining) + '.', ephemeral: true });
  }

  if (name === 'pay') {
    const target = interaction.options.getUser('member', true);
    const amount = interaction.options.getInteger('amount', true);
    if (target.bot) return interaction.reply({ content: 'لا يمكن تحويل العملات إلى حساب بوت.', ephemeral: true });
    const result = await economy.transfer(guildId, userId, target.id, amount);
    return interaction.reply({ embeds: [makeEmbed('تم التحويل',
      'حوّلت **' + fmt(amount) + '** 🪙 إلى ' + target + '.\nرصيدك المتبقي: **' + fmt(result.from) + '** 🪙')] });
  }

  if (name === 'leaderboard') {
    const rows = await economy.leaderboard(guildId);
    const description = rows.length
      ? rows.map((row, index) => (index + 1) + '. <@' + row.id + '> — **' + fmt(row.total) + '** 🪙').join('\n')
      : 'لا توجد أرصدة مسجلة بعد.';
    return interaction.reply({ embeds: [makeEmbed('🏆 أغنى أعضاء السيرفر', description)] });
  }

  if (name === 'shop') {
    const items = await economy.shop(guildId);
    const description = items.length
      ? items.map(item => '**' + item.name + '** — ' + fmt(item.price) + ' 🪙\n' + (item.description || 'بدون وصف') + '\nID: ' + item.id).join('\n\n').slice(0, 4000)
      : 'المتجر فارغ حاليًا.';
    return interaction.reply({ embeds: [makeEmbed('🛒 متجر السيرفر', description)] });
  }

  if (name === 'buy') {
    const result = await economy.buy(guildId, userId, interaction.options.getString('item_id', true));
    return interaction.reply({ embeds: [makeEmbed('تم الشراء',
      'اشتريت **' + result.item.name + '** مقابل **' + fmt(result.item.price) + '** 🪙.\nرصيدك المتبقي **' + fmt(result.balance) + '** 🪙.\nتم تسجيل العنصر في مقتنياتك.')] });
  }

  if (name === 'inventory') {
    const target = interaction.options.getUser('member') || interaction.user;
    const items = await economy.inventory(guildId, target.id);
    const counts = {};
    for (const item of items) counts[item.name] = (counts[item.name] || 0) + 1;
    const description = Object.keys(counts).length
      ? Object.entries(counts).map(([item, count]) => '• **' + item + '** × ' + count).join('\n').slice(0, 4000)
      : 'الحقيبة فارغة.';
    return interaction.reply({ embeds: [makeEmbed('مقتنيات ' + target.username, description)], ephemeral: true });
  }

  if (name === 'shopadd') {
    const id = interaction.options.getString('item_id', true).toLowerCase();
    const productName = interaction.options.getString('name', true).trim();
    const price = interaction.options.getInteger('price', true);
    const description = interaction.options.getString('description') || '';
    if (!/^[a-z0-9_-]{2,32}$/.test(id)) {
      return interaction.reply({ content: 'المعرف يجب أن يكون 2–32 حرفًا إنجليزيًا أو رقمًا أو _ أو -.', ephemeral: true });
    }
    if (!productName) return interaction.reply({ content: 'اسم المنتج لا يمكن أن يكون فارغًا.', ephemeral: true });
    await economy.addItem(guildId, { id, name: productName, price, description, createdAt: Date.now() });
    return interaction.reply({ content: 'تمت إضافة **' + productName + '** بسعر **' + fmt(price) + '** 🪙.', ephemeral: true });
  }

  if (name === 'shopremove') {
    const item = await economy.removeItem(guildId, interaction.options.getString('item_id', true));
    return interaction.reply({ content: 'تم حذف **' + item.name + '** من المتجر.', ephemeral: true });
  }

  if (['coinsadd', 'coinsremove', 'coinsset'].includes(name)) {
    const target = interaction.options.getUser('member', true);
    const amount = interaction.options.getInteger('amount', true);
    if (target.bot) return interaction.reply({ content: 'لا يمكن تعديل رصيد حساب بوت.', ephemeral: true });
    const mode = { coinsadd: 'add', coinsremove: 'remove', coinsset: 'set' }[name];
    const result = await economy.adminAdjust(guildId, target.id, amount, mode);
    return interaction.reply({ content: 'تم تحديث رصيد ' + target + '. الرصيد الحالي **' + fmt(result.balance) + '** 🪙.', ephemeral: true });
  }
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;
  try {
    await executeCommand(interaction);
  } catch (error) {
    const message = errors[error.message] || 'تعذر تنفيذ العملية. حاول لاحقًا.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
    console.error('[ECONOMY] ' + interaction.commandName + ' failed: ' +
      String(error.message || 'error').replace(/[^a-z0-9_]/gi, '').slice(0, 40));
  }
}

async function registerCommands(client) {
  if (!client.application?.commands) throw new Error('Discord application commands are not ready.');
  const guildId = process.env.DISCORD_GUILD_ID;
  const result = await client.application.commands.set(commands, guildId || undefined);
  console.log('[COMMANDS] Registered ' + result.size + ' E77 HOST economy commands.');
}

module.exports = { commands, ADMIN_COMMANDS, executeCommand, handleInteraction, registerCommands };
