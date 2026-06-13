import { Worker } from 'bullmq';

const redisUrl = process.env.REDIS_URL;

export function startWorkers() {
  if (!redisUrl) {
    console.log('Redis not configured. BullMQ workers disabled.');
    return;
  }

  new Worker(
    'webhook-retries',
    async (job) => {
      console.log('Processing webhook replay job:', job.data);
    },
    {
      connection: {
        url: redisUrl,
      },
    },
  );

  new Worker(
    'integration-jobs',
    async (job) => {
      console.log('Processing integration job:', job.data);
    },
    {
      connection: {
        url: redisUrl,
      },
    },
  );

  console.log('BullMQ workers started.');
}