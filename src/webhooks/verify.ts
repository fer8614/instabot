import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { listAccounts } from '../services/account.service.js';

function matchesSignature(secret: string, rawBody: Buffer, signature: string): boolean {
  const expectedSignature = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  return sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer);
}

export async function verifySignature(req: Request, res: Response, next: NextFunction): Promise<void> {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  if (!signature) {
    logger.warn('Missing X-Hub-Signature-256 header');
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    logger.error('Raw body not available for signature verification');
    res.status(500).json({ error: 'Internal error' });
    return;
  }

  const env = getEnv();
  if (matchesSignature(env.META_APP_SECRET, rawBody, signature)) {
    next();
    return;
  }

  const accounts = await listAccounts();
  if (accounts.some((account) => matchesSignature(account.appSecret, rawBody, signature))) {
    next();
    return;
  }

  logger.warn('Invalid webhook signature');
  res.status(401).json({ error: 'Invalid signature' });
}

export function computeSignature(secret: string, payload: string | Buffer): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}
