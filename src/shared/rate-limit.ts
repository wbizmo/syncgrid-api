import type { FastifyReply, FastifyRequest } from 'fastify';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

const rateLimitStore = new Map<
  string,
  {
    count: number;
    resetAt: number;
  }
>();

export async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
  const publicRoutes = ['/', '/health'];

  if (
    publicRoutes.includes(request.url) ||
    request.url.startsWith('/docs') ||
    request.url.startsWith('/documentation')
  ) {
    return;
  }

  const apiKey =
    typeof request.headers['x-api-key'] === 'string'
      ? request.headers['x-api-key']
      : 'anonymous';

  const now = Date.now();
  const current = rateLimitStore.get(apiKey);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(apiKey, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    reply.header('x-ratelimit-limit', MAX_REQUESTS);
    reply.header('x-ratelimit-remaining', MAX_REQUESTS - 1);
    reply.header('x-ratelimit-reset', Math.ceil((now + WINDOW_MS) / 1000));

    return;
  }

  if (current.count >= MAX_REQUESTS) {
    reply.header('x-ratelimit-limit', MAX_REQUESTS);
    reply.header('x-ratelimit-remaining', 0);
    reply.header('x-ratelimit-reset', Math.ceil(current.resetAt / 1000));

    return reply.code(429).send({
      success: false,
      message: 'Rate limit exceeded. Try again later.',
    });
  }

  current.count += 1;

  reply.header('x-ratelimit-limit', MAX_REQUESTS);
  reply.header('x-ratelimit-remaining', MAX_REQUESTS - current.count);
  reply.header('x-ratelimit-reset', Math.ceil(current.resetAt / 1000));
}