# E77 HOST — Economy & Discord Bridge

## Member economy commands
- `/help`: complete command guide.
- `/balance [member]`: wallet, bank and total wealth for a member.
- `/bank`: private view of your wallet and bank.
- `/deposit amount`: move coins from wallet to bank.
- `/withdraw amount`: move coins from bank to wallet.
- `/transactions`: latest 10 transactions for your account (private).
- `/daily`: claim 150 coins every 24 hours.
- `/work`: earn 35–90 coins once per hour.
- `/pay member amount`: transfer coins to another member.
- `/leaderboard`: top ten members by wallet plus bank.
- `/shop`: view server products.
- `/buy item_id`: buy a product and add it to inventory.
- `/inventory [member]`: view purchased items.
- `/profile [member]`: full economy profile.

## Administrator economy commands
All staff commands require Discord Administrator both in command visibility and runtime authorization:
- `/shopadd item_id name price [description]`
- `/shopremove item_id`
- `/coinsadd member amount`
- `/coinsremove member amount`
- `/coinsset member amount`

## Economy rules and data
- New wallets start with 250 coins.
- Daily reward: 150 coins; 24-hour cooldown.
- Work reward: 35–90 coins; one-hour cooldown.
- Amounts are validated and balance overflow is rejected.
- Wallet and bank are separate; deposits and withdrawals are serialized with all other economy writes.
- Each guild has isolated balances, shops, inventories and transaction history.
- The most recent 1,000 server transactions are retained; `/transactions` shows the caller's latest 10.
- Coins are fictional server points and have no cash value.

Economy data is stored in JSON at `data/economy.json` by default. Set `E7_ECONOMY_FILE` to a persistent disk path on FadeHost. Use persistent storage and make backups before redeploying. Do not commit live data, tokens or bridge secrets.

## EM7 CONTROL bridge
The bridge worker remains in `bridge-engine.js` and continues to use the existing HTTPS `Authorization: Bearer` contract. Keep the current FadeHost values for `DISCORD_TOKEN`, `EM7_CONTROL_BOT_BRIDGE_SECRET`, `EM7_CONTROL_URL`, and any configured persistent state path. Never put secrets in GitHub.

Supported bridge operations remain: `create_rooms`, `create_channel`, `create_role`, `update_role`, and `set_channel_permissions`. The worker validates payloads and permissions, refuses Administrator grants, and uses a durable idempotency ledger. Do not delete `.em7-bridge/state.json` to force retries.

## Deploy and verify
FadeHost should deploy from repository `em7ces9doze-cell/E77-HOST`, branch `main`, with Node.js 22 or newer. Install dependencies, then run `npm run check` and `npm test`. Start command: `npm start`.

After deployment, confirm:
1. `[READY] Discord client connected.`
2. `[COMMANDS] Registered 19 E77 HOST economy commands.`
3. `[BRIDGE] worker_started` (when bridge credentials are correctly configured).
4. Use `/help`, then test `/bank`, `/deposit`, `/withdraw`, and `/transactions` in a test server.

If commands are registered globally, Discord propagation may take time. Set `DISCORD_GUILD_ID` to the intended test server ID for immediate guild-scoped updates. The ID is not a secret.
