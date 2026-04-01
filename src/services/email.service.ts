import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resend } from 'resend';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getCurrentAccount } from './request-context.service.js';

const resendClients = new Map<string, Resend>();
const templateCache = new Map<string, string>();

function accountSettings() {
  const env = getEnv();
  const account = getCurrentAccount();
  return {
    accountId: account?.id ?? 'legacy-default',
    resendApiKey: account?.resendApiKey ?? env.RESEND_API_KEY,
    emailFrom: account?.emailFrom ?? env.EMAIL_FROM,
    welcomeEmailTemplate: account?.welcomeEmailTemplate ?? env.WELCOME_EMAIL_TEMPLATE,
  };
}

function getResend(): Resend {
  const settings = accountSettings();
  if (!settings.resendApiKey) throw new Error('RESEND_API_KEY not configured');
  if (!resendClients.has(settings.accountId)) {
    resendClients.set(settings.accountId, new Resend(settings.resendApiKey));
  }
  return resendClients.get(settings.accountId)!;
}

function getTemplate(): string {
  const settings = accountSettings();
  const filename = settings.welcomeEmailTemplate || 'bienvenido.html';
  const cacheKey = `${settings.accountId}:${filename}`;
  if (!templateCache.has(cacheKey)) {
    const templatePath = resolve(process.cwd(), 'email-templates', filename);
    templateCache.set(cacheKey, readFileSync(templatePath, 'utf-8'));
  }
  return templateCache.get(cacheKey)!;
}

export async function sendWelcomeEmail(to: string, fullName: string): Promise<void> {
  const client = getResend();
  const settings = accountSettings();
  const html = getTemplate().replace('{{1.record.full_name}}', fullName);

  const { error } = await client.emails.send({
    from: settings.emailFrom,
    to,
    subject: '¡Bienvenido!',
    html,
  });

  if (error) {
    logger.error({ error, to }, 'Failed to send welcome email');
    throw new Error(`Resend error: ${error.message}`);
  }

  logger.info({ to, fullName }, 'Welcome email sent');
}

export async function sendResourceEmail(
  to: string,
  fullName: string,
  resourceTitle: string,
  resourceUrl: string,
): Promise<void> {
  const client = getResend();
  const settings = accountSettings();

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><title>Tu link esta listo</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 20px; margin: 0; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background: #111111; border-radius: 12px; border: 1px solid #333333; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #4CBBA7, #439B8A); color: #111111; padding: 40px 30px; text-align: center;">
      <h1 style="font-size: 28px; margin: 0 0 10px 0;">Hola ${fullName}!</h1>
      <p style="font-size: 18px; margin: 0;">Aca tenes lo que pediste</p>
    </div>
    <div style="padding: 40px 30px; text-align: center;">
      <p style="font-size: 16px; color: #a1a1aa; margin-bottom: 30px;">Te guardamos el link para que lo tengas siempre a mano.</p>
      <a href="${resourceUrl}" style="display: inline-block; background: linear-gradient(135deg, #4CBBA7, #439B8A); color: #000000; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; box-shadow: 0 4px 20px rgba(76, 187, 167, 0.4);">${resourceTitle}</a>
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Cualquier duda me escribis por Instagram.</p>
    </div>
  </div>
</body>
</html>`;

  const { error } = await client.emails.send({
    from: settings.emailFrom,
    to,
    subject: `Tu link: ${resourceTitle}`,
    html,
  });

  if (error) {
    logger.error({ error, to }, 'Failed to send resource email');
    throw new Error(`Resend error: ${error.message}`);
  }

  logger.info({ to, fullName, resourceTitle }, 'Resource email sent');
}
