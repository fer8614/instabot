import { Router, type Router as ExpressRouter } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { KeywordRule } from '../types/keyword.types.js';
import { listAccounts, upsertAccount, getAccountById } from '../services/account.service.js';
import { getKeywordRules, loadKeywordRules, loadKeywordRulesForAccount, saveKeywordRules } from '../services/keyword.service.js';

const router: ExpressRouter = Router();

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const env = getEnv();
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(requireApiKey);

router.get('/accounts', async (_req: Request, res: Response) => {
  try {
    const accounts = await listAccounts();
    res.json(accounts);
  } catch (err) {
    logger.error({ err }, 'Failed to list accounts');
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const account = await upsertAccount({
      id: req.body.id,
      name: req.body.name,
      pageId: req.body.pageId,
      accessToken: req.body.accessToken,
      verifyToken: req.body.verifyToken,
      appSecret: req.body.appSecret,
      resendApiKey: req.body.resendApiKey,
      emailFrom: req.body.emailFrom,
      welcomeEmailTemplate: req.body.welcomeEmailTemplate,
      enabled: req.body.enabled,
    });
    res.json(account);
  } catch (err) {
    logger.error({ err }, 'Failed to save account');
    res.status(500).json({ error: 'Failed to save account' });
  }
});

router.get('/keywords', async (req: Request, res: Response) => {
  try {
    const accountId = String(req.query.accountId || 'legacy-default');
    if (accountId === 'legacy-default') {
      loadKeywordRules(accountId);
    } else {
      await loadKeywordRulesForAccount(accountId);
    }
    res.json(getKeywordRules(accountId));
  } catch (err) {
    logger.error({ err }, 'Failed to get keywords');
    res.status(500).json({ error: 'Failed to load keywords' });
  }
});

router.post('/keywords', async (req: Request, res: Response) => {
  try {
    const accountId = String(req.query.accountId || req.body.accountId || 'legacy-default');
    const keywords = req.body.rules || req.body;
    if (!Array.isArray(keywords)) {
      res.status(400).json({ error: 'Invalid keywords format' });
      return;
    }
    await saveKeywordRules(accountId, keywords as KeywordRule[]);
    logger.info({ accountId, count: keywords.length }, 'Keywords updated via admin');
    res.json({ success: true, count: keywords.length });
  } catch (err) {
    logger.error({ err }, 'Failed to save keywords');
    res.status(500).json({ error: 'Failed to save keywords' });
  }
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const accountId = String(req.query.accountId || 'legacy-default');
    if (accountId !== 'legacy-default') {
      const account = await getAccountById(accountId);
      res.json(account);
      return;
    }

    const envPath = resolve(process.cwd(), '.env');
    let envContent = '';
    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch {
      // ignore
    }

    const config: Record<string, string | number> = {};
    const envVars = ['META_APP_SECRET', 'META_VERIFY_TOKEN', 'INSTAGRAM_PAGE_ACCESS_TOKEN', 'INSTAGRAM_PAGE_ID', 'ADMIN_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'WELCOME_EMAIL_TEMPLATE', 'DATABASE_URL', 'PORT', 'LOG_LEVEL'];
    const envLines = envContent.split('\n');
    const envFileVars: Record<string, string> = {};

    for (const line of envLines) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envFileVars[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    for (const key of envVars) {
      const value = envFileVars[key] || process.env[key] || '';
      config[key] = key === 'PORT' ? parseInt(value) || 3000 : value;
    }

    res.json(config);
  } catch (err) {
    logger.error({ err }, 'Failed to get config');
    res.status(500).json({ error: 'Failed to load config' });
  }
});

export { router as adminRouter };
