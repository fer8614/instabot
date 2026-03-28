import { Router, type Router as ExpressRouter } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getKeywordRules } from '../services/keyword.service.js';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { KeywordRule } from '../types/keyword.types.js';

const router: ExpressRouter = Router();

// API Key middleware
function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const env = getEnv();
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

// Apply API key protection to all admin routes
router.use(requireApiKey);

// Get keywords
router.get('/keywords', async (_req: Request, res: Response) => {
  try {
    const keywordsPath = resolve(process.cwd(), 'keywords.json');
    const content = await readFile(keywordsPath, 'utf-8');
    const rules: KeywordRule[] = JSON.parse(content);
    res.json(rules);
  } catch (err) {
    logger.error({ err }, 'Failed to get keywords');
    res.status(500).json({ error: 'Failed to load keywords' });
  }
});

// Save keywords
router.post('/keywords', async (req: Request, res: Response) => {
  try {
    const keywords = req.body;

    if (!Array.isArray(keywords)) {
      res.status(400).json({ error: 'Invalid keywords format' });
      return;
    }

    // Write to keywords.json
    const keywordsPath = resolve(process.cwd(), 'keywords.json');
    await writeFile(keywordsPath, JSON.stringify(keywords, null, 2), 'utf-8');

    logger.info({ count: keywords.length }, 'Keywords updated via admin');
    res.json({ success: true, count: keywords.length });
  } catch (err) {
    logger.error({ err }, 'Failed to save keywords');
    res.status(500).json({ error: 'Failed to save keywords' });
  }
});

// Get config
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const envPath = resolve(process.cwd(), '.env');
    let envContent = '';

    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch {
      // If .env doesn't exist, use current env
    }

    const config: Record<string, string | number> = {};
    const envVars = [
      'META_APP_SECRET',
      'META_VERIFY_TOKEN',
      'INSTAGRAM_PAGE_ACCESS_TOKEN',
      'INSTAGRAM_PAGE_ID',
      'ADMIN_API_KEY',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'WELCOME_EMAIL_TEMPLATE',
      'DATABASE_URL',
      'PORT',
      'LOG_LEVEL',
    ];

    // Parse .env file
    const envLines = envContent.split('\n');
    const envFileVars: Record<string, string> = {};

    for (const line of envLines) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envFileVars[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    // Build config response
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

// Save config
router.post('/config', async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;

    // Read existing .env
    const envPath = resolve(process.cwd(), '.env');
    let envContent = '';

    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch {
      // Start fresh if no .env
    }

    // Parse existing
    const envLines = envContent.split('\n');
    const envMap: Record<string, string> = {};

    for (const line of envLines) {
      if (line.startsWith('#') || line.trim() === '') {
        continue;
      }
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envMap[key] = value;
      }
    }

    // Update with new values
    for (const [key, value] of Object.entries(newConfig)) {
      if (value !== undefined && value !== null && value !== '') {
        envMap[key] = String(value);
      }
    }

    // Rebuild .env content
    const sections: Record<string, string[]> = {
      'Meta / Instagram API': [
        'META_APP_SECRET',
        'META_VERIFY_TOKEN',
        'INSTAGRAM_PAGE_ACCESS_TOKEN',
        'INSTAGRAM_PAGE_ID',
      ],
      'Server': ['PORT', 'NODE_ENV', 'LOG_LEVEL'],
      'Admin': ['ADMIN_API_KEY'],
      'Database (PostgreSQL)': ['DATABASE_URL'],
      'Email (optional)': ['RESEND_API_KEY', 'EMAIL_FROM', 'WELCOME_EMAIL_TEMPLATE'],
    };

    let newEnvContent = '';

    for (const [section, keys] of Object.entries(sections)) {
      if (newEnvContent) newEnvContent += '\n';
      newEnvContent += `# ${section}\n`;
      for (const key of keys) {
        if (envMap[key] !== undefined) {
          const val = envMap[key];
          // Quote if contains spaces or special chars
          const needsQuotes = val.includes(' ') || val.includes('#') || val.includes(';');
          newEnvContent += `${key}=${needsQuotes ? `"${val}"` : val}\n`;
        }
      }
    }

    // Add any remaining vars not in sections
    const usedKeys = Object.values(sections).flat();
    const remaining = Object.entries(envMap).filter(([k]) => !usedKeys.includes(k));
    if (remaining.length > 0) {
      newEnvContent += '\n# Other\n';
      for (const [key, val] of remaining) {
        const needsQuotes = val.includes(' ') || val.includes('#') || val.includes(';');
        newEnvContent += `${key}=${needsQuotes ? `"${val}"` : val}\n`;
      }
    }

    await writeFile(envPath, newEnvContent, 'utf-8');

    // Update process.env for current session
    for (const [key, value] of Object.entries(newConfig)) {
      if (value !== undefined && value !== null) {
        process.env[key] = String(value);
      }
    }

    logger.info('Config updated via admin');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to save config');
    res.status(500).json({ error: 'Failed to save config' });
  }
});

export { router as adminRouter };
