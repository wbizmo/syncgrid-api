import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL;

export const webhookQueue = redisUrl
  ? new Queue('webhook-retries', {
      connection: {
        url: redisUrl,
      },
    })
  : null;

export const integrationQueue = redisUrl
  ? new Queue('integration-jobs', {
      connection: {
        url: redisUrl,
      },
    })
  : null;

export async function addWebhookReplayJob(data: {
  webhookEventId: string;
  provider: string;
}) {
  if (!webhookQueue) return null;

  return webhookQueue.add('webhook.replay', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}

export async function addIntegrationJob(data: {
  type: 'payment' | 'email';
  provider: string;
  payload: Record<string, unknown>;
}) {
  if (!integrationQueue) return null;

  return integrationQueue.add('integration.process', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}