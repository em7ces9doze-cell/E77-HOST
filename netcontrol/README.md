# NETCONTROL BOT

Discord-only network monitoring bot, isolated from the existing E77-HOST application.

## Current foundation
- Commands: !netcontrol, !nc status, !nc devices, !nc help.
- Admin allowlist via ADMIN_USER_IDS.
- Router adapter explicitly reports NOT_CONFIGURED; no fake device data.
- No router-control operations until the exact firmware and supported interface are verified.

## Run
1. Create a Discord bot and invite it with message and embed permissions.
2. Copy .env.example to .env and set DISCORD_TOKEN.
3. Add your Discord user ID to ADMIN_USER_IDS.
4. Enable Message Content Intent in the Discord Developer Portal.
5. Run npm install, npm test, then npm start from this folder.

A remotely hosted bot cannot directly reach a private home LAN. Router integration will require a secure local connector with outbound encrypted connectivity. Never expose the router admin interface to the public internet or send credentials in Discord.
