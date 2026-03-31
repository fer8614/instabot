# InstaBot

Self-hosted Instagram DM automation for keyword-triggered replies, lead capture, and resource delivery.

This project is a lightweight alternative to tools like ManyChat for teams that want to run their own automation stack, keep their own data, and deploy on cheap infrastructure like Railway or any Node.js host with PostgreSQL.

## What it does

- Sends **automatic DMs** when someone comments a matching keyword on a post
- Supports keyword matching by:
  - `exact`
  - `contains`
  - `word_boundary`
- Handles **postback/button flows** for DM funnels
- Supports **email capture** and follow-up delivery
- Detects **returning users** and can continue/update their flow
- Replies to **story mentions**
- Supports **Instagram Ice Breakers**
- Applies **cooldowns and rate limits**
- Persists leads and DM activity in **PostgreSQL**
- Includes a simple **admin panel** to manage keywords and config
- Includes **Dockerfile** and **Railway** config for deployment

## High-level flow

```text
User comments a keyword on an Instagram post
        │
        ▼
Webhook received by InstaBot
        │
        ▼
Keyword rule matched
        │
        ▼
Bot sends DM / button / follow-up flow
        │
        ├─> optional email capture
        ├─> optional reminder flow
        └─> optional email delivery via Resend
```

## Tech stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **HTTP server:** Express
- **Validation:** Zod
- **Database:** PostgreSQL via `postgres`
- **Logging:** Pino
- **Email:** Resend
- **Testing:** Vitest
- **Package manager:** pnpm
- **Deployment:** Railway or any Node-compatible host

## Repository structure

```text
admin/                  # Static admin frontend
email-templates/        # HTML email templates
src/
  config/               # Env loading + validation
  handlers/             # Business logic per webhook/event type
  scripts/              # Utility scripts (e.g. CSV import)
  services/             # Instagram API, DB, email, cooldowns, leads, reminders
  types/                # Shared TypeScript types
  utils/                # Logger, retry helpers, templates
  webhooks/             # Webhook router, verification, parser, admin API
  __tests__/            # Vitest suites
keywords.json           # Runtime keyword rules
.env.example            # Environment template
Dockerfile              # Container build
railway.toml            # Railway deploy config
```

## Requirements

Before running locally you need:

- Node.js 20+
- pnpm (or Corepack-enabled pnpm)
- PostgreSQL
- Meta app + Instagram Messaging API credentials
- Optional: Resend account for email delivery

If `pnpm` is not installed globally, use Corepack:

```bash
corepack enable
corepack pnpm --version
```

## Quick start

### 1. Clone

```bash
git clone git@github.com:fer8614/instabot.git
cd instabot
```

### 2. Install dependencies

```bash
corepack pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Then edit `.env` with your real values.

### 4. Configure your keyword rules

Edit `keywords.json`.

Example:

```json
[
  {
    "id": "clase",
    "keyword": "CLASE",
    "aliases": ["REGISTRARME", "VIBE CODING"],
    "matchType": "contains",
    "priority": 1,
    "enabled": true,
    "cooldownMinutes": 60,
    "askEmail": true,
    "response": {
      "type": "button",
      "text": "Hey {{username}}! Glad you want to learn!",
      "buttons": [
        {
          "type": "postback",
          "title": "Give me the courses",
          "payload": "start_email:clase"
        }
      ]
    },
    "followUp": {
      "type": "button",
      "text": "Here's the link to the courses:",
      "buttons": [
        {
          "type": "web_url",
          "title": "View courses",
          "url": "https://your-site.com/courses"
        }
      ]
    }
  }
]
```

### 5. Run locally

```bash
corepack pnpm dev
```

Health endpoint:

```bash
GET /health
```

Webhook endpoint:

```bash
GET/POST /webhook
```

Admin panel:

```text
/admin?key=YOUR_ADMIN_API_KEY
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_SECRET` | Yes | Meta app secret for webhook signature verification |
| `META_VERIFY_TOKEN` | Yes | Token used for webhook verification handshake |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` | Yes | Page access token for Instagram Messaging API |
| `INSTAGRAM_PAGE_ID` | Yes | Instagram page/account ID |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_API_KEY` | Yes | Protects admin API + admin panel |
| `PORT` | No | HTTP port, default `3000` |
| `NODE_ENV` | No | `development`, `production`, or `test` |
| `LOG_LEVEL` | No | Pino log level |
| `RESEND_API_KEY` | No | Enables email sending |
| `EMAIL_FROM` | No | Sender address for outbound email |
| `WELCOME_EMAIL_TEMPLATE` | No | Template filename from `email-templates/` |

## Local development commands

```bash
# Run in watch mode
corepack pnpm dev

# Build TypeScript
corepack pnpm build

# Start production build
corepack pnpm start

# Run tests
corepack pnpm test

# Watch tests
corepack pnpm test:watch

# Import CSV
corepack pnpm import:csv
```

## Deployment

### Railway

Recommended flow:

1. Push repo to GitHub
2. Create a Railway project
3. Attach a PostgreSQL database
4. Set all required environment variables
5. Deploy
6. Point Meta webhook to:
   - `https://your-app.up.railway.app/webhook`

### Docker

The repo includes a `Dockerfile`, so you can also deploy to any container host.

## Meta webhook setup

In the Meta Developer Console:

1. Set webhook URL to your deployed `/webhook`
2. Use the same `META_VERIFY_TOKEN` configured in `.env`
3. Subscribe to the webhook topics required by your automation flows

Minimum expected subscriptions typically include:
- `comments`
- `messages`
- `messaging_postbacks`

Depending on your setup, you may also need other Instagram messaging-related events.

## Admin panel

This project includes:

- a static frontend in `admin/`
- admin API routes under `/api/admin`

Current capabilities include:
- reading/updating `keywords.json`
- reading/updating `.env` config values

Authentication is currently done with `ADMIN_API_KEY`.

Example:

```text
https://your-host/admin?key=YOUR_ADMIN_API_KEY
```

## Architecture notes

- `src/index.ts` boots env validation, keyword loading, Express, admin routes, webhook routes, and DB init
- Webhook payloads are parsed as JSON and raw body is preserved for signature verification
- Database initialization is started in the background so the app can still boot the admin panel
- Webhook and automation logic is separated into `handlers/` + `services/`
- Runtime keyword behavior is driven by `keywords.json`, not hardcoded in source

## Testing status

Repository status at inspection time:

- Build: **passes**
- Tests: **30/30 passing**

Note: current tests can emit PostgreSQL connection-refused logs if no local DB is running. They still pass because parts of the app are designed to log-and-continue when DB is unavailable.

## Known rough edges

- Branding/copy may still need cleanup in some files or log strings
- Admin panel is intentionally simple and not a full SPA
- Some tests still touch DB code paths indirectly instead of using full DB isolation

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

Use of the Instagram Messaging API must comply with Meta platform rules and any applicable legal/commercial requirements.

If you plan to run this for client accounts, as an agency, or as a commercial service, verify the policy implications first. This repository is provided as software only; use it at your own risk.
