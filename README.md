# Gulf Bank

بنك افتراضي ترفيهي داخل Discord. جميع الأرصدة والاستثمارات والأصول افتراضية ولا تمثل أموالًا حقيقية أو خدمات مالية.

## Usage
- `+تفعيل` — ينشئ لوحة البنك التفاعلية ويثبتها (لإدارة السيرفر، مرة واحدة).\n- `+بنك` — يعيد نشر لوحة البنك يدويًا عند الحاجة\n- `تداول` — يطلب تحديد مبلغ التداول. مثال: `تداول 200` ثم اختر شركة من القائمة.\n- `+شركات` — يعرض الشركات العشر وأسعارها الافتراضية.\n- `بيع_سهم NAMA 2` — يبيع سهمين من شركة نماء.\n- `+محفظتي` — الأصول؛ محفظة الأسهم متاحة من لوحة البنك.
- `+رصيدي` — الرصيد
- `+يومي` — مكافأة يومية
- `+عمل` — مهمة عمل عشوائية
- `+نرد [مبلغ]` — تحدي نرد ضد البنك (الأرقام من 1 إلى 10)
- `+تحدي` — تحديات متاحة
- `+مساعدة` — قائمة الاستخدام

## Gulf virtual currency\n- اسم العملة: **خليج**.\n- الشعار: `assets/gulf-coin.svg`.\n- الرمز الافتراضي داخل الرسائل: 🪙.\n- يمكن تعيين `GULF_COIN_EMOJI` إلى صيغة إيموجي Discord مخصص مثل `<:gulfcoin:EMOJI_ID>` بعد رفع `assets/gulf-coin.svg` كإيموجي في السيرفر ومنح البوت صلاحية استخدام الإيموجي الخارجي عند الحاجة.\n\n## Brand assets\n- `assets/gulf-bank-logo.svg` — الشعار المتجهي الرسمي.\n- `BRAND.md` — دليل الألوان والنبرة والهوية.\n\n## Requirements
- Node.js 22+
- Discord bot token in `DISCORD_TOKEN` (or `BOT_TOKEN`) secret.
- Enable Message Content Intent in Discord Developer Portal.
- Startup clears global and per-server slash-command registrations.

## Virtual stock exchange\nTen fictional companies have simulated share prices that update on a ten-minute market tick. Purchases use a guided select menu; sale command is `بيع_سهم SYMBOL SHARES`. Prices are fictional and are not linked to real companies or markets.\n\n## Run
```bash
npm ci
npm test
npm start
```
