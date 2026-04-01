# InstaBot

<<<<<<< HEAD
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
=======
Self-hosted Instagram DM automation with **multi-account support**.

InstaBot lets you manage keyword-triggered DMs, lead capture, email delivery, and follow-up flows for **one or many Instagram accounts** from a single admin panel.

## What changed in the multi-account version

This repository now supports **multiple Instagram automations from the same backend**.

That means you can:
- create multiple automations/accounts from the admin panel
- assign different credentials per Instagram account
- configure different keyword rules per account
- keep leads and DM logs separated by account
- use one backend instance to operate several Instagram automations

From the admin panel you now get:
- **Automatizaciones** tab
- **+ Nueva automatización** button
- account selector
- keywords per automation/account
- account-specific config and credentials

## Core features

- Keyword-triggered DMs on Instagram comments
- DM keyword matching from inbound messages
- Support for:
  - `exact`
  - `contains`
  - `word_boundary`
- Button/postback flows
- Email capture flow
- Reminder flow for pending email capture
- Optional email delivery via Resend
- Story mention replies
- Ice Breaker support
- Per-user cooldowns and rate limiting
- PostgreSQL persistence for:
  - accounts
  - keyword rule sets
  - leads
  - DM logs
- Admin panel for multi-account management
- Railway / Docker friendly deployment

## High-level architecture

```text
Instagram Account A ─┐
Instagram Account B ─┼──> InstaBot backend
Instagram Account C ─┘
                            │
                            ├── webhook routing by page_id
                            ├── account-aware keyword rules
                            ├── account-aware lead storage
                            ├── account-aware DM logging
                            └── account-aware email settings
>>>>>>> feature/multi-account-automation
```

## Tech stack

<<<<<<< HEAD
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
=======
- Node.js 20+
- TypeScript
- Express
- PostgreSQL
- Zod
- Pino
- Resend
- Vitest
- pnpm
>>>>>>> feature/multi-account-automation

## Repository structure

```text
<<<<<<< HEAD
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
=======
admin/                  # Admin frontend (multi-account aware)
email-templates/        # HTML email templates
src/
  config/               # Env loading and validation
  handlers/             # Comment / message / postback / mention handlers
  services/             # Accounts, keywords, DB, email, Instagram, leads, reminders
  types/                # Shared TS types
  utils/                # Logger, retries, templates
  webhooks/             # Webhook router, verification, parser, admin API
  __tests__/            # Vitest test suites
keywords.json           # Legacy default keyword rules fallback
Dockerfile
railway.toml
```

## Database model

The multi-account implementation introduces these main storage concepts:

- `instagram_accounts`
- `keyword_rule_sets`
- `leads` with `account_id`
- `dm_log` with `account_id`

This allows one backend instance to keep each automation isolated.

## Requirements

Before running locally you need:
- Node.js 20+
- pnpm (or Corepack)
- PostgreSQL
- Meta app credentials
- one or more Instagram Messaging-enabled accounts
- optional: Resend account for email delivery

If pnpm is not globally installed:
>>>>>>> feature/multi-account-automation

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

<<<<<<< HEAD
### 3. Configure environment
=======
### 3. Configure base environment
>>>>>>> feature/multi-account-automation

```bash
cp .env.example .env
```

<<<<<<< HEAD
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

=======
Even in multi-account mode, `.env` is still used for:
- server config
- admin API access
- legacy fallback account
- initial bootstrap settings

### 4. Start the app

```bash
corepack pnpm dev
```

### 5. Open admin panel

```text
/admin?key=YOUR_ADMIN_API_KEY
```

### 6. Create your first automation

In the admin panel:
1. go to **Automatizaciones**
2. click **+ Nueva automatización**
3. enter:
   - automation name
   - Instagram page ID
   - access token
   - verify token
   - app secret
   - optional email settings
4. save
5. switch to **Keywords** and configure rules for that automation

Repeat for as many Instagram accounts as you want to manage.

>>>>>>> feature/multi-account-automation
## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
<<<<<<< HEAD
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
=======
| `META_APP_SECRET` | Yes | Legacy/default webhook signing secret |
| `META_VERIFY_TOKEN` | Yes | Legacy/default webhook verify token |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` | Yes | Legacy/default account token |
| `INSTAGRAM_PAGE_ID` | Yes | Legacy/default account page ID |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_API_KEY` | Yes | Protects admin routes and admin panel |
| `PORT` | No | HTTP port, default `3000` |
| `NODE_ENV` | No | `development`, `production`, `test` |
| `LOG_LEVEL` | No | Log level |
| `RESEND_API_KEY` | No | Legacy/default email provider key |
| `EMAIL_FROM` | No | Legacy/default sender |
| `WELCOME_EMAIL_TEMPLATE` | No | Legacy/default email template |

## Local commands

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm start
corepack pnpm test
corepack pnpm test:watch
corepack pnpm import:csv
```

## Webhooks and account resolution

The backend now supports multi-account webhook handling by resolving the account from the incoming `page_id`.

It also supports:
- account-specific verify tokens
- account-specific app secrets for signature validation
- account-specific Instagram access tokens

## Admin panel capabilities

Current admin panel supports:
- list automations/accounts
- create new automation
- select active automation
- edit per-account credentials
- configure keyword rules per account
- save account-specific keyword sets

## Legacy fallback

There is still a `legacy-default` fallback mode.

This is useful for:
- existing single-account deployments
- gradual transition to multi-account
- bootstrapping before creating accounts in the panel

## Testing status

At the current refactor checkpoint:
- **build passes**
- **tests pass (30/30)**

Note: tests may still emit PostgreSQL connection-refused logs when no local DB is running. Current behavior is mostly log-and-continue for non-critical paths.

## Deployment notes

### Railway

Recommended flow:
1. connect repo to Railway
2. attach PostgreSQL
3. set required env vars
4. deploy
5. configure webhook URL to `/webhook`
6. create automations from the panel

### Docker

The included `Dockerfile` can be used on any container host.

## Current maturity

This branch is now at **functional multi-account MVP** level.

That means:
- backend foundation is in place
- admin panel flow exists
- account-aware routing exists
- account-aware credentials exist

Still worth improving over time:
- more polished panel UX
- richer account validation
- dedicated DB migrations framework
- more tests specifically for multi-account scenarios
>>>>>>> feature/multi-account-automation

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

<<<<<<< HEAD
Use of the Instagram Messaging API must comply with Meta platform rules and any applicable legal/commercial requirements.

If you plan to run this for client accounts, as an agency, or as a commercial service, verify the policy implications first. This repository is provided as software only; use it at your own risk.
=======
Using the Instagram Messaging API must comply with Meta platform rules and all applicable business/legal requirements.

If you plan to operate this for client accounts, agencies, or commercial use, validate policy implications first. Use at your own risk.
>>>>>>> feature/multi-account-automation
