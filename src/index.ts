import express from 'express';
import type { Express, Request, Response } from 'express';
import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { loadKeywordRules } from './services/keyword.service.js';
import { initDb } from './services/db.js';
import { startEmailReminder } from './services/reminder.service.js';
import { webhookRouter } from './webhooks/router.js';
import { adminRouter } from './webhooks/admin.router.js';

const env = loadEnv();

try {
  loadKeywordRules();
} catch (err) {
  logger.warn({ err }, 'Failed to load legacy keyword rules at startup');
}

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

// Middleware to protect admin panel (only for HTML, not static assets)
function requireAdminAuth(req: Request, res: Response, next: Function): void {
  // Allow static assets (CSS, JS, images, etc.)
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)) {
    next();
    return;
  }
  
  // Allow index.html with authentication
  if (req.path === '/' || req.path === '/index.html') {
    const apiKey = req.query.key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
      res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Admin Panel - Authentication Required</title>
          <style>
            body { font-family: system-ui; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .container { text-align: center; background: #1e293b; padding: 40px; border-radius: 8px; border: 1px solid #475569; }
            h1 { margin: 0 0 20px 0; }
            input { padding: 10px; width: 300px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; border-radius: 4px; }
            button { padding: 10px 20px; margin-top: 10px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #4f46e5; }
            .error { color: #ef4444; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Admin Panel</h1>
            <p>Ingresa tu API Key para acceder</p>
            <form method="GET">
              <input type="password" name="key" placeholder="ADMIN_API_KEY" required autofocus>
              <br>
              <button type="submit">Acceder</button>
            </form>
            <p class="error">API Key inválida o no proporcionada</p>
          </div>
        </body>
        </html>
      `);
      return;
    }
  }
  
  next();
}

// Admin frontend static files (protected)
app.use('/admin', requireAdminAuth, express.static('admin'));

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
