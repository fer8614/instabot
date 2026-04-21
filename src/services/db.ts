import postgres from 'postgres';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

let sql: ReturnType<typeof postgres> | undefined;

export function getDb(): ReturnType<typeof postgres> {
  if (!sql) {
    const env = getEnv();
    sql = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

export async function initDb(): Promise<void> {
  const db = getDb();

  await db`
    CREATE TABLE IF NOT EXISTS instagram_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      page_id TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      verify_token TEXT NOT NULL,
      app_secret TEXT NOT NULL,
      resend_api_key TEXT,
      email_from TEXT,
      welcome_email_template TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS keyword_rule_sets (
      account_id TEXT PRIMARY KEY REFERENCES instagram_accounts(id) ON DELETE CASCADE,
      rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      account_id TEXT NOT NULL DEFAULT 'legacy-default',
      ig_user_id TEXT NOT NULL,
      ig_username TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      source TEXT,
      keyword_id TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE leads ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT 'legacy-default'`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS leads_account_ig_user_id_idx ON leads (account_id, ig_user_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS dm_log (
      id SERIAL PRIMARY KEY,
      account_id TEXT NOT NULL DEFAULT 'legacy-default',
      ig_user_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      message_type TEXT,
      keyword_id TEXT,
      content TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE dm_log ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT 'legacy-default'`;
  await db`CREATE INDEX IF NOT EXISTS dm_log_account_ig_user_id_idx ON dm_log (account_id, ig_user_id)`;

  await db`
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id SERIAL PRIMARY KEY,
      account_id TEXT NOT NULL,
      ig_user_id TEXT NOT NULL,
      keyword_id TEXT,
      message_text TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      buttons JSONB,
      delay_minutes INTEGER NOT NULL,
      send_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS scheduled_messages_pending_idx ON scheduled_messages (status, send_at) WHERE status = 'pending'`;

  logger.info('Database initialized');
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = undefined;
  }
}
