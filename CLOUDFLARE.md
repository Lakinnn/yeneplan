# YenePlan on Cloudflare

YenePlan now keeps Telegram credentials server-side and exposes three deployment-facing endpoints:

- `POST /api/telegram/webhook` receives Telegram updates and links a user only after they open the private consent link from Settings.
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

Telegram’s webhook will send HTTPS POST updates. The reminder endpoint should be invoked by a Cloudflare Cron Trigger at a cadence appropriate to the product, then filter recipients by their saved reminder time and timezone before sending. Telegram’s Bot API supports a webhook secret header, which is validated by the app.

## Cloudflare compatibility note

The current full-stack project uses the WebDev Node/Express runtime, Manus OAuth context, Drizzle/MySQL, and the platform storage helper. The product logic and endpoint contracts are portable, but the runtime should not be copied to Workers unchanged. For a direct Workers deployment, move the API handlers to a Worker-compatible router, use D1/Hyperdrive or another Workers-compatible database binding, use R2 for vision images, and expose the same tRPC contracts or a Worker RPC layer. Keep the browser page layer on Cloudflare Pages or the Worker’s static assets. Do not put any Telegram or AI credentials in client-side variables.
