import type { MetaCommentValue } from '../types/meta.types.js';
import { matchKeyword, getKeywordRules } from '../services/keyword.service.js';
import { isOnCooldown, isRateLimited, recordTrigger } from '../services/cooldown.service.js';
import { sendTextDM, sendButtonDM, sendCommentReplyDM, sendCommentReplyButtonDM, replyToComment } from '../services/instagram.service.js';
import { renderTemplate } from '../utils/templates.js';
import { logger } from '../utils/logger.js';
import { upsertLead } from '../services/lead.service.js';
import { getCurrentAccount } from '../services/request-context.service.js';
import { logDM } from '../services/dmlog.service.js';

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked = local.length <= 2 ? '*'.repeat(local.length) : local[0] + '***' + local[local.length - 1];
  return `${masked}@${domain}`;
}

export async function handleComment(comment: MetaCommentValue): Promise<void> {
  const { from, text, id: commentId } = comment;
  const userId = from.id;
  const username = from.username;

  logger.info({ userId, username, text, commentId }, 'Processing comment');

  // 1. Match against keyword rules
  const account = getCurrentAccount();
  const accountId = account?.id ?? 'legacy-default';
  let rule = matchKeyword(text, accountId);

  // If no keyword match, try DEFAULT fallback
  if (!rule) {
    const fallback = getKeywordRules(accountId).find((k) => k.keyword.toUpperCase() === 'DEFAULT');
    if (fallback) {
      rule = fallback;
      logger.info({ text, fallbackId: fallback.id }, 'No keyword match, using DEFAULT fallback');
    } else {
      logger.info({ text }, 'No keyword match found');
      return;
    }
  }

  logger.info({ ruleId: rule.id, keyword: rule.keyword, responseType: rule.response?.type, hasButtons: rule.response?.buttons?.length }, 'Keyword matched');

  // 2. Check rate limit
  if (isRateLimited(userId)) {
    logger.warn({ userId }, 'User rate limited (max DMs/hour)');
    return;
  }

  // 3. Check cooldown
  if (isOnCooldown(userId, rule.id, rule.cooldownMinutes)) {
    logger.info({ userId, ruleId: rule.id }, 'Skipped — user on cooldown');
    return;
  }

  // 4. Upsert lead in DB
  try {
    await upsertLead({
      igUserId: userId,
      igUsername: username,
      source: 'comment',
      keywordId: rule.id,
    });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to upsert lead (continuing with DM)');
  }

  // 5. Render template
  const vars = { username };
  const renderedText = renderTemplate(rule.response.text, vars);

  // 6. Send DM via comment_id recipient (required for comment-triggered messages)
  try {
    logger.info({ userId, commentId, responseType: rule.response.type }, 'Sending DM in response to comment');

    if (rule.response.type === 'button' && rule.response.buttons?.length) {
      await sendCommentReplyButtonDM(commentId, renderedText, rule.response.buttons);
    } else {
      await sendCommentReplyDM(commentId, renderedText);
    }

    // 7. Record trigger & log DM
    recordTrigger(userId, rule.id);
    logDM({
      igUserId: userId,
      direction: 'outbound',
      messageType: rule.response.type,
      keywordId: rule.id,
      content: renderedText,
    }).catch((err) => logger.error({ err }, 'Failed to log DM'));

    logger.info(
      { userId, username, ruleId: rule.id, commentId },
      'DM sent successfully',
    );
  } catch (err) {
    logger.error({ err, userId, ruleId: rule.id, errorMessage: err instanceof Error ? err.message : String(err) }, 'Failed to send DM');
  }

  // 8. Reply to the comment publicly
  try {
    await replyToComment(commentId, `@${username} ¡Te envié un mensaje! Revisa tu DM 💌`);
    logger.info({ commentId, username }, 'Public comment reply sent');
  } catch (err) {
    logger.warn({ err, commentId, errorMessage: err instanceof Error ? err.message : String(err) }, 'Could not reply to comment publicly');
  }
}

export async function sendFollowUp(userId: string, rule: ReturnType<typeof matchKeyword>): Promise<void> {
  if (!rule?.followUp) return;

  if (rule.followUp.type === 'button' && rule.followUp.buttons?.length) {
    await sendButtonDM(userId, rule.followUp.text, rule.followUp.buttons);
  } else {
    await sendTextDM(userId, rule.followUp.text);
  }

  logDM({
    igUserId: userId,
    direction: 'outbound',
    messageType: 'followup',
    keywordId: rule.id,
    content: rule.followUp.text,
  }).catch(() => {});
}
