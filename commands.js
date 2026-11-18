'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const ADMIN = PermissionFlagsBits.Administrator;
const commands = [];

function memberCommand(name, description) {
  return new SlashCommandBuilder().setName(name).setDescription(description);
}
function adminCommand(name, description) {
  return memberCommand(name, description).setDefaultMemberPermissions(ADMIN);
}

commands.push(
  memberCommand('help', 'عرض قائمة أوامر E7 BOT').toJSON(),
  memberCommand('ping', 'قياس سرعة استجابة البوت').toJSON(),
  memberCommand('botinfo', 'عرض معلومات البوت').toJSON(),
  memberCommand('serverinfo', 'عرض معلومات السيرفر').toJSON(),
  memberCommand('userinfo', 'عرض معلومات عضو').addUserOption(o => o.setName('member').setDescription('العضو المطلوب').setRequired(false)).toJSON(),
  memberCommand('avatar', 'عرض صورة عضو').addUserOption(o => o.setName('member').setDescription('العضو المطلوب').setRequired(false)).toJSON(),
  memberCommand('roleinfo', 'عرض معلومات رتبة').addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)).toJSON(),
  memberCommand('channelinfo', 'عرض معلومات قناة').addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(false)).toJSON(),
  memberCommand('poll', 'إنشاء تصويت سريع').addStringOption(o => o.setName('question').setDescription('موضوع التصويت').setMaxLength(180).setRequired(true)).addStringOption(o => o.setName('option1').setDescription('الخيار الأول').setMaxLength(60).setRequired(true)).addStringOption(o => o.setName('option2').setDescription('الخيار الثاني').setMaxLength(60).setRequired(true)).toJSON(),

  adminCommand('clear', 'حذف عدد من الرسائل (حتى 100)').addIntegerOption(o => o.setName('amount').setDescription('عدد الرسائل من 1 إلى 100').setMinValue(1).setMaxValue(100).setRequired(true)).toJSON(),
  adminCommand('slowmode', 'تحديد مهلة الكتابة في القناة').addIntegerOption(o => o.setName('seconds').setDescription('من 0 إلى 21600 ثانية').setMinValue(0).setMaxValue(21600).setRequired(true)).toJSON(),
  adminCommand('lock', 'قفل القناة الحالية أمام الأعضاء').toJSON(),
  adminCommand('unlock', 'فتح القناة الحالية أمام الأعضاء').toJSON(),
  adminCommand('announce', 'نشر إعلان في قناة محددة').addChannelOption(o => o.setName('channel').setDescription('قناة الإعلان').addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption(o => o.setName('message').setDescription('نص الإعلان').setMaxLength(1800).setRequired(true)).toJSON(),
  adminCommand('kick', 'طرد عضو من السيرفر').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('السبب').setMaxLength(400).setRequired(false)).toJSON(),
  adminCommand('ban', 'حظر عضو من السيرفر').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('السبب').setMaxLength(400).setRequired(false)).toJSON(),
  adminCommand('timeout', 'تقييد عضو مؤقتًا').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('المدة بالدقائق (1 إلى 40320)').setMinValue(1).setMaxValue(40320).setRequired(true)).addStringOption(o => o.setName('reason').setDescription('السبب').setMaxLength(400).setRequired(false)).toJSON(),
  adminCommand('untimeout', 'إزالة التقييد المؤقت عن عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).toJSON(),
  adminCommand('nickname', 'تغيير اسم عضو داخل السيرفر').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o => o.setName('name').setDescription('الاسم الجديد؛ اتركه فارغًا لإزالة الاسم المستعار').setMaxLength(32).setRequired(false)).toJSON(),
  adminCommand('createchannel', 'إنشاء قناة نصية أو صوتية').addStringOption(o => o.setName('name').setDescription('اسم القناة').setMaxLength(90).setRequired(true)).addStringOption(o => o.setName('type').setDescription('نوع القناة').addChoices({ name: 'نصية', value: 'text' }, { name: 'صوتية', value: 'voice' }).setRequired(true)).toJSON(),
  adminCommand('createrole', 'إنشاء رتبة بلون محدد').addStringOption(o => o.setName('name').setDescription('اسم الرتبة').setMaxLength(100).setRequired(true)).addStringOption(o => o.setName('color').setDescription('لون Hex مثل #8b5cf6').setRequired(false)).toJSON(),
  adminCommand('addrole', 'إسناد رتبة إلى عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)).toJSON(),
  adminCommand('removerole', 'إزالة رتبة من عضو').addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)).toJSON(),
);

