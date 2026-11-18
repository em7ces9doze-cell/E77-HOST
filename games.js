'use strict';

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  EmbedBuilder, ComponentType,
} = require('discord.js');
const engine = require('./game-engine');

const PURPLE = 0x8557E8;
const sessions = new Map();
const GAME_OPTIONS = [
  { label: 'روليت', value: 'roulette', description: 'اختيار عشوائي وتحدي إقصاء داخل الجولة' },
  { label: 'تحدي الأسئلة', value: 'quiz', description: 'أسئلة سرعة وثقافة' },
  { label: 'خمن الرقم', value: 'guess', description: 'اكتشف الرقم قبل بقية اللاعبين' },
  { label: 'ألغاز', value: 'riddles', description: 'ألغاز واستنتاجات جماعية' },
  { label: 'حجر ورقة مقص', value: 'rps', description: 'مواجهة مباشرة بين لاعبين' },
  { label: 'تحدي الذاكرة', value: 'memory', description: 'اختبر قوة الذاكرة' },
  { label: 'سباق الحروف', value: 'letters', description: 'أسرع إجابة صحيحة' },
  { label: 'المزاد', value: 'auction', description: 'مزايدة بنقاط افتراضية' },
  { label: 'من أنا؟', value: 'whoami', description: 'اكتشف الشخصية من التلميحات' },
  { label: 'كلمة السر', value: 'password', description: 'خمّن الكلمة السرية' },
  { label: 'تحدي الصور', value: 'picture', description: 'تعرّف على الصورة' },
  { label: 'بطولة السيرفر', value: 'tournament', description: 'منافسة متعددة الجولات' },
];

function embed(title, description) {
  return new EmbedBuilder().setColor(PURPLE).setTitle(title).setDescription(description)
    .setFooter({ text: 'E77 GAMES • Games for Everyone' }).setTimestamp();
}
function menuRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('e77:games:select')
      .setPlaceholder('اختر لعبة للبدء')
      .addOptions(GAME_OPTIONS.map(game => ({
        label: game.label, value: game.value, description: game.description,
      }))),
  );
}
function gameMenu() {
  const ready = ['روليت'];
  const planned = GAME_OPTIONS.filter(game => !ready.includes(game.label)).map(game => '• ' + game.label).join('\n');
  return {
    embeds: [embed('🎮 E77 GAMES | مركز الألعاب',
      'مرحبًا بك في مركز الألعاب!\nاختر لعبة من القائمة لبدء جلسة جماعية.\n\n**متاحة الآن**\n🎯 روليت\n\n**ألعاب قادمة**\n' + planned +
      '\n\nتُسجل نتائج الألعاب داخل الجولة فقط، ولا يتم طرد أي عضو من سيرفر Discord.')],
    components: [menuRow()],
  };
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (message.content.trim() === '+العاب') {
    await message.channel.send(gameMenu());
  }
}

async function handleComponent(interaction) {
  if (interaction.customId === 'e77:games:select') {
    const selected = interaction.values[0];
    if (selected !== 'roulette') {
      return interaction.reply({ content: 'هذه اللعبة ضمن قائمة E77 GAMES، وسيتم تفعيلها في تحديث قادم.', ephemeral: true });
    }
    return createRouletteLobby(interaction);
  }

  if (interaction.customId.startsWith('e77:roulette:')) {
    const [, , action, channelId] = interaction.customId.split(':');
    const session = sessions.get(channelId);
    if (!session || session.guildId !== interaction.guildId) {
      return interaction.reply({ content: 'انتهت هذه الجولة أو لم تعد متاحة.', ephemeral: true });
    }
    if (action === 'join') return joinRoulette(interaction, session);
    if (action === 'leave') return leaveRoulette(interaction, session);
    if (action === 'start') return startRoulette(interaction, session);
    if (action === 'stop') return stopRoulette(interaction, session);
    if (action === 'target') return chooseRouletteTarget(interaction, session);
  }
}

async function createRouletteLobby(interaction) {
  const channelId = interaction.channelId;
  if (sessions.has(channelId)) {
    return interaction.reply({ content: 'هناك لعبة نشطة في هذا الروم بالفعل. انتظر انتهاءها.', ephemeral: true });
  }
  const session = engine.createSession({
    guildId: interaction.guildId,
    channelId,
    hostId: interaction.user.id,
  });
  sessions.set(channelId, session);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('e77:roulette:join:' + channelId).setLabel('انضمام').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('e77:roulette:leave:' + channelId).setLabel('انسحاب').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('e77:roulette:start:' + channelId).setLabel('بدء الجولة').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('e77:roulette:stop:' + channelId).setLabel('إلغاء').setStyle(ButtonStyle.Danger),
  );
  const lobby = await interaction.reply({
    embeds: [lobbyEmbed(session)],
    components: [row],
    fetchReply: true,
  });
  const collector = lobby.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });
  collector.on('collect', async button => {
    if (!button.customId.endsWith(channelId)) return;
    try {
      if (button.customId.includes(':join:')) await joinRoulette(button, session, lobby);
      else if (button.customId.includes(':leave:')) await leaveRoulette(button, session, lobby);
      else if (button.customId.includes(':start:')) await startRoulette(button, session, lobby, collector);
      else if (button.customId.includes(':stop:')) await stopRoulette(button, session, lobby, collector);
    } catch (error) {
      if (!button.replied && !button.deferred) await button.reply({ content: 'تعذر تنفيذ طلبك.', ephemeral: true }).catch(() => {});
    }
  });
  collector.on('end', () => {
    if (session.status === 'lobby') {
      session.status = 'cancelled';
      sessions.delete(channelId);
      lobby.edit({ components: [] }).catch(() => {});
    }
  });
}

