# InstaBot

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

- **Keyword-triggered DMs** on Instagram comments
- **DM keyword matching** from inbound messages
- **Branching conversation flows** — postback buttons can trigger other keywords
- **DEFAULT fallback keyword** — catch-all response for any comment
- **Scheduled/delayed messages** — send automatic follow-up DMs after configurable delays (up to 24 hours)
- **Keyword matching types:**
  - `exact`
  - `contains`
  - `word_boundary`
- **Button/postback flows** with custom payloads
- **Email capture flow** with optional Resend integration
- **Reminder flow** for pending email capture
- **Story mention replies**
- **Ice Breaker support**
- **Per-user cooldowns and rate limiting**
- **PostgreSQL persistence** for:
  - accounts
  - keyword rule sets
  - leads
  - DM logs
  - scheduled messages
- **Admin panel** for multi-account management
- **Railway / Docker** friendly deployment

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

- `instagram_accounts` — stores credentials and settings per account
- `keyword_rule_sets` — keyword rules per account (stored as JSON)
- `leads` — user leads with `account_id` for isolation
- `dm_log` — DM history with `account_id` for isolation
- `scheduled_messages` — delayed/cron DMs scheduled per user and keyword

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

### 3. Configure base environment

```bash
cp .env.example .env
```

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

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
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
- **List automations/accounts** with status
- **Create new automation** with unique credentials
- **Select active automation** for editing
- **Edit per-account credentials** (page ID, tokens, secrets)
- **Configure keyword rules per account** with:
  - Keyword matching (exact, contains, word_boundary)
  - Priority and cooldown settings
  - Email capture flow
  - Initial response (text or button)
  - Follow-up response (text or button)
  - **Scheduled messages** (delayed DMs with configurable delays)
- **Branching flows** — postback buttons can trigger other keywords
- **DEFAULT fallback keyword** — catch-all for unmapped comments
- **Save account-specific keyword sets** to database

## Branching conversation flows

InstaBot supports **ManyChat-style branching** where button clicks trigger other keywords:

1. Create a keyword with a button response
2. Set button payload to match another keyword name (e.g., `VER_CURSO`)
3. When user clicks the button, the postback triggers the `VER_CURSO` keyword
4. The response to `VER_CURSO` is sent automatically

This enables multi-step conversations without hardcoding flows.

## Scheduled/delayed messages

Send automatic follow-up DMs after a delay:

1. Edit a keyword in the admin panel
2. Scroll to **"⏰ Mensajes Programados"**
3. Click **"+ Mensaje Programado"**
4. Set:
   - **Delay (minutes):** 30, 120, 1440, etc. (max 1440 = 24 hours)
   - **Type:** Text or Button
   - **Text:** Message content
   - **Buttons:** (optional) postback or URL buttons
5. Save

When a user triggers the keyword, the bot:
1. Sends the initial response immediately
2. Schedules follow-up messages for later
3. Sends them automatically at the configured times

**Limitation:** Instagram only allows DMs within 24 hours of the last user interaction.

## DEFAULT fallback keyword

Create a catch-all keyword that responds to any comment:

1. Create a keyword with ID `Default`
2. Set **Keyword Principal** to `DEFAULT`
3. Set **Tipo de Match** to `Exacto`
4. Set **Prioridad** to `999` (lowest priority)
5. Configure the response

When a comment doesn't match any other keyword, the DEFAULT keyword responds.

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

This branch is now at **feature-complete multi-account automation** level.

**Implemented features:**
- ✅ Multi-account support with isolated credentials and data
- ✅ Keyword-triggered DMs on comments and messages
- ✅ Branching conversation flows (postback → keyword)
- ✅ DEFAULT fallback keyword for catch-all responses
- ✅ Scheduled/delayed messages (cron-style DMs)
- ✅ Email capture and optional Resend integration
- ✅ Admin panel for full account and keyword management
- ✅ PostgreSQL persistence
- ✅ Per-user cooldowns and rate limiting
- ✅ Account-aware webhook routing and signature validation

**Still worth improving over time:**
- More polished admin panel UX
- Richer account validation
- Dedicated DB migrations framework
- More tests specifically for multi-account scenarios
- Analytics/reporting dashboard
- Bulk keyword import/export

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

Using the Instagram Messaging API must comply with Meta platform rules and all applicable business/legal requirements.

If you plan to operate this for client accounts, agencies, or commercial use, validate policy implications first. Use at your own risk.