const ADMIN_COMMANDS = new Set([
  'clear', 'slowmode', 'lock', 'unlock', 'announce', 'kick', 'ban',
  'timeout', 'untimeout', 'nickname', 'createchannel', 'createrole', 'addrole', 'removerole',
]);

function hasPermission(interaction, permission) {
  return Boolean(interaction.memberPermissions?.has(permission));
}

function safeReason(value, fallback) {
  return (value && value.trim()) || fallback;
}

async function requireBotPermission(interaction, permission) {
  const me = interaction.guild.members.me || await interaction.guild.members.fetchMe();
  if (!me.permissions.has(permission)) {
    await interaction.reply({ content: 'البوت لا يملك الصلاحية المطلوبة لتنفيذ هذا الأمر.', ephemeral: true });
    return false;
  }
  return true;
}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x7653D8)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

async function executeCommand(interaction) {
  const name = interaction.commandName;
  if (ADMIN_COMMANDS.has(name) && !hasPermission(interaction, ADMIN)) {
    return interaction.reply({ content: 'هذا الأمر مخصص لأعضاء السيرفر الذين يملكون صلاحية Administrator.', ephemeral: true });
  }

  if (name === 'ping') {
    return interaction.reply({ content: `Pong! API: **${Math.round(interaction.client.ws.ping)}ms**`, ephemeral: true });
  }

  if (name === 'help') {
    const embed = makeEmbed('E7 BOT — مركز الأوامر', [
      '**أوامر الأعضاء**',
      '`/ping` قياس الاستجابة',
      '`/botinfo` معلومات البوت',
      '`/serverinfo` معلومات السيرفر',
      '`/userinfo` معلومات عضو',
      '`/avatar` صورة عضو',
      '`/roleinfo` معلومات رتبة',
      '`/channelinfo` معلومات قناة',
      '`/poll` إنشاء تصويت',
      '',
      '**أوامر Administrator**',
      '`/clear` حذف رسائل',
      '`/slowmode` مهلة الكتابة',
      '`/lock` و `/unlock` قفل وفتح القناة',
      '`/announce` إعلان',
      '`/kick` و `/ban` إدارة العضوية',
      '`/timeout` و `/untimeout` التقييد المؤقت',
      '`/nickname` تغيير اسم عضو',
      '`/createchannel` إنشاء قناة',
      '`/createrole` إنشاء رتبة',
    ].join('\n'));
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (name === 'botinfo') {
    const user = interaction.client.user;
    const embed = makeEmbed('معلومات E7 BOT', `**الاسم:** ${user.tag}\n**المعرّف:** ${user.id}\n**السيرفرات:** ${interaction.client.guilds.cache.size}\n**مكتبة التشغيل:** discord.js v14`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (name === 'serverinfo') {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const embed = makeEmbed(guild.name, `**المالك:** ${owner.user.tag}\n**الأعضاء:** ${guild.memberCount}\n**القنوات:** ${guild.channels.cache.size}\n**الأدوار:** ${guild.roles.cache.size}\n**تاريخ الإنشاء:** <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`);
    if (guild.iconURL()) embed.setThumbnail(guild.iconURL({ size: 256 }));
    return interaction.reply({ embeds: [embed] });
  }

  if (name === 'userinfo') {
    const user = interaction.options.getUser('member') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const embed = makeEmbed('معلومات العضو', `**الحساب:** ${user.tag}\n**المعرّف:** ${user.id}\n**انضم للسيرفر:** ${member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'غير موجود في السيرفر'}\n**إنشاء الحساب:** <t:${Math.floor(user.createdTimestamp / 1000)}:D>`);
    if (user.displayAvatarURL()) embed.setThumbnail(user.displayAvatarURL({ size: 256 }));
    return interaction.reply({ embeds: [embed] });
  }

  if (name === 'avatar') {
    const user = interaction.options.getUser('member') || interaction.user;
    const url = user.displayAvatarURL({ size: 1024 });
    return interaction.reply({ content: `صورة **${user.tag}**\n${url}` });
  }

  if (name === 'roleinfo') {
    const role = interaction.options.getRole('role');
    const embed = makeEmbed(`الرتبة: ${role.name}`, `**المعرّف:** ${role.id}\n**الأعضاء:** ${role.members.size}\n**اللون:** ${role.hexColor}\n**الترتيب:** ${role.position}\n**مدارة من تكامل:** ${role.managed ? 'نعم' : 'لا'}`);
    return interaction.reply({ embeds: [embed] });
  }

  if (name === 'channelinfo') {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const embed = makeEmbed(`القناة: #${channel.name || 'غير مسماة'}`, `**المعرّف:** ${channel.id}\n**النوع:** ${channel.type}\n**تاريخ الإنشاء:** <t:${Math.floor(channel.createdTimestamp / 1000)}:D>`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (name === 'poll') {
    const question = interaction.options.getString('question', true);
    const first = interaction.options.getString('option1', true);
    const second = interaction.options.getString('option2', true);
    const message = await interaction.channel.send({
      embeds: [makeEmbed(`تصويت: ${question}`, `👍 **${first}**\n👎 **${second}**\n\nالتصويت مفتوح لأعضاء القناة.`)],
      allowedMentions: { parse: [] },
    });
    await message.react('👍');
    await message.react('👎');
    return interaction.reply({ content: `تم نشر التصويت: ${message.url}`, ephemeral: true });
  }

  if (name === 'clear') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ManageMessages)) return;
    const amount = interaction.options.getInteger('amount', true);
    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `تم حذف **${deleted.size}** رسالة. الرسائل الأقدم من 14 يومًا لا يحذفها Discord بهذه الطريقة.`, ephemeral: true });
  }

  if (name === 'slowmode') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ManageChannels)) return;
    const seconds = interaction.options.getInteger('seconds', true);
    await interaction.channel.setRateLimitPerUser(seconds, `E7 BOT by ${interaction.user.tag}`);
    return interaction.reply({ content: seconds ? `تم ضبط Slowmode على ${seconds} ثانية.` : 'تم إيقاف Slowmode.', ephemeral: true });
  }

  if (name === 'lock' || name === 'unlock') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ManageChannels)) return;
    const locked = name === 'lock';
    const permission = interaction.channel.isVoiceBased() ? 'Connect' : 'SendMessages';
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      [permission]: locked ? false : null,
    }, { reason: `E7 BOT: ${name} by ${interaction.user.tag}` });
    return interaction.reply({ content: locked ? 'تم قفل القناة أمام الأعضاء.' : 'تم فتح القناة.' });
  }

  if (name === 'announce') {
    const channel = interaction.options.getChannel('channel', true);
    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
    if (!channel.permissionsFor(botMember)?.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({ content: 'البوت لا يملك صلاحية إرسال الرسائل في قناة الإعلان المحددة.', ephemeral: true });
    }
    const message = interaction.options.getString('message', true);
    await channel.send({ embeds: [makeEmbed('إعلان السيرفر', message)], allowedMentions: { parse: [] } });
    return interaction.reply({ content: `تم نشر الإعلان في ${channel}.`, ephemeral: true });
  }

  if (name === 'kick' || name === 'ban') {
    const user = interaction.options.getUser('member', true);
    const reason = safeReason(interaction.options.getString('reason'), `By ${interaction.user.tag}`);
    const member = await interaction.guild.members.fetch(user.id);
    if (member.id === interaction.guild.ownerId || member.id === interaction.user.id) {
      return interaction.reply({ content: 'لا يمكن تنفيذ هذا الإجراء على مالك السيرفر أو على حسابك.', ephemeral: true });
    }
    if (name === 'kick') {
      if (!await requireBotPermission(interaction, PermissionFlagsBits.KickMembers)) return;
      await member.kick(reason);
      return interaction.reply({ content: `تم طرد **${user.tag}**. السبب: ${reason}`, ephemeral: true });
    }
    if (!await requireBotPermission(interaction, PermissionFlagsBits.BanMembers)) return;
    await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds: 0 });
    return interaction.reply({ content: `تم حظر **${user.tag}**. السبب: ${reason}`, ephemeral: true });
  }

  if (name === 'timeout' || name === 'untimeout') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ModerateMembers)) return;
    const user = interaction.options.getUser('member', true);
    const member = await interaction.guild.members.fetch(user.id);
    if (member.id === interaction.guild.ownerId || member.id === interaction.user.id) {
      return interaction.reply({ content: 'لا يمكن تنفيذ هذا الإجراء على مالك السيرفر أو على حسابك.', ephemeral: true });
    }
    if (name === 'timeout') {
      const minutes = interaction.options.getInteger('minutes', true);
      const reason = safeReason(interaction.options.getString('reason'), `By ${interaction.user.tag}`);
      await member.timeout(minutes * 60 * 1000, reason);
      return interaction.reply({ content: `تم تقييد **${user.tag}** لمدة ${minutes} دقيقة.`, ephemeral: true });
    }
    await member.timeout(null, `Timeout removed by ${interaction.user.tag}`);
    return interaction.reply({ content: `تمت إزالة التقييد عن **${user.tag}**.`, ephemeral: true });
  }

  if (name === 'nickname') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ManageNicknames)) return;
    const user = interaction.options.getUser('member', true);
    const member = await interaction.guild.members.fetch(user.id);
    const nickname = interaction.options.getString('name');
    await member.setNickname(nickname, `E7 BOT by ${interaction.user.tag}`);
    return interaction.reply({ content: nickname ? `تم تغيير اسم ${user.tag} إلى **${nickname}**.` : `تمت إزالة الاسم المستعار عن ${user.tag}.`, ephemeral: true });
  }

  if (name === 'createchannel') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ManageChannels)) return;
    const channelName = interaction.options.getString('name', true);
    const type = interaction.options.getString('type', true);
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: type === 'text' ? ChannelType.GuildText : ChannelType.GuildVoice,
      reason: `E7 BOT by ${interaction.user.tag}`,
    });
    return interaction.reply({ content: `تم إنشاء القناة ${channel} بنجاح.`, ephemeral: true });
  }

  if (name === 'addrole' || name === 'removerole') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ManageRoles)) return;
    const user = interaction.options.getUser('member', true);
    const role = interaction.options.getRole('role', true);
    const member = await interaction.guild.members.fetch(user.id);
    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
    if (role.managed || role.id === interaction.guild.id || role.position >= botMember.roles.highest.position) {
      return interaction.reply({ content: 'ترتيب الرتبة أو حالتها يمنع البوت من إدارتها.', ephemeral: true });
    }
    if (name === 'addrole') await member.roles.add(role, `E7 BOT by ${interaction.user.tag}`);
    else await member.roles.remove(role, `E7 BOT by ${interaction.user.tag}`);
    return interaction.reply({ content: name === 'addrole' ? `تم إسناد ${role} إلى **${user.tag}**.` : `تمت إزالة ${role} من **${user.tag}**.`, ephemeral: true });
  }

  if (name === 'createrole') {
    if (!await requireBotPermission(interaction, PermissionFlagsBits.ManageRoles)) return;
    const roleName = interaction.options.getString('name', true);
    const color = interaction.options.getString('color') || '#8b5cf6';
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      return interaction.reply({ content: 'صيغة اللون غير صحيحة. استخدم Hex مثل #8b5cf6.', ephemeral: true });
    }
    const role = await interaction.guild.roles.create({
      name: roleName,
      color: Number.parseInt(color.slice(1), 16),
      reason: `E7 BOT by ${interaction.user.tag}`,
    });
    return interaction.reply({ content: `تم إنشاء الرتبة ${role} بنجاح.`, ephemeral: true });
  }
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;
  try {
    await executeCommand(interaction);
  } catch (error) {
    const response = { content: 'تعذر تنفيذ الأمر. تحقق من صلاحيات البوت ورتبته وإعدادات القناة.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
    const code = typeof error?.code === 'number' || typeof error?.code === 'string' ? String(error.code).slice(0, 32) : 'command_failed';
    console.error(`[COMMAND] ${interaction.commandName} failed; code=${code}`);
  }
}

async function registerCommands(client) {
  if (!client.application?.commands) throw new Error('Discord application commands are not ready.');
  const guildId = process.env.DISCORD_GUILD_ID;
  const registered = await client.application.commands.set(commands, guildId || undefined);
  console.log(`[COMMANDS] Registered ${registered.size} slash commands ${guildId ? 'for configured guild' : 'globally'}.`);
}

module.exports = { commands, ADMIN_COMMANDS, executeCommand, handleInteraction, registerCommands };
