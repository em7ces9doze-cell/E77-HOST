'use strict';

/*
 * E77 BOT — single-file Discord bot with Manus Bridge Support
 * Runtime: Node.js 22+
 * Required environment variables: DISCORD_TOKEN, CLIENT_ID, EM7_CONTROL_BOT_BRIDGE_SECRET
 * Optional: GUILD_ID (recommended for instant command registration), PORT
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration and startup validation
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const CLIENT_ID = process.env.CLIENT_ID?.trim();
const GUILD_ID = process.env.GUILD_ID?.trim() || null;
const BRIDGE_SECRET = process.env.EM7_CONTROL_BOT_BRIDGE_SECRET?.trim();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);

if (!TOKEN) {
  console.error('[CONFIG] Missing DISCORD_TOKEN. Add it to FadeHost environment variables.');
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error('[CONFIG] Missing CLIENT_ID. Add your Discord application ID to FadeHost environment variables.');
  process.exit(1);
}

if (GUILD_ID && !/^\d{17,20}$/.test(GUILD_ID)) {
  console.error('[CONFIG] GUILD_ID must be a valid Discord server ID.');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'e77-data.json');

function log(level, message, extra) {
  const stamp = new Date().toISOString();
  const suffix = extra ? ` | ${String(extra)}` : '';
  console.log(`[${stamp}] [${level}] ${message}${suffix}`);
}

function defaultStore() {
  return { warnings: [], guildSettings: {} };
}

function loadStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore(), null, 2));
      return defaultStore();
    }
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      guildSettings: parsed.guildSettings && typeof parsed.guildSettings === 'object'
        ? parsed.guildSettings
        : {}
    };
  } catch (error) {
    log('ERROR', 'Could not load local data; starting with an empty store', error.message);
    return defaultStore();
  }
}

let store = loadStore();

function saveStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (error) {
    log('ERROR', 'Could not save local data', error.message);
    return false;
  }
}

function guildSettings(guildId) {
  if (!store.guildSettings[guildId]) {
    store.guildSettings[guildId] = { welcome: null, autoroleId: null };
  }
  return store.guildSettings[guildId];
}

// ─────────────────────────────────────────────────────────────────────────────
// Slash command definitions
// ─────────────────────────────────────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('عرض سرعة استجابة البوت.'),
  new SlashCommandBuilder().setName('help').setDescription('عرض قائمة أوامر E77.'),
  new SlashCommandBuilder().setName('server').setDescription('عرض معلومات السيرفر الحالي.'),
  new SlashCommandBuilder()
    .setName('user')
    .setDescription('عرض معلومات عضو في السيرفر.')
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(false)),
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('عرض صورة حساب عضو.')
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(false)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('سبب الحظر').setMaxLength(500).setRequired(false))
    .addIntegerOption(option => option.setName('delete_days').setDescription('حذف رسائل آخر كم يوم؟').addChoices(
      { name: 'لا تحذف', value: 0 }, { name: 'يوم واحد', value: 1 }, { name: '7 أيام', value: 7 }
    ).setRequired(false)),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('سبب الطرد').setMaxLength(500).setRequired(false)),
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('إعطاء عضو مهلة زمنية.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(true))
    .addIntegerOption(option => option.setName('minutes').setDescription('المدة بالدقائق (1 إلى 40320)').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('السبب').setMaxLength(500).setRequired(false)),
  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('إزالة المهلة الزمنية عن عضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('السبب').setMaxLength(500).setRequired(false)),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('إضافة إنذار محفوظ لعضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('سبب الإنذار').setMaxLength(500).setRequired(true)),
  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('عرض إنذارات عضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName('member').setDescription('العضو المطلوب').setRequired(true)),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('حذف عدد من الرسائل الحديثة في القناة.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل (1 إلى 100)').setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder()
    .setName('channel-create')
    .setDescription('إنشاء قناة جديدة.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option => option.setName('name').setDescription('اسم القناة').setMinLength(1).setMaxLength(90).setRequired(true))
    .addStringOption(option => option.setName('type').setDescription('نوع القناة').addChoices(
      { name: 'نصية', value: 'text' }, { name: 'صوتية', value: 'voice' }, { name: 'إعلانات', value: 'announcement' }
    ).setRequired(true))
    .addChannelOption(option => option.setName('category').setDescription('التصنيف').addChannelTypes(ChannelType.GuildCategory).setRequired(false)),
  new SlashCommandBuilder()
    .setName('channel-delete')
    .setDescription('حذف قناة من السيرفر.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(true)),
  new SlashCommandBuilder()
    .setName('role-create')
    .setDescription('إنشاء رتبة جديدة.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(option => option.setName('name').setDescription('اسم الرتبة').setMinLength(1).setMaxLength(100).setRequired(true))
    .addStringOption(option => option.setName('color').setDescription('لون Hex مثل #5865F2').setRequired(false)),
  new SlashCommandBuilder()
    .setName('role-delete')
    .setDescription('حذف رتبة.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
  new SlashCommandBuilder()
    .setName('role-add')
    .setDescription('إعطاء رتبة لعضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option => option.setName('member').setDescription('العضو').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
  new SlashCommandBuilder()
    .setName('role-remove')
    .setDescription('سحب رتبة من عضو.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option => option.setName('member').setDescription('العضو').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('تحديد وضع التباطؤ لقناة نصية بالثواني.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(option => option.setName('seconds').setDescription('0 لإيقافه').setMinValue(0).setMaxValue(21600).setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false)),
  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('قفل قناة.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false)),
  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('فتح قناة.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false)),
  new SlashCommandBuilder()
    .setName('welcome-set')
    .setDescription('تفعيل رسالة ترحيب.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option => option.setName('channel').setDescription('قناة الترحيب').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('النص ({user}, {server}, {username})').setMaxLength(1000).setRequired(true)),
  new SlashCommandBuilder()
    .setName('welcome-off')
    .setDescription('إيقاف الترحيب.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('autorole-set')
    .setDescription('تحديد رتبة تلقائية.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
  new SlashCommandBuilder()
    .setName('autorole-off')
    .setDescription('إيقاف الرتبة التلقائية.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
];

// ─────────────────────────────────────────────────────────────────────────────
// Discord client
// ─────────────────────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.User, Partials.GuildMember]
});

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  const body = commands.map(command => command.toJSON());
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  log('INFO', `Registering ${body.length} slash commands...`);
  await rest.put(route, { body });
  log('INFO', `Successfully registered ${body.length} slash commands.`);
}

function hasPermission(interaction, permission) {
  return Boolean(interaction.memberPermissions?.has(permission));
}

async function requirePermission(interaction, permission) {
  if (hasPermission(interaction, permission)) return true;
  await interaction.reply({
    content: 'ليس لديك الصلاحية المطلوبة لتنفيذ هذا الأمر.',
    flags: MessageFlags.Ephemeral
  });
  return false;
}

async function getGuildMember(guild, userId) {
  try {
    return await guild.members.fetch(userId);
  } catch {
    return null;
  }
}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

async function replyError(interaction, message) {
  const payload = { content: message, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload).catch(() => null);
  }
  return interaction.reply(payload).catch(() => null);
}

function cleanReason(reason, fallback = 'لم يتم تحديد سبب') {
  return (reason || fallback).trim().slice(0, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Command execution
// ─────────────────────────────────────────────────────────────────────────────

async function executeCommand(interaction) {
  const { commandName, guild, user } = interaction;

  if (!guild && commandName !== 'ping' && commandName !== 'help') {
    return replyError(interaction, 'هذا الأمر يعمل داخل السيرفر فقط.');
  }

  switch (commandName) {
    case 'ping': {
      const latency = Math.max(0, Math.round(client.ws.ping));
      return interaction.reply({ embeds: [makeEmbed('E77 PING', `سرعة بوابة Discord: **${latency}ms**`)] });
    }
    case 'help': {
      const description = [
        '**عام:** `/ping` `/help` `/server` `/user` `/avatar`',
        '**إشراف:** `/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clear`',
        '**قنوات:** `/channel-create` `/channel-delete` `/slowmode` `/lock` `/unlock`',
        '**رتب:** `/role-create` `/role-delete` `/role-add` `/role-remove`',
        '**إعدادات:** `/welcome-set` `/welcome-off` `/autorole-set` `/autorole-off`'
      ].join('\n');
      return interaction.reply({ embeds: [makeEmbed('قائمة أوامر E77', description)] });
    }
    case 'server': {
      const owner = await guild.fetchOwner().catch(() => null);
      const embed = makeEmbed(`معلومات ${guild.name}`, [
        `**معرّف السيرفر:** ${guild.id}`,
        `**المالك:** ${owner ? owner.user.tag : 'غير متاح'}`,
        `**الأعضاء:** ${guild.memberCount}`,
        `**القنوات:** ${guild.channels.cache.size}`,
        `**الرتب:** ${guild.roles.cache.size}`
      ].join('\n'));
      if (guild.iconURL()) embed.setThumbnail(guild.iconURL({ size: 256 }));
      return interaction.reply({ embeds: [embed] });
    }
    case 'user': {
      const target = interaction.options.getUser('member') || user;
      const member = await getGuildMember(guild, target.id);
      const embed = makeEmbed(`معلومات ${target.tag}`, [
        `**معرّف المستخدم:** ${target.id}`,
        `**تاريخ إنشاء الحساب:** <t:${Math.floor(target.createdTimestamp / 1000)}:F>`,
        `**انضم للسيرفر:** ${member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'غير متاح'}`
      ].join('\n'));
      embed.setThumbnail(target.displayAvatarURL({ size: 512 }));
      return interaction.reply({ embeds: [embed] });
    }
    case 'avatar': {
      const target = interaction.options.getUser('member') || user;
      const avatar = target.displayAvatarURL({ size: 1024, extension: 'png' });
      const embed = makeEmbed(`صورة ${target.username}`, `[فتح الصورة](${avatar})`).setImage(avatar);
      return interaction.reply({ embeds: [embed] });
    }
    case 'ban': {
      if (!await requirePermission(interaction, PermissionFlagsBits.BanMembers)) return;
      const target = interaction.options.getUser('member', true);
      const reason = cleanReason(interaction.options.getString('reason'));
      const days = interaction.options.getInteger('delete_days') ?? 0;
      await guild.members.ban(target.id, { reason, deleteMessageSeconds: days * 86400 });
      return interaction.reply({ embeds: [makeEmbed('تم الحظر', `تم حظر **${target.tag}**.`)] });
    }
    case 'kick': {
      if (!await requirePermission(interaction, PermissionFlagsBits.KickMembers)) return;
      const target = interaction.options.getUser('member', true);
      const member = await getGuildMember(guild, target.id);
      if (!member) return replyError(interaction, 'العضو غير موجود.');
      const reason = cleanReason(interaction.options.getString('reason'));
      await member.kick(reason);
      return interaction.reply({ embeds: [makeEmbed('تم الطرد', `تم طرد **${target.tag}**.`)] });
    }
    case 'timeout': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const target = interaction.options.getUser('member', true);
      const member = await getGuildMember(guild, target.id);
      if (!member) return replyError(interaction, 'العضو غير موجود.');
      const minutes = interaction.options.getInteger('minutes', true);
      const reason = cleanReason(interaction.options.getString('reason'));
      await member.timeout(minutes * 60 * 1000, reason);
      return interaction.reply({ embeds: [makeEmbed('تم تطبيق المهلة', `العضو: **${target.tag}** (${minutes} دقيقة)`)] });
    }
    case 'untimeout': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const target = interaction.options.getUser('member', true);
      const member = await getGuildMember(guild, target.id);
      if (!member) return replyError(interaction, 'العضو غير موجود.');
      await member.timeout(null, cleanReason(interaction.options.getString('reason'), 'إزالة المهلة'));
      return interaction.reply({ embeds: [makeEmbed('تمت إزالة المهلة', `عن **${target.tag}**.`)] });
    }
    case 'warn': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const target = interaction.options.getUser('member', true);
      const reason = cleanReason(interaction.options.getString('reason'), 'بدون سبب');
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        guildId: guild.id,
        userId: target.id,
        moderatorId: user.id,
        reason,
        createdAt: new Date().toISOString()
      };
      store.warnings.push(entry);
      if (!saveStore()) return replyError(interaction, 'تعذر حفظ الإنذار.');
      const count = store.warnings.filter(item => item.guildId === guild.id && item.userId === target.id).length;
      return interaction.reply({ embeds: [makeEmbed('تم تسجيل الإنذار', `العضو: **${target.tag}** (الإنذار رقم ${count})`)] });
    }
    case 'warnings': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
      const target = interaction.options.getUser('member', true);
      const entries = store.warnings.filter(item => item.guildId === guild.id && item.userId === target.id);
      if (!entries.length) return interaction.reply({ content: `لا توجد إنذارات لـ **${target.tag}**.` });
      const lines = entries.slice(0, 5).map((item, idx) => `**${idx + 1}.** ${item.reason}`);
      return interaction.reply({ embeds: [makeEmbed(`إنذارات ${target.tag} (${entries.length})`, lines.join('\n'))] });
    }
    case 'clear': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageMessages)) return;
      const amount = interaction.options.getInteger('amount', true);
      const channel = interaction.channel;
      if (!channel || typeof channel.bulkDelete !== 'function') return replyError(interaction, 'لا يمكن الحذف هنا.');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const deleted = await channel.bulkDelete(amount, true);
      return interaction.editReply(`تم حذف **${deleted.size}** رسالة.`);
    }
    case 'channel-create': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageChannels)) return;
      const name = interaction.options.getString('name', true).trim();
      const typeValue = interaction.options.getString('type', true);
      const category = interaction.options.getChannel('category');
      const typeMap = { text: ChannelType.GuildText, voice: ChannelType.GuildVoice, announcement: ChannelType.GuildAnnouncement };
      const created = await guild.channels.create({ name, type: typeMap[typeValue], parent: category?.id || null });
      return interaction.reply({ embeds: [makeEmbed('تم إنشاء القناة', `القناة: ${created}`)] });
    }
    case 'channel-delete': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageChannels)) return;
      const channel = interaction.options.getChannel('channel', true);
      await channel.delete();
      return interaction.reply({ embeds: [makeEmbed('تم الحذف', 'تم حذف القناة.')] });
    }
    case 'role-create': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageRoles)) return;
      const name = interaction.options.getString('name', true).trim();
      const role = await guild.roles.create({ name });
      return interaction.reply({ embeds: [makeEmbed('تم إنشاء الرتبة', `الرتبة: ${role}`)] });
    }
    case 'role-delete': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageRoles)) return;
      const role = interaction.options.getRole('role', true);
      await role.delete();
      return interaction.reply({ embeds: [makeEmbed('تم حذف الرتبة', `رتبة ${role.name}`)] });
    }
    case 'role-add':
    case 'role-remove': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageRoles)) return;
      const target = interaction.options.getUser('member', true);
      const role = interaction.options.getRole('role', true);
      const member = await getGuildMember(guild, target.id);
      if (!member) return replyError(interaction, 'العضو غير موجود.');
      if (commandName === 'role-add') await member.roles.add(role);
      else await member.roles.remove(role);
      return interaction.reply({ embeds: [makeEmbed('تم تحديث الرتب', `الرتبة: ${role} للعضو ${target.tag}`)] });
    }
    case 'slowmode': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageChannels)) return;
      const seconds = interaction.options.getInteger('seconds', true);
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await channel.setRateLimitPerUser(seconds);
      return interaction.reply({ embeds: [makeEmbed('تم التباطؤ', `${seconds} ثانية`)] });
    }
    case 'lock':
    case 'unlock': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageChannels)) return;
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const value = commandName === 'lock' ? false : null;
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: value });
      return interaction.reply({ embeds: [makeEmbed(commandName === 'lock' ? 'تم القفل' : 'تم الفتح', `${channel}`)] });
    }
    case 'welcome-set': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageGuild)) return;
      const channel = interaction.options.getChannel('channel', true);
      const message = interaction.options.getString('message', true);
      guildSettings(guild.id).welcome = { channelId: channel.id, message };
      saveStore();
      return interaction.reply({ embeds: [makeEmbed('تم ضبط الترحيب', `${channel}`)] });
    }
    case 'welcome-off': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageGuild)) return;
      guildSettings(guild.id).welcome = null;
      saveStore();
      return interaction.reply({ content: 'تم إيقاف الترحيب.' });
    }
    case 'autorole-set': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageRoles)) return;
      const role = interaction.options.getRole('role', true);
      guildSettings(guild.id).autoroleId = role.id;
      saveStore();
      return interaction.reply({ embeds: [makeEmbed('تم ضبط الرتبة التلقائية', `${role}`)] });
    }
    case 'autorole-off': {
      if (!await requirePermission(interaction, PermissionFlagsBits.ManageRoles)) return;
      guildSettings(guild.id).autoroleId = null;
      saveStore();
      return interaction.reply({ content: 'تم إيقاف الرتبة التلقائية.' });
    }
    default:
      return replyError(interaction, 'أمر غير معروف.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Discord Events
// ─────────────────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async readyClient => {
  log('READY', `Connected to Discord as ${readyClient.user.tag}`);
  readyClient.user.setPresence({ activities: [{ name: 'E77 | /help', type: 0 }], status: 'online' });
  try {
    await registerCommands();
  } catch (error) {
    log('ERROR', 'Command registration failed', error.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await executeCommand(interaction);
  } catch (error) {
    log('ERROR', `Command /${interaction.commandName} failed`, error.message);
    await replyError(interaction, 'حدث خطأ أثناء تنفيذ الأمر.');
  }
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    const settings = guildSettings(member.guild.id);
    if (settings.autoroleId) {
      const role = await member.guild.roles.fetch(settings.autoroleId).catch(() => null);
      if (role) await member.roles.add(role).catch(() => {});
    }
    if (settings.welcome?.channelId && settings.welcome?.message) {
      const channel = await member.guild.channels.fetch(settings.welcome.channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const content = settings.welcome.message
          .replaceAll('{user}', `<@${member.id}>`)
          .replaceAll('{server}', member.guild.name)
          .replaceAll('{username}', member.user.username);
        await channel.send({ content, allowedMentions: { users: [member.id] } }).catch(() => {});
      }
    }
  } catch (error) {
    log('ERROR', 'GuildMemberAdd failed', error.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Server for Manus Bridge Integration & Health Check
// ─────────────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // تحليل الـ Headers والتحقق من سر الجسر
  const reqSecret = req.headers['x-bridge-secret'] || req.headers['authorization'] || '';
  
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      status: 'running', 
      botReady: client.isReady(), 
      uptimeSeconds: Math.floor(process.uptime()),
      bridgeConnected: Boolean(BRIDGE_SECRET)
    }));
    return;
  }

  // نقطة اتصال الجسر الخاصة بـ Manus
  if (req.url.startsWith('/bridge') || req.url.startsWith('/api/bridge')) {
    if (!BRIDGE_SECRET || reqSecret !== BRIDGE_SECRET) {
      res.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing bridge secret' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      success: true, 
      message: 'EM7 SYSTEM Bridge connected successfully',
      botTag: client.user?.tag || null,
      guildsCount: client.guilds.cache.size
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  log('INFO', `Bridge & Health server listening on port ${PORT}.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

client.login(TOKEN).then(() => {
  log('INFO', 'Discord login request accepted.');
}).catch(error => {
  log('FATAL', 'Discord login failed', error.message);
  process.exit(1);
});
