# E7 HOST Discord Slash Commands

The bot registers 23 slash commands on Discord after the client becomes ready.

## Member commands

These commands are available to regular server members:

| Command | Purpose |
| --- | --- |
| `/help` | Show the command directory |
| `/ping` | Show Discord gateway latency |
| `/botinfo` | Show bot identity and connected server count |
| `/serverinfo` | Show current server information |
| `/userinfo` | Show a member's public account/server information |
| `/avatar` | Show a user's avatar URL |
| `/roleinfo` | Show role details |
| `/channelinfo` | Show channel details |
| `/poll` | Publish a two-option reaction poll |

## Administrator-only commands

Discord command visibility is restricted with the Administrator default permission, and the handler repeats the Administrator check at runtime.

| Command | Purpose |
| --- | --- |
| `/clear amount` | Bulk-delete up to 100 recent messages; Discord excludes messages older than 14 days |
| `/slowmode seconds` | Set channel slowmode from 0 to 21,600 seconds |
| `/lock`, `/unlock` | Deny/restore sending or voice connection for @everyone in the current channel |
| `/announce channel message` | Publish an embed announcement in a selected text channel |
| `/kick member reason` | Kick a member |
| `/ban member reason` | Ban a member without bulk-deleting their message history |
| `/timeout member minutes reason` | Timeout a member for 1 to 40,320 minutes |
| `/untimeout member` | Remove a member timeout |
| `/nickname member name` | Set or clear a member nickname |
| `/createchannel name type` | Create a text or voice channel |
| `/createrole name color` | Create a role with a validated hex color |
| `/addrole member role` | Assign a role the bot is allowed to manage |
| `/removerole member role` | Remove a role the bot is allowed to manage |

## Security model

- Administrative commands require the Discord Administrator permission at both command-registration and runtime levels.
- Every action also checks the bot's own required permission.
- Discord role hierarchy remains authoritative; the bot refuses managed roles, @everyone, and roles at or above its highest role for role assignment.
- Announcement messages disable parsed mentions to avoid accidental mass mentions.
- The bot never logs Discord tokens, bridge secrets, or raw provider error messages.
- Discord still enforces its own role hierarchy, channel access, and rate limits.

## Deployment

The slash command handler is loaded by `index.js`; no new package dependency is required.

Optional FadeHost variable:

- `DISCORD_GUILD_ID`: register commands to one server for faster command propagation during setup. If omitted, commands are registered globally.

After pushing to `main`, let FadeHost deploy and restart the bot. Watch for:

```text
[COMMANDS] Registered 23 slash commands ...
```

If registration fails, check the bot application's command scope and the deployment logs. The bot must have been invited with the `applications.commands` scope in addition to its bot scope. The commands also require the relevant bot permissions for the selected actions.
