import type { MetaMessagingEvent } from '../types/meta.types.js';
import { logger } from '../utils/logger.js';
import { getLeadByIgUserId, setLeadStatus } from '../services/lead.service.js';
import { getKeywordRules } from '../services/keyword.service.js';
import { sendFollowUp, maskEmail } from './comment.handler.js';
import { sendTextDM, sendButtonDM } from '../services/instagram.service.js';
import { sendResourceEmail, sendWelcomeEmail } from '../services/email.service.js';
import { getEnv } from '../config/env.js';
import { getCurrentAccount } from '../services/request-context.service.js';
import { renderTemplate } from '../utils/templates.js';
import { isOnCooldown, isRateLimited, recordTrigger } from '../services/cooldown.service.js';
import { logDM } from '../services/dmlog.service.js';

export async function handlePostback(event: MetaMessagingEvent): Promise<void> {
  const senderId = event.sender.id;
  const payload = event.postback?.payload;
  const title = event.postback?.title;

  logger.info({ senderId, title, payload }, 'Received postback');

  if (!payload) return;

  // Check if payload matches a keyword (e.g., SI_PASADO, VER_MAS, SIGUIENTE)
  const account = getCurrentAccount();
  const accountId = account?.id ?? 'legacy-default';
  const allKeywords = getKeywordRules(accountId);
  const keywordRule = allKeywords.find((k) => k.keyword.toUpperCase() === payload.toUpperCase());

  logger.info({ payload, accountId, keywordCount: allKeywords.length, matched: !!keywordRule }, 'Postback keyword lookup');

  if (keywordRule) {
    // Payload matches a keyword — respond with that keyword
    await handleKeywordPayload(senderId, keywordRule);
    return;
  }

  // Handle special payloads
  if (payload.startsWith('start_email:')) {
    await handleStartEmail(senderId, payload.replace('start_email:', ''));
  } else if (payload.startsWith('confirm_email:')) {
    await handleConfirmEmail(senderId, payload.replace('confirm_email:', ''));
  } else if (payload.startsWith('change_email:')) {
    await handleChangeEmail(senderId, payload.replace('change_email:', ''));
  }
}

async function handleStartEmail(senderId: string, keywordId: string): Promise<void> {
  try {
    const lead = await getLeadByIgUserId(senderId);

    if (lead?.email) {
      // Returning user — confirm/change flow
      const masked = maskEmail(lead.email);
      await sendButtonDM(senderId, `Tengo tu email ${masked}. Te mando el link ahi?`, [
        { type: 'postback', title: 'Si, mandame ahi', payload: `confirm_email:${keywordId}` },
        { type: 'postback', title: 'No, cambiar email', payload: `change_email:${keywordId}` },
      ]);
      await setLeadStatus(senderId, 'email_confirming');
    } else {
      // New user — excitement + ask for email
      await sendTextDM(
        senderId,
        'GENIAL! No puedo esperar a que empieces a explorar todo lo que Golem tiene para ti.',
      );
      await sendTextDM(
        senderId,
        'Para que pueda enviarte el link, cual es tu direccion de correo electronico?',
      );
      await setLeadStatus(senderId, 'email_pending');
    }

    logger.info({ senderId, keywordId }, 'Start email flow initiated');
  } catch (err) {
    logger.error({ err, senderId }, 'Error handling start email postback');
  }
}

async function handleConfirmEmail(senderId: string, keywordId: string): Promise<void> {
  try {
    const lead = await getLeadByIgUserId(senderId);
    if (!lead?.email) {
      logger.warn({ senderId }, 'Postback confirm but no email on file');
      return;
    }

    const rule = getKeywordRules().find((r) => r.id === keywordId) ?? null;

    // Send followUp DM with the resource
    await sendFollowUp(senderId, rule);

    // Send resource + welcome email
    const env = getEnv();
    if (env.RESEND_API_KEY) {
      const username = lead.ig_username ?? 'amigo';
      try {
        if (rule?.followUp?.buttons?.[0]?.url) {
          await sendResourceEmail(lead.email, username, rule.followUp.buttons[0].title, rule.followUp.buttons[0].url);
        }
        await sendWelcomeEmail(lead.email, username);
      } catch (err) {
        logger.error({ err }, 'Failed to send emails after confirm');
      }
    }

    await setLeadStatus(senderId, 'email_sent');
    logger.info({ senderId, keywordId, email: lead.email }, 'Email confirmed, followUp sent');
  } catch (err) {
    logger.error({ err, senderId }, 'Error handling confirm postback');
  }
}

async function handleChangeEmail(senderId: string, keywordId: string): Promise<void> {
  try {
    await sendTextDM(senderId, 'Ok! Mandame tu mejor email y te lo actualizo.');
    await setLeadStatus(senderId, 'email_pending');
    logger.info({ senderId, keywordId }, 'User wants to change email');
  } catch (err) {
    logger.error({ err, senderId }, 'Error handling change email postback');
  }
}

async function handleKeywordPayload(
  senderId: string,
  rule: ReturnType<typeof getKeywordRules>[number],
): Promise<void> {
  if (!rule) return;

  try {
    // Rate limit & cooldown checks
    if (isRateLimited(senderId)) {
      logger.warn({ senderId }, 'User rate limited (max DMs/hour)');
      return;
    }
    if (isOnCooldown(senderId, rule.id, rule.cooldownMinutes)) {
      logger.info({ senderId, ruleId: rule.id }, 'Skipped — user on cooldown');
      return;
    }

    // Get lead for username
    const lead = await getLeadByIgUserId(senderId);
    let username = lead?.ig_username ?? 'amigo';

    // Render template
    const renderedText = renderTemplate(rule.response.text, { username });

    // Send response
    if (rule.response.type === 'button' && rule.response.buttons?.length) {
      await sendButtonDM(senderId, renderedText, rule.response.buttons);
    } else {
      await sendTextDM(senderId, renderedText);
    }

    // Record trigger & log
    recordTrigger(senderId, rule.id);
    logDM({
      igUserId: senderId,
      direction: 'outbound',
      messageType: rule.response.type,
      keywordId: rule.id,
      content: renderedText,
    }).catch((err) => logger.error({ err }, 'Failed to log DM'));

    logger.info({ senderId, ruleId: rule.id }, 'Keyword payload response sent');
  } catch (err) {
    logger.error({ err, senderId, ruleId: rule.id }, 'Error handling keyword payload');
  }
}
