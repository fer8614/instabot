# InstaBot

**Open-source ManyChat alternative. Self-hosted Instagram DM automation for ~$5/month.**

Replace your $50/month ManyChat subscription with a self-hosted server that does keyword-triggered DMs, email collection, and resource delivery — all running on Railway (or any Node.js host).

---

## Features

- **Keyword-triggered DMs** — Someone comments a keyword on your post, they get a DM automatically
- **3 match types** — `exact`, `contains`, or `word_boundary` (regex) matching
- **Conversational email flow** — CTA button → ask for email → 10-min reminder → deliver resource
- **Returning user detection** — Recognizes users who already gave their email, asks to confirm or update
- **Email delivery** — Send resource links + welcome emails via Resend
- **Story mention replies** — Auto-reply when someone mentions you in their story
- **Ice Breaker support** — Works with Instagram's native conversation starters
- **Cooldowns & rate limits** — Per-keyword cooldowns + global rate limiting
- **PostgreSQL** — Leads, DM logs, and email status tracked in a database
- **One-click deploy** — Dockerfile + `railway.toml` included

## How It Works

```
User comments "CLASE" on your post
        │
        ▼
InstaBot matches keyword → sends DM with CTA button
        │
        ▼
User clicks button → "What's your email?"
        │
        ▼
User sends email → Resource delivered via DM + email
```

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/juancadile/instabot.git
cd instabot
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Meta API credentials, database URL, etc.
```

### 3. Set up your keywords

Edit `keywords.json` to define your automation rules:

```json
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
```

### 4. Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template)

Or deploy manually:
1. Push to GitHub
2. Connect repo to Railway
3. Add a PostgreSQL plugin
4. Set environment variables
5. Deploy

### 5. Configure Meta Webhook

1. Go to [Meta Developer Console](https://developers.facebook.com)
2. Set webhook URL to `https://your-app.up.railway.app/webhook`
3. Subscribe to: `comments`, `messages`, `messaging_postbacks`

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_SECRET` | Yes | Your Meta app secret (for webhook signature verification) |
| `META_VERIFY_TOKEN` | Yes | Token you choose for webhook verification |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` | Yes | Instagram page access token |
| `INSTAGRAM_PAGE_ID` | Yes | Your Instagram page/account ID |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_API_KEY` | Yes | API key for admin endpoints |
| `PORT` | No | Server port (default: 3000) |
| `RESEND_API_KEY` | No | Resend API key (enables email features) |
| `EMAIL_FROM` | No | Sender address (default: `InstaBot <noreply@example.com>`) |
| `WELCOME_EMAIL_TEMPLATE` | No | Welcome email template filename (default: `bienvenido.html`) |

### Keyword Match Types

| Type | Behavior | Example |
|------|----------|---------|
| `exact` | Full text must match | "CLASE" matches "CLASE" only |
| `contains` | Keyword anywhere in text | "CLASE" matches "quiero la CLASE gratis" |
| `word_boundary` | Whole word match | "AI" matches "tell me about AI" but not "WAIT" |

All matching is case-insensitive.

### Email Templates

Two welcome email templates are included in `email-templates/`:

- `bienvenido.html` — Golem Lab branded template (default)
- `welcome-generic.html` — Clean generic template for your own branding

To use the generic template, set in your `.env`:

```
WELCOME_EMAIL_TEMPLATE=welcome-generic.html
```

Or create your own HTML template in `email-templates/` and point to it. The template uses `{{1.record.full_name}}` as the name placeholder.

## Architecture

```
src/
├── index.ts                 # Entry point
├── config/env.ts            # Zod-validated environment
├── webhooks/
│   ├── router.ts            # GET/POST /webhook
│   ├── verify.ts            # HMAC signature verification
│   └── parser.ts            # Parse Meta webhook events
├── handlers/
│   ├── comment.handler.ts   # Comment → keyword match → DM
│   ├── message.handler.ts   # DM → email collection / keyword match
│   ├── postback.handler.ts  # Button clicks → email flow
│   └── mention.handler.ts   # Story mention → thank you DM
├── services/
│   ├── instagram.service.ts # Instagram Graph API client
│   ├── keyword.service.ts   # Keyword matching engine
│   ├── cooldown.service.ts  # Rate limits & cooldowns
│   ├── lead.service.ts      # Lead CRUD (PostgreSQL)
│   ├── email.service.ts     # Resend email delivery
│   ├── reminder.service.ts  # 10-min email reminder
│   └── db.ts                # Database connection & migrations
└── utils/
    ├── logger.ts            # Pino structured logging
    ├── retry.ts             # Exponential backoff for API calls
    └── templates.ts         # {{username}} template rendering
```

## Running Locally

```bash
# Development (auto-reload)
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Tests
pnpm test
```

For local webhook testing, use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000
# Then set the ngrok URL as your webhook URL in Meta Developer Console
```

## Cost Comparison

| | ManyChat | InstaBot |
|---|---------|----------|
| Monthly cost | $15-50+ | ~$5 (Railway) |
| DM limits | Plan-dependent | Unlimited* |
| Data ownership | ManyChat's servers | Your database |
| Customization | Limited | Full source code |

*Subject to Instagram API rate limits.

---

## Need Help?

This project is maintained by [Juan Cadile](https://instagram.com/juancadile) / [Golem Lab](https://golemlab.ai) / [SALVé-Techlanna](https://techlanna.com).

**We offer:**
- Custom setup & deployment for your brand
- Feature development (LLM-powered replies, analytics dashboards, multi-account)
- Team training, development, and consulting on AI and business automation.
- Integration with your existing tools (CRM, email marketing, etc.)

**Reach out:** hello@techlanna.com

### Learn to Build with AI

For Spanish Speakers, check out the [Golem Lab Bootcamps](https://golemlab.ai/bootcamps) — intensive 10-week programs to build real products with AI:

- **Vibe Coding Bootcamp** — Go from idea to MVP without writing code
- **AI Engineer Bootcamp** — Go from developer to AI engineer

For English speakers, check out [SALVé-Techlanna](https://techlanna.com) for AI and automation education, consulting, and development.
---

## License

MIT — use it, modify it, sell it. See [LICENSE](LICENSE) for details.

---

## Disclaimer

To the best of our understanding, using this tool with the official Instagram Messaging API for your own account (personal or business) is permitted by Meta's platform policies and does not require App Review. However, using it to manage third-party accounts or offer it as a service to clients may require additional Meta approvals.

This is not legal advice. If you intend to use this tool commercially or on behalf of clients, consult a qualified legal professional to ensure compliance with Meta's Platform Terms, Instagram's policies, and applicable laws.

The authors and contributors of this project accept no liability for any account suspension, ban, legal claim, or other consequence arising from the use of this software. **Use at your own risk.**
