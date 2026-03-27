import express from 'express';
import type { Express, Request, Response } from 'express';
import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { loadKeywordRules } from './services/keyword.service.js';
import { initDb } from './services/db.js';
import { startEmailReminder } from './services/reminder.service.js';
import { webhookRouter } from './webhooks/router.js';
import { adminRouter } from './webhooks/admin.router.js';

// Load and validate env vars
const env = loadEnv();

// Load keyword rules
loadKeywordRules();

const app: Express = express();

// Parse JSON body and preserve raw body for signature verification
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

// Health endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

// Admin API routes
app.use('/api/admin', adminRouter);

// Admin frontend static files
app.use('/admin', express.static('admin'));

// Redirect root to admin
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/admin');
});

// Webhook routes
app.use('/webhook', webhookRouter);

// Start server first (admin panel works without DB)
app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'GolemBot server started');
});

// Initialize database in background (non-blocking)
initDb()
  .then(() => {
    startEmailReminder();
    logger.info('Database initialized and email reminders started');
  })
  .catch((err) => {
    logger.warn({ err }, 'Database initialization failed - webhooks will not work until DB is configured');
  });

export { app };
