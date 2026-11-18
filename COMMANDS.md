# E7 HOST Economy Commands

## Member commands
- `/balance [member]`: view wallet balance.
- `/daily`: claim a 150-coin reward every 24 hours.
- `/work`: earn a random 35–90 coins once per hour.
- `/pay member amount`: transfer coins to another member.
- `/leaderboard`: top ten members by wallet plus bank total (wallet currently active).
- `/shop`: view server products.
- `/buy item_id`: buy a product and add it to inventory.
- `/inventory [member]`: view purchased items.
- `/profile [member]`: view economy profile.

## Administrator commands
All staff commands require Discord Administrator both in command visibility and runtime authorization:
- `/shopadd item_id name price [description]`
- `/shopremove item_id`
- `/coinsadd member amount`
- `/coinsremove member amount`
- `/coinsset member amount`

## Data and deployment
Economy data is stored per guild in JSON at `data/economy.json` by default. Set `E7_ECONOMY_FILE` to a persistent disk path on the hosting provider. The host must provide persistent storage for balances and inventory to survive container replacement/redeploy. Back up this file regularly.

Initial wallet balance is 250 coins. Daily reward is 150 coins (24-hour cooldown). Work pays 35–90 coins (one-hour cooldown). Coins are fictional server points and have no cash value.

The bot registers the current slash-command catalog on startup. Deploy from `main`, then confirm the `[COMMANDS] Registered ... E7 HOST economy commands` log. If commands are global, Discord propagation may take time; set `DISCORD_GUILD_ID` to the test server ID for faster guild-scoped registration.
