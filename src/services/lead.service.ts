import { getDb } from './db.js';
import { logger } from '../utils/logger.js';
import { getCurrentAccount } from './request-context.service.js';

export interface Lead {
  id: number;
  account_id: string;
  ig_user_id: string;
  ig_username: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  keyword_id: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function accountId(): string {
  return getCurrentAccount()?.id ?? 'legacy-default';
}

export async function upsertLead(data: {
  igUserId: string;
  igUsername?: string;
  name?: string;
  email?: string;
  source?: string;
  keywordId?: string;
}): Promise<Lead> {
  const db = getDb();
  const currentAccountId = accountId();

  const [lead] = await db<Lead[]>`
    INSERT INTO leads (account_id, ig_user_id, ig_username, name, source, keyword_id)
    VALUES (${currentAccountId}, ${data.igUserId}, ${data.igUsername ?? null}, ${data.name ?? null}, ${data.source ?? null}, ${data.keywordId ?? null})
    ON CONFLICT (account_id, ig_user_id)
    DO UPDATE SET
      ig_username = COALESCE(EXCLUDED.ig_username, leads.ig_username),
      name = COALESCE(EXCLUDED.name, leads.name),
      keyword_id = COALESCE(EXCLUDED.keyword_id, leads.keyword_id),
      updated_at = NOW()
    RETURNING *
  `;

  logger.debug({ accountId: currentAccountId, igUserId: data.igUserId, status: lead.status }, 'Lead upserted');
  return lead;
}

export async function setLeadEmail(igUserId: string, email: string): Promise<Lead> {
  const db = getDb();
  const currentAccountId = accountId();

  const [lead] = await db<Lead[]>`
    UPDATE leads
    SET email = ${email}, status = 'email_collected', updated_at = NOW()
    WHERE account_id = ${currentAccountId} AND ig_user_id = ${igUserId}
    RETURNING *
  `;

  logger.info({ accountId: currentAccountId, igUserId, email }, 'Lead email collected');
  return lead;
}

export async function setLeadStatus(igUserId: string, status: string): Promise<void> {
  const db = getDb();
  await db`UPDATE leads SET status = ${status}, updated_at = NOW() WHERE account_id = ${accountId()} AND ig_user_id = ${igUserId}`;
}

export async function getLeadByIgUserId(igUserId: string): Promise<Lead | null> {
  const db = getDb();
  const [lead] = await db<Lead[]>`SELECT * FROM leads WHERE account_id = ${accountId()} AND ig_user_id = ${igUserId}`;
  return lead ?? null;
}

export async function getLeadsPendingEmailReminder(): Promise<Lead[]> {
  const db = getDb();
  return db<Lead[]>`
    SELECT * FROM leads
    WHERE account_id = ${accountId()}
    AND status = 'email_pending'
    AND updated_at < NOW() - INTERVAL '10 minutes'
    AND updated_at > NOW() - INTERVAL '15 minutes'
  `;
}
