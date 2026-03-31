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
```

## Tech stack

- Node.js 20+
- TypeScript
- Express
- PostgreSQL
- Zod
- Pino
- Resend
- Vitest
- pnpm

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

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

Using the Instagram Messaging API must comply with Meta platform rules and all applicable business/legal requirements.

If you plan to operate this for client accounts, agencies, or commercial use, validate policy implications first. Use at your own risk.