function lobbyEmbed(session) {
  const list = session.players.map((id, i) => (i + 1) + '. <@' + id + '>').join('\n');
  return embed('🎡 لعبة الروليت | انتظار اللاعبين',
    'اضغط **انضمام** للدخول إلى الجولة.\n\n**المشاركون (' + session.players.length + '/' + engine.MAX_PLAYERS + ')**\n' + list +
    '\n\nالحد الأدنى لاعبين. يبدأها منشئ الجولة عند الاستعداد. الإقصاء داخل اللعبة فقط.');
}
async function refreshLobby(button, session, lobby) {
  await button.update({ embeds: [lobbyEmbed(session)], components: lobby.components });
}
async function joinRoulette(button, session, lobby) {
  const result = engine.addPlayer(session, button.user.id);
  if (!result.ok) {
    const messages = { GAME_STARTED: 'بدأت الجولة بالفعل.', ALREADY_JOINED: 'أنت منضم بالفعل.', LOBBY_FULL: 'اكتمل عدد المشاركين.' };
    return button.reply({ content: messages[result.reason] || 'تعذر الانضمام.', ephemeral: true });
  }
  await refreshLobby(button, session, lobby || await button.message.fetch());
}
async function leaveRoulette(button, session, lobby) {
  const result = engine.removePlayer(session, button.user.id);
  if (!result.ok) {
    const messages = { GAME_STARTED: 'لا يمكن الانسحاب بعد بدء الجولة.', HOST_CANNOT_LEAVE: 'منشئ الجولة لا يمكنه الانسحاب؛ يمكنه إلغاء الجولة.', NOT_JOINED: 'أنت لست ضمن المشاركين.' };
    return button.reply({ content: messages[result.reason] || 'تعذر الانسحاب.', ephemeral: true });
  }
  await refreshLobby(button, session, lobby || await button.message.fetch());
}
async function startRoulette(button, session, lobby, collector) {
  if (button.user.id !== session.hostId) return button.reply({ content: 'بدء الجولة متاح لمنشئها فقط.', ephemeral: true });
  const result = engine.startSession(session);
  if (!result.ok) return button.reply({ content: 'تحتاج إلى لاعبين على الأقل لبدء الجولة.', ephemeral: true });
  collector?.stop('started');
  await button.update({ embeds: [embed('🎡 بدأت الروليت!', 'عدد المشاركين: **' + session.players.length + '**\nبدأت الجولة. سيتم اختيار لاعب عشوائي ليحدد من يخرج من الجولة.')], components: [] });
  await nextRouletteTurn(button.channel, session);
}
async function stopRoulette(button, session, lobby, collector) {
  if (button.user.id !== session.hostId) return button.reply({ content: 'إلغاء الجولة متاح لمنشئها فقط.', ephemeral: true });
  session.status = 'cancelled';
  sessions.delete(session.channelId);
  collector?.stop('cancelled');
  await button.update({ embeds: [embed('تم إلغاء الجولة', 'ألغى منشئ اللعبة هذه الجولة.')], components: [] });
}
async function nextRouletteTurn(channel, session) {
  if (session.status !== 'playing') return;
  if (session.players.length === 1) return finishRoulette(channel, session);
  const chooserId = engine.choosePlayer(session);
  const options = session.players.filter(id => id !== chooserId).map(id => ({ label: 'لاعب ' + id.slice(-4), value: id, description: 'اختيار هذا اللاعب لإخراجه من الجولة' }));
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('e77:roulette:target:' + session.channelId)
      .setPlaceholder('اختر لاعبًا لإخراجه من الجولة').addOptions(options),
  );
  await channel.send({
    embeds: [embed('🎯 دور الاختيار',
      'تم اختيار <@' + chooserId + '> عشوائيًا.\nاختر لاعبًا واحدًا لإخراجه من هذه الجولة.\nالمتبقون: **' + session.players.length + '**')],
    components: [row],
  });
}
async function chooseRouletteTarget(interaction, session) {
  if (interaction.user.id !== session.currentChooserId) {
    return interaction.reply({ content: 'هذا الاختيار مخصص للاعب الذي وقع عليه الدور.', ephemeral: true });
  }
  const targetId = interaction.values[0];
  const result = engine.eliminatePlayer(session, interaction.user.id, targetId);
  if (!result.ok) return interaction.reply({ content: 'هذا الاختيار غير صالح.', ephemeral: true });
  await interaction.update({
    embeds: [embed('🎯 نتيجة الجولة ' + (session.round - 1),
      'اختار <@' + interaction.user.id + '> إخراج <@' + targetId + '> من الجولة.\n\n**اللاعبون المتبقون:** ' + session.players.map(id => '<@' + id + '>').join('، '))],
    components: [],
  });
  if (result.winnerId) return finishRoulette(interaction.channel, session);
  await nextRouletteTurn(interaction.channel, session);
}
async function finishRoulette(channel, session) {
  session.status = 'finished';
  sessions.delete(session.channelId);
  await channel.send({ embeds: [embed('🏆 انتهت لعبة الروليت!', 'الفائز هو <@' + session.players[0] + '>!\nعدد الجولات: **' + (session.round - 1) + '**')] });
}

module.exports = { handleMessage, handleComponent, GAME_OPTIONS, sessions, gameMenu };
