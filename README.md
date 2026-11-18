# Gulf Bank

بنك افتراضي ترفيهي داخل Discord. جميع الأرصدة والاستثمارات والأصول افتراضية ولا تمثل أموالًا حقيقية أو خدمات مالية.

## Usage
- `+تفعيل` — ينشئ لوحة البنك التفاعلية ويثبتها (لإدارة السيرفر، مرة واحدة).
- `+بنك` — يعيد نشر لوحة البنك يدويًا عند الحاجة
- `تداول` — يطلب تحديد مبلغ التداول. مثال: `تداول 200` ثم اختر شركة من القائمة.
- `+شركات` — يعرض الشركات العشر وأسعارها الافتراضية.
- `بيع_سهم NAMA 2` — يبيع سهمين من شركة نماء.
- `+محفظتي` — الأصول؛ محفظة الأسهم متاحة من لوحة البنك.
- `+رصيدي` — الرصيد
- `+يومي` — مكافأة يومية
- `+عمل` — مهمة عمل عشوائية
- `+نرد` — تحدي نرد مجاني بالنقاط فقط دون رهانات أو خسارة عملة
- `+تحدي` — تحديات متاحة
- `+مساعدة` — قائمة الاستخدام

## Gulf virtual currency
- اسم العملة: **خليج**.
- الشعار: `assets/gulf-coin.svg`.
- الرمز الافتراضي داخل الرسائل: 🪙.
- يمكن تعيين `GULF_COIN_EMOJI` إلى صيغة إيموجي Discord مخصص مثل `<:gulfcoin:EMOJI_ID>` بعد رفع `assets/gulf-coin.svg` كإيموجي في السيرفر ومنح البوت صلاحية استخدام الإيموجي الخارجي عند الحاجة.

## Brand assets
- `assets/gulf-bank-logo.svg` — الشعار المتجهي الرسمي.
- `BRAND.md` — دليل الألوان والنبرة والهوية.

## Requirements
- Node.js 22+
- Discord bot token in `DISCORD_TOKEN` (or `BOT_TOKEN`) secret.
- Enable Message Content Intent in Discord Developer Portal.
- Startup clears global and per-server slash-command registrations.

## Virtual stock exchange
Ten fictional companies have simulated share prices that update on a ten-minute market tick. Purchases use a guided select menu; sale command is `بيع_سهم SYMBOL SHARES`. Prices are fictional and are not linked to real companies or markets.

## Run
```bash
npm ci
npm test
npm start
```
