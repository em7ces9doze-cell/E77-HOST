# E77 HOST — Discord command reference (v2.3.0)

## Customer commands
- `/help`: Arabic command guide.
- `/hosting guide`: explains how to request hosting.
- `/store browse`: lists published plans and services.
- `/store buy item_id`: purchases an item. Hosting products open a private order channel after successful payment.
- `/coins balance`: wallet and bank balances.
- `/coins daily` and `/coins work`: cooldown-based rewards.
- `/coins transfer member amount`: transfers wallet credits to another member.
- `/coins deposit amount` and `/coins withdraw amount`: move credits between wallet and bank.
- `/coins history`: recent transactions.
- `/coins profile [member]`: wallet, bank, total earned and total spent.
- `/coins leaderboard`: public top-ten server balance ranking.
- `/coins inventory [member]`: recent purchased items.

## Administrator commands
- `/hosting setup`: create or reuse the E77 HOST category and start panel.
- `/hosting panel channel`: publish the official hosting embed.
- `/store add item_id name price kind [description]`: add a product.
- `/store remove item_id`: remove a product.
- `/e77-admin coins-add|coins-remove|coins-set`: adjust a member wallet. Requires Discord Administrator.

## Economy rules
E77 is an internal virtual points balance for purchases inside the Discord server. It is not cryptocurrency, investment, cash, or a withdrawable asset.
- New accounts start with 100 E77.
- Daily reward: 75 E77 once every 24 hours.
- Work reward: 10–25 E77 once every 3 hours.
- Wallet and bank are separate; transfers, deposits, withdrawals, purchases and staff adjustments are recorded.
- Existing balances and transaction history are preserved by the v1-to-v2 migration.
- Existing products without a kind are migrated as digital services. Re-add a hosting plan with kind=hosting if it should create a private order channel.
- Economy data is stored in `data/economy.json`. Set `E7_ECONOMY_FILE` to a persistent FadeHost disk path. Back up data before deployment. Never commit live data or secrets.

## Permissions and safety
The bot needs only the permissions required by its enabled workflows, including View Channels, Send Messages, Read Message History, Embed Links and Manage Channels for setup/order rooms. Do not grant Administrator to the bot. The buyer, bot and server Administrator roles can view private order rooms. Duplicate open orders for the same member and plan are blocked.

## EM7 CONTROL bridge
The existing bridge engine and durable idempotency state are preserved. Keep current FadeHost values for `DISCORD_TOKEN`, `EM7_CONTROL_BOT_BRIDGE_SECRET`, `EM7_CONTROL_URL` and the configured state path. Never put secrets in GitHub. Supported operations remain `create_rooms`, `create_channel`, `create_role`, `update_role` and `set_channel_permissions`.

## Deploy
Repository: `em7ces9doze-cell/E77-HOST`, branch `main`. Node.js 22+. CI runs `npm run check` and `npm test`. Expected command log: `[COMMANDS] Registered 5 E77 HOST command groups.`
