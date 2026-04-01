import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KeywordRule } from '../types/keyword.types.js';
import { logger } from '../utils/logger.js';
import { getDb } from './db.js';

let rulesByAccount = new Map<string, KeywordRule[]>();

function loadRulesFromFile(filePath?: string): KeywordRule[] {
  const path = filePath ?? resolve(process.cwd(), 'keywords.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed: KeywordRule[] = JSON.parse(raw);
  return parsed.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
}

export function loadKeywordRules(accountIdOrFilePath = 'legacy-default', maybeFilePath?: string): KeywordRule[] {
  const looksLikeFilePath = accountIdOrFilePath.endsWith('.json') || accountIdOrFilePath.includes('/');

  if (looksLikeFilePath) {
    const rules = loadRulesFromFile(accountIdOrFilePath);
    rulesByAccount.set('legacy-default', rules);
    logger.info({ accountId: 'legacy-default', count: rules.length }, 'Loaded keyword rules from file path');
    return rules;
  }

  const accountId = accountIdOrFilePath;
  if (accountId !== 'legacy-default') {
    throw new Error('Use loadKeywordRulesForAccount(accountId) for DB-backed accounts');
  }

  const rules = loadRulesFromFile(maybeFilePath);
  rulesByAccount.set(accountId, rules);
  logger.info({ accountId, count: rules.length }, 'Loaded legacy keyword rules');
  return rules;
}

export async function loadKeywordRulesForAccount(accountId: string): Promise<KeywordRule[]> {
  if (accountId === 'legacy-default') {
    return loadKeywordRules(accountId);
  }

  const db = getDb();
  const rows = await db<{ rules_json: string }[]>`
    SELECT rules_json FROM keyword_rule_sets WHERE account_id = ${accountId} LIMIT 1
  `;

  const rules = rows[0]
    ? (JSON.parse(rows[0].rules_json) as KeywordRule[]).filter((r) => r.enabled).sort((a, b) => a.priority - b.priority)
    : [];

  rulesByAccount.set(accountId, rules);
  logger.info({ accountId, count: rules.length }, 'Loaded keyword rules');
  return rules;
}

export function getKeywordRules(accountId = 'legacy-default'): KeywordRule[] {
  return rulesByAccount.get(accountId) ?? [];
}

export function matchKeyword(commentText: string, accountId = 'legacy-default'): KeywordRule | null {
  const rules = getKeywordRules(accountId);
  const text = commentText.trim();

  for (const rule of rules) {
    const keywords = [rule.keyword, ...rule.aliases];
    for (const kw of keywords) {
      if (isMatch(text, kw, rule.matchType)) return rule;
    }
  }

  return null;
}

function isMatch(text: string, keyword: string, matchType: KeywordRule['matchType']): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  switch (matchType) {
    case 'exact':
      return lowerText === lowerKeyword;
    case 'contains':
      return lowerText.includes(lowerKeyword);
    case 'word_boundary': {
      const escaped = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(text);
    }
  }
}

export async function saveKeywordRules(accountId: string, rules: KeywordRule[]): Promise<void> {
  if (accountId === 'legacy-default') {
    const keywordsPath = resolve(process.cwd(), 'keywords.json');
    await import('node:fs/promises').then(({ writeFile }) => writeFile(keywordsPath, JSON.stringify(rules, null, 2), 'utf-8'));
    rulesByAccount.set(accountId, rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority));
    return;
  }

  const db = getDb();
  await db`
    INSERT INTO keyword_rule_sets (account_id, rules_json)
    VALUES (${accountId}, ${JSON.stringify(rules)})
    ON CONFLICT (account_id)
    DO UPDATE SET rules_json = EXCLUDED.rules_json, updated_at = NOW()
  `;
  rulesByAccount.set(accountId, rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority));
}
