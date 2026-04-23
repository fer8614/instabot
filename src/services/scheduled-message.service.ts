import type { ScheduledMessage, MessageButton } from '../types/keyword.types.js';
import { getDb } from './db.js';
import { sendTextDM, sendButtonDM } from './instagram.service.js';
import { logDM } from './dmlog.service.js';
import { getAccountById } from './account.service.js';
import { setCurrentAccount } from './request-context.service.js';
import { logger } from '../utils/logger.js';

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function createScheduledMessages(
  accountId: string,
  igUserId: string,
  keywordId: string,
  messages: ScheduledMessage[],
): Promise<void> {
  const db = getDb();

  for (const msg of messages) {
    await db`
      INSERT INTO scheduled_messages (account_id, ig_user_id, keyword_id, message_text, message_type, buttons, delay_minutes, send_at)
      VALUES (
        ${accountId},
        ${igUserId},
        ${keywordId},
        ${msg.text},
        ${msg.type},
        ${msg.buttons?.length ? JSON.stringify(msg.buttons) : null}::jsonb,
        ${msg.delayMinutes},
        NOW() + ${`${msg.delayMinutes} minutes`}::interval
      )
    `;
  }

  logger.info({ accountId, igUserId, keywordId, count: messages.length }, 'Scheduled messages created');
}

async function processScheduledMessages(): Promise<void> {
  const db = getDb();

  const pending = await db<{
    id: number;
    account_id: string;
    ig_user_id: string;
    keyword_id: string;
    message_text: string;
    message_type: string;
    buttons: MessageButton[] | null;
  }[]>`
    SELECT id, account_id, ig_user_id, keyword_id, message_text, message_type, buttons
    FROM scheduled_messages
    WHERE status = 'pending' AND send_at <= NOW()
    ORDER BY send_at ASC
    LIMIT 20
  `;

  if (!pending.length) return;

  logger.info({ count: pending.length }, 'Processing scheduled messages');

  for (const msg of pending) {
    try {
      const account = await getAccountById(msg.account_id);
      if (account) {
        setCurrentAccount(account);
      }

      const buttons: MessageButton[] | null = typeof msg.buttons === 'string' ? JSON.parse(msg.buttons) : msg.buttons;
      if (msg.message_type === 'button' && buttons?.length) {
        await sendButtonDM(msg.ig_user_id, msg.message_text, buttons);
      } else {
        await sendTextDM(msg.ig_user_id, msg.message_text);
      }

      await db`UPDATE scheduled_messages SET status = 'sent' WHERE id = ${msg.id}`;

      logDM({
        igUserId: msg.ig_user_id,
        direction: 'outbound',
        messageType: 'scheduled',
        keywordId: msg.keyword_id,
        content: msg.message_text,
      }).catch(() => {});

      logger.info({ id: msg.id, igUserId: msg.ig_user_id, keywordId: msg.keyword_id }, 'Scheduled message sent');
    } catch (err) {
      await db`UPDATE scheduled_messages SET status = 'failed' WHERE id = ${msg.id}`;
      logger.error({ err, id: msg.id, igUserId: msg.ig_user_id }, 'Failed to send scheduled message');
    }
  }
}

export function startScheduledMessages(): void {
  intervalId = setInterval(async () => {
    try {
      await processScheduledMessages();
    } catch (err) {
      logger.error({ err }, 'Error in scheduled messages check');
    }
  }, 60_000);

  logger.info('Scheduled messages service started (checks every 60s)');
}

export function stopScheduledMessages(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
