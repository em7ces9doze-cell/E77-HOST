# Gulf Bank

بنك افتراضي ترفيهي داخل Discord. جميع الأرصدة والاستثمارات والأصول افتراضية ولا تمثل أموالًا حقيقية أو خدمات مالية.

## Usage
- `+تفعيل` — ينشئ لوحة البنك التفاعلية ويثبتها (لإدارة السيرفر، مرة واحدة).\n- `+بنك` — يعيد نشر لوحة البنك يدويًا عند الحاجة
- `+رصيدي` — الرصيد
- `+يومي` — مكافأة يومية
- `+عمل` — مهمة عمل عشوائية
- `+نرد [مبلغ]` — تحدي نرد ضد البنك (الأرقام من 1 إلى 10)
- `+تحدي` — تحديات متاحة
- `+مساعدة` — قائمة الاستخدام

## Brand assets\n- `assets/gulf-bank-logo.svg` — الشعار المتجهي الرسمي.\n- `BRAND.md` — دليل الألوان والنبرة والهوية.\n\n## Requirements
- Node.js 22+
- Discord bot token in `DISCORD_TOKEN` (or `BOT_TOKEN`) secret.
- Enable Message Content Intent in Discord Developer Portal.
- Startup clears global and per-server slash-command registrations.

## Run
```bash
npm ci
npm test
npm start
```
