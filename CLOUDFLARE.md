# YenePlan on Cloudflare

YenePlan’s Telegram integration is now designed around automatic Web App detection rather than manual connection codes. A user starts the bot, taps the bot’s **Open YenePlan** button, and the Telegram Web App sends signed `initData` to the authenticated website. The server validates that payload with the bot token before storing the Telegram chat identifier against the user’s account. Users can still disconnect at any time from Settings.

The deployment-facing endpoints are:

- `POST /api/telegram/webhook` receives Telegram updates and sends the automatic website button after `/start`.
- `POST /api/telegram/setup` registers the webhook once. Protect it with `Authorization: Bearer $TELEGRAM_SETUP_SECRET`.
- `POST /api/telegram/reminders` sends reminders only to profiles where `reminderEnabled = 1`. Protect it with `Authorization: Bearer $TELEGRAM_CRON_SECRET`.

Set these secrets in the deployed environment:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_SETUP_SECRET=
TELEGRAM_CRON_SECRET=
APP_BASE_URL=https://your-public-domain.example
```

After deployment, run the setup request once:

```bash
curl -X POST https://your-public-domain.example/api/telegram/setup \
  -H "Authorization: Bearer $TELEGRAM_SETUP_SECRET"
```

The reminder endpoint should be invoked by a Cloudflare Cron Trigger at a cadence appropriate to the product, then filter recipients by their saved reminder time and timezone before sending. Telegram’s webhook secret header is validated by the app, and Telegram Web App `initData` is verified server-side with an HMAC check and freshness limit.

## Cloudflare compatibility note

The current full-stack project uses the WebDev Node/Express runtime, Manus OAuth context, Drizzle/MySQL, and the platform storage helper. The product logic and endpoint contracts are portable, but the runtime should not be copied to Workers unchanged. For a direct Workers deployment, move the API handlers to a Worker-compatible router, use D1/Hyperdrive or another Workers-compatible database binding, use R2 for vision images, and expose the same tRPC contracts or a Worker RPC layer. Keep the browser page layer on Cloudflare Pages or the Worker’s static assets. Do not put Telegram, database, storage, or AI credentials in client-side variables.
