import type { InstagramSendMessageResponse, InstagramUserProfile } from '../types/instagram.types.js';
import type { MessageButton } from '../types/keyword.types.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { getCurrentAccount } from './request-context.service.js';

const API_BASE = 'https://graph.instagram.com/v21.0';

function requireAccount() {
  const account = getCurrentAccount();
  if (!account) {
    throw new Error('No account context set for Instagram request');
  }
  return account;
}

export async function sendTextDM(
  recipientId: string,
  text: string,
): Promise<InstagramSendMessageResponse> {
  const account = requireAccount();

  logger.debug({ recipientId, accountId: account.id }, 'Sending text DM');

  return withRetry<InstagramSendMessageResponse>(() =>
    fetch(`${API_BASE}/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    }),
  );
}

export async function sendButtonDM(
  recipientId: string,
  text: string,
  buttons: MessageButton[],
): Promise<InstagramSendMessageResponse> {
  const account = requireAccount();

  logger.debug({ recipientId, buttonCount: buttons.length, accountId: account.id }, 'Sending button DM');

  return withRetry<InstagramSendMessageResponse>(() =>
    fetch(`${API_BASE}/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: text,
                  buttons: buttons.map((b) => ({
                    type: b.type,
                    title: b.title,
                    url: b.url,
                    payload: b.payload,
                  })),
                },
              ],
            },
          },
        },
      }),
    }),
  );
}

export async function sendPrivateReply(
  commentId: string,
  text: string,
): Promise<InstagramSendMessageResponse> {
  const account = requireAccount();

  logger.info({ commentId, accountId: account.id }, 'Sending private reply to comment');

  return withRetry<InstagramSendMessageResponse>(() =>
    fetch(`${API_BASE}/${commentId}/private_replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({
        message: text,
      }),
    }),
  );
}

export async function getMediaOwner(mediaId: string): Promise<{ id: string; username: string } | null> {
  const account = requireAccount();

  try {
    const response = await fetch(
      `${API_BASE}/${mediaId}?fields=owner{id,username}`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      },
    );
    if (!response.ok) {
      logger.warn({ mediaId, status: response.status, accountId: account.id }, 'Failed to get media owner');
      return null;
    }
    const data = (await response.json()) as { owner?: { id: string; username: string } };
    return data.owner ?? null;
  } catch {
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<InstagramUserProfile> {
  const account = requireAccount();

  return withRetry<InstagramUserProfile>(() =>
    fetch(`${API_BASE}/${userId}?fields=id,username,name`, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
    }),
  );
}
