import crypto from 'node:crypto';
import { getEnv } from '../config/env.js';
import { getDb } from './db.js';
import type { AccountContext, InstagramAccount } from '../types/account.types.js';

function rowToContext(row: InstagramAccount): AccountContext {
  return {
    id: row.id,
    name: row.name,
    pageId: row.page_id,
    accessToken: row.access_token,
    verifyToken: row.verify_token,
    appSecret: row.app_secret,
    resendApiKey: row.resend_api_key ?? undefined,
    emailFrom: row.email_from ?? undefined,
    welcomeEmailTemplate: row.welcome_email_template ?? undefined,
    enabled: row.enabled,
  };
}

function legacyAccount(): AccountContext {
  const env = getEnv();
  return {
    id: 'legacy-default',
    name: 'Legacy Default Account',
    pageId: env.INSTAGRAM_PAGE_ID,
    accessToken: env.INSTAGRAM_PAGE_ACCESS_TOKEN,
    verifyToken: env.META_VERIFY_TOKEN,
    appSecret: env.META_APP_SECRET,
    resendApiKey: env.RESEND_API_KEY,
    emailFrom: env.EMAIL_FROM,
    welcomeEmailTemplate: env.WELCOME_EMAIL_TEMPLATE,
    enabled: true,
  };
}

export async function listAccounts(): Promise<AccountContext[]> {
  const db = getDb();
  const rows = await db<InstagramAccount[]>`SELECT * FROM instagram_accounts ORDER BY created_at DESC`;
  if (rows.length === 0) {
    return [legacyAccount()];
  }
  return rows.map(rowToContext);
}

export async function getAccountById(accountId: string): Promise<AccountContext | null> {
  if (accountId === 'legacy-default') {
    return legacyAccount();
  }
  const db = getDb();
  const [row] = await db<InstagramAccount[]>`SELECT * FROM instagram_accounts WHERE id = ${accountId} LIMIT 1`;
  return row ? rowToContext(row) : null;
}

export async function getAccountByPageId(pageId: string): Promise<AccountContext | null> {
  const db = getDb();
  const [row] = await db<InstagramAccount[]>`SELECT * FROM instagram_accounts WHERE page_id = ${pageId} AND enabled = true LIMIT 1`;
  if (row) return rowToContext(row);

  const env = getEnv();
  if (env.INSTAGRAM_PAGE_ID === pageId) {
    return legacyAccount();
  }

  return null;
}

export async function upsertAccount(data: {
  id?: string;
  name: string;
  pageId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  resendApiKey?: string;
  emailFrom?: string;
  welcomeEmailTemplate?: string;
  enabled?: boolean;
}): Promise<AccountContext> {
  const db = getDb();
  const accountId = data.id ?? crypto.randomUUID();

  const [row] = await db<InstagramAccount[]>`
    INSERT INTO instagram_accounts (
      id, name, page_id, access_token, verify_token, app_secret,
      resend_api_key, email_from, welcome_email_template, enabled
    )
    VALUES (
      ${accountId}, ${data.name}, ${data.pageId}, ${data.accessToken}, ${data.verifyToken}, ${data.appSecret},
      ${data.resendApiKey ?? null}, ${data.emailFrom ?? null}, ${data.welcomeEmailTemplate ?? null}, ${data.enabled ?? true}
    )
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      page_id = EXCLUDED.page_id,
      access_token = EXCLUDED.access_token,
      verify_token = EXCLUDED.verify_token,
      app_secret = EXCLUDED.app_secret,
      resend_api_key = EXCLUDED.resend_api_key,
      email_from = EXCLUDED.email_from,
      welcome_email_template = EXCLUDED.welcome_email_template,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING *
  `;

  return rowToContext(row);
}
