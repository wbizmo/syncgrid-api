import { Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL;

export function startWorkers() {
  if (!redisUrl) {
    console.log('Redis not configured. BullMQ workers disabled.');
    return;
  }

  new Worker('webhook-retries', async (job) => {
    console.log('Processing webhook replay job:', {
      id: job.id,
      webhookEventId: job.data.webhookEventId,
      provider: job.data.provider,
    });
  }, { connection: { url: redisUrl } });

  new Worker('integration-jobs', async (job) => {
    console.log('Processing integration job:', {
      id: job.id,
      type: job.data.type,
      provider: job.data.provider,
    });
  }, { connection: { url: redisUrl } });

  console.log('BullMQ workers started.');
}
