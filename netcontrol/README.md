# NETCONTROL BOT

Discord slash-command network monitoring bot, isolated from the existing E77-HOST application.

## Slash commands
- `/netcontrol status` — bot and router connector status (admins only).
- `/netcontrol devices` — device-discovery availability (admins only).
- `/netcontrol help` — command help.

All command responses are ephemeral. Admin access is controlled by `ADMIN_USER_IDS`, a comma-separated list of Discord user IDs.

## Environment
- `DISCORD_TOKEN` — bot token; store only in the hosting provider's secret manager.
- `ADMIN_USER_IDS` — Discord user IDs allowed to inspect network status.
- `DISCORD_GUILD_ID` — optional test server ID. When set, commands register immediately in that server. When omitted, commands register globally and may take time to appear.
- `ROUTER_CONNECTOR=disabled` — safe default until a supported router interface is verified.

## Run
1. Use Node.js 20 or newer.
2. Set the environment variables in the hosting provider.
3. Run `npm install`, `npm run check`, `npm test`, then `npm start` from this folder.
4. Invite the Discord application with the `bot` and `applications.commands` scopes. The bot needs no message-content intent for slash commands.

## Router integration status
The router connector currently reports `NOT_CONFIGURED`. Device discovery is not implemented, and no router-control operations are exposed. Do not treat an unavailable result as a successful connection or invent device data.

A remotely hosted bot cannot directly reach a private home LAN. Router integration will require a secure local connector with outbound encrypted connectivity. Never expose the router admin interface to the public internet or send router credentials in Discord.
