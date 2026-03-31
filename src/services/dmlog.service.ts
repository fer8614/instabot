import { getCurrentAccount } from './request-context.service.js';
import { getDb } from './db.js';

function accountId(): string {
  return getCurrentAccount()?.id ?? 'legacy-default';
}

export async function logDM(data: {
  igUserId: string;
  direction: 'inbound' | 'outbound';
  messageType?: string;
  keywordId?: string;
  content?: string;
}): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO dm_log (account_id, ig_user_id, direction, message_type, keyword_id, content)
    VALUES (${accountId()}, ${data.igUserId}, ${data.direction}, ${data.messageType ?? null}, ${data.keywordId ?? null}, ${data.content ?? null})
  `;
}
