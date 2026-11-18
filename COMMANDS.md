# E77 HOST — Hosting-first Discord control bot

## Customer commands (4 simple groups)
- `/hosting guide`: explains how to request hosting.
- `/store browse`: lists published hosting plans and digital services.
- `/store buy item_id`: purchases a product. Hosting products open a private order channel after successful payment; service products are added to purchase history.
- `/coins balance|daily|work|transfer|deposit|withdraw|history`: all wallet and bank actions are grouped under one command.

## Administrator workflow
- `/hosting setup`: create or reuse the E77 HOST category and the start-here panel.
- `/hosting panel channel`: publish the official hosting Embed in a chosen text channel.
- `/store add item_id name price kind [description]`: add a product. Choose kind=hosting for a hosting plan or kind=service for another digital service.
- `/store remove item_id`: remove a product.
- `/e77-admin coins-add|coins-remove|coins-set`: controlled wallet adjustments. Requires Discord Administrator.

The bot needs Manage Channels, View Channel, Send Messages, Read Message History and Embed Links. Do not grant Administrator to the bot. The buyer, bot and server Administrator roles can see private hosting order channels. Duplicate open orders for the same member and plan are blocked.

## E77 Credits economy
E77 is an internal virtual points balance for purchases inside the Discord server. It is not a cryptocurrency, investment, cash balance or withdrawable asset.
- New accounts start with 100 E77.
- Daily reward: 75 E77 once every 24 hours.
- Community activity reward: 10–25 E77 once every 3 hours.
- Wallet and bank remain separate; transfers, deposits, withdrawals, purchases and staff adjustments are recorded.
- Existing account balances and transaction history are preserved by the v1-to-v2 migration.
- Existing catalog items without a kind are migrated as digital services. Re-add a hosting plan with kind=hosting if it should create a private hosting order room.
- Economy data remains in `data/economy.json`. Configure `E7_ECONOMY_FILE` to a persistent FadeHost disk path. Back up data before deployment. Never commit live data or secrets.

## EM7 CONTROL bridge
The bridge engine and its existing durable idempotency state are unchanged. Keep current FadeHost values for `DISCORD_TOKEN`, `EM7_CONTROL_BOT_BRIDGE_SECRET`, `EM7_CONTROL_URL` and the configured state path. Never put secrets in GitHub. Supported bridge operations remain `create_rooms`, `create_channel`, `create_role`, `update_role` and `set_channel_permissions`.

## Deploy
Repository: `em7ces9doze-cell/E77-HOST`, branch `main`. Node.js 22+. Install dependencies, run `npm run check`, `npm test`, then `npm start`.
Expected logs: `[READY] Discord client connected.`, `[COMMANDS] Registered 4 E77 HOST command groups.` and `[BRIDGE] worker_started` when bridge credentials are configured.
