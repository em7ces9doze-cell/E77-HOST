# Gulf Bank

بنك افتراضي ترفيهي داخل Discord. جميع الأرصدة والاستثمارات والأصول افتراضية ولا تمثل أموالًا حقيقية أو خدمات مالية.

## Usage
- `+بنك` — لوحة البنك
- `+رصيدي` — الرصيد
- `+يومي` — مكافأة يومية
- `+عمل` — مهمة عمل عشوائية
- `+نرد [مبلغ]` — تحدي نرد ضد البنك (الأرقام من 1 إلى 10)
- `+تحدي` — تحديات متاحة
- `+مساعدة` — قائمة الاستخدام

## Requirements
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
