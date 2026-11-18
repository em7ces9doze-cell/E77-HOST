# E77 CORE — Independent Bot Store Architecture

## Customer flow
1. Choose one of the 24 catalog products and a subscription: 7 days, 15 days, 30 days, 60 days, or 90 days.
2. Submit requested bot display name, requested Discord username, target server ID, owner ID, and optional HTTPS avatar/banner URLs.
3. E77 reviews the order and provisions a distinct Discord application/bot for that customer.
4. E77 records the application and bot user IDs, then sends an OAuth2 installation link.
5. The customer authorizes installation into the stated server. E77 verifies the installed guild and owner before activating the subscription.
6. The subscription clock begins only after verified installation.

## Important Discord platform boundary
Discord does not provide a supported public API for automatically creating arbitrary new developer applications/bot accounts on behalf of customers. The requested bot username is therefore a preference, not a guarantee. E77 must create/configure each application through an authorized Developer Portal workflow, check username availability, and keep each bot token in a secrets manager. Never ask customers to paste bot tokens into public channels, order forms, or GitHub.

A bot can be invited only after its application exists and an OAuth2 URL is generated. The customer must authorize the installation. The bot cannot silently add itself or grant roles to a person through DMs. Role assignment and server setup happen after installation, with the customer's consent and only within the bot's granted permissions.

## Product catalog
bot-catalog.js contains 24 product templates. These are catalog definitions, not 24 already-created Discord applications. E77 CORE is the control plane and is not a customer product.

## Subscription lifecycle
subscription-store.js supports:
- pending_review
- awaiting_bot_application
- awaiting_customer_install
- active
- expired

Subscription time starts on verified activation, not on purchase submission. Expiry updates records but does not delete customer data. A production scheduler must call expireDueSubscriptions() and apply the product's defined expiry policy.

## Security and production requirements
- Use one isolated runtime/container and one token secret per customer bot.
- Store bot tokens only in a secrets manager; never in JSON, Git, logs, or Discord messages.
- Use least-privilege Discord permissions and verify guild ownership/authorization.
- Add persistent storage with backups before commercial use. The JSON store is a single-process foundation, not a horizontally-scalable database.
- Add audit logs, retry-safe provisioning jobs, rate limits, operational monitoring, and an admin approval workflow before launch.
- /رومات must be an administrator-only, idempotent setup command. It should create/reuse the E77 STORE category, sales channel, and private administration channel, with explicit permission overwrites.
