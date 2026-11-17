# E77 HOST — Discord Bot

A modular Discord bot built with Node.js, discord.js, and SQLite. Designed for deployment on FadeHost.

## Runtime

- Node.js 22+
- Install command: `npm install`
- Start command: `npm start`
- Register slash commands: `npm run deploy`
- Project check: `npm run check`

## Required environment variables

Set these in the hosting provider's secret/environment-variable panel. Never commit real tokens.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | New Discord bot token |
| `CLIENT_ID` | Yes | Discord application ID |
| `OWNER_ID` | No | Discord user ID allowed to bypass bot-side permission checks |
| `GUILD_ID` | No | Register commands to one test server; omit for global commands |
| `DATABASE_PATH` | No | SQLite file path; defaults to `./data/e77.sqlite` |
| `LOG_LEVEL` | No | `error`, `warn`, `info`, or `debug` |

## FadeHost setup

1. Create a new Node.js service and connect this repository.
2. Select branch `main`.
3. Set install command to `npm install`.
4. Set start command to `npm start`.
5. Add the required environment variables in the service's secret settings.
6. Deploy the service.
7. Register slash commands once using `npm run deploy` (use the provider's one-off command/console if available). Do not combine command registration with the bot startup command.

## Discord Developer Portal

- Create a new application and add a Bot user.
- Copy the bot token directly into the hosting secret field; do not send it in chat or commit it.
- Enable **Server Members Intent** if you need member lookup and member-related features.
- Invite the bot with the permissions required for the commands you plan to use.

## Included commands

- `/ping` — bot latency
- `/server` — server information
- `/user` — user information
- `/ban`, `/kick`, `/timeout` — moderation actions with permission and role-hierarchy checks
- `/warn`, `/warnings` — persistent warning records in SQLite

## Important behavior

- The bot starts with `npm start`; slash-command registration is a separate operation.
- No Discord token or API key belongs in source files.
- SQLite data is stored under `data/`; ensure the hosting provider preserves that directory across restarts/redeployments if warning history must persist.
- The bot does not automatically receive permissions from Discord; its role must be above the roles it moderates.
