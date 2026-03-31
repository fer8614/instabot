import { Router } from 'express';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { verifySignature } from './verify.js';
import { parseWebhookPayload } from './parser.js';
import { handleComment } from '../handlers/comment.handler.js';
import { handleMessage } from '../handlers/message.handler.js';
import { handlePostback } from '../handlers/postback.handler.js';
import { handleMention } from '../handlers/mention.handler.js';
import type { MetaWebhookPayload } from '../types/meta.types.js';
import { getAccountByPageId, listAccounts } from '../services/account.service.js';
import { loadKeywordRules, loadKeywordRulesForAccount } from '../services/keyword.service.js';
import { setCurrentAccount } from '../services/request-context.service.js';

export const webhookRouter: ExpressRouter = Router();

webhookRouter.get('/', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode !== 'subscribe') {
    res.status(403).send('Forbidden');
    return;
  }

  const env = getEnv();
  if (token === env.META_VERIFY_TOKEN) {
    logger.info('Legacy webhook verification successful');
    res.status(200).send(challenge);
    return;
  }

  const accounts = await listAccounts();
  if (accounts.some((account) => account.verifyToken === token)) {
    logger.info({ token }, 'Account webhook verification successful');
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, token }, 'Webhook verification failed');
  res.status(403).send('Forbidden');
});

webhookRouter.post('/', verifySignature, (req: Request, res: Response) => {
  res.status(200).send('EVENT_RECEIVED');

  const payload = req.body as MetaWebhookPayload;

  setImmediate(async () => {
    try {
      const pageId = payload.entry?.[0]?.id;
      const account = pageId ? await getAccountByPageId(pageId) : null;
      if (account) {
        setCurrentAccount(account);
        await loadKeywordRulesForAccount(account.id);
      } else {
        setCurrentAccount(null);
        loadKeywordRules('legacy-default');
      }

      const events = parseWebhookPayload(payload);
      logger.info({ eventCount: events.length, accountId: account?.id ?? 'legacy-default' }, 'Processing webhook events');

      for (const event of events) {
        switch (event.type) {
          case 'comment':
            handleComment(event.data).catch((err) => logger.error({ err, event: event.data }, 'Error handling comment'));
            break;
          case 'message':
            handleMessage(event.data).catch((err) => logger.error({ err }, 'Error handling message'));
            break;
          case 'postback':
            handlePostback(event.data).catch((err) => logger.error({ err }, 'Error handling postback'));
            break;
          case 'mention':
            handleMention(event.data).catch((err) => logger.error({ err }, 'Error handling mention'));
            break;
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error parsing webhook payload');
    }
  });
});
