# E77 GAMES

بوت ألعاب جماعي عربي لـ Discord. طريقة الاستخدام الأساسية عبر الرسائل:

1. اكتب `+العاب` في روم نصي.
2. اختر لعبة من القائمة.
3. انضم إلى الجلسة عبر الزر.
4. ابدأ الجولة وتفاعل مع الأزرار والقوائم.

## Current MVP

- قائمة ألعاب تفاعلية.
- لعبة الروليت الجماعية (2–10 لاعبين).
- جلسة مستقلة لكل روم.
- اختيار عشوائي للاعب صاحب الدور.
- إخراج لاعب من الجولة فقط، دون طرده من سيرفر Discord.
- نقطة فحص HTTP على `/health`.

## Requirements

- Node.js 22+
- Discord bot token in `DISCORD_TOKEN` (or `BOT_TOKEN`) secret.
- Enable the **Message Content Intent** in Discord Developer Portal and include it in the bot configuration.

## Run

```bash
npm ci
npm test
npm start
```

No Slash Commands are registered. Do not add Slash Commands to this project.
