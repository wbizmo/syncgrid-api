import type { FastifyReply, FastifyRequest } from 'fastify';
import { redis } from './redis';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_FALLBACK_KEYS = 10_000;

const fallbackStore = new Map<string, { count: number; resetAt: number }>();

const redisRateLimitScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

function setHeaders(reply: FastifyReply, count: number, resetAt: number) {
  reply.header('x-ratelimit-limit', MAX_REQUESTS);
  reply.header('x-ratelimit-remaining', Math.max(0, MAX_REQUESTS - count));
  reply.header('x-ratelimit-reset', Math.ceil(resetAt / 1000));
}

function consumeFallback(key: string, now: number) {
  const current = fallbackStore.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + WINDOW_MS }
      : { count: current.count + 1, resetAt: current.resetAt };

  fallbackStore.delete(key);
  fallbackStore.set(key, entry);

  while (fallbackStore.size > MAX_FALLBACK_KEYS) {
    const oldest = fallbackStore.keys().next().value as string | undefined;
    if (!oldest) break;
    fallbackStore.delete(oldest);
  }

  return entry;
}

async function consumeRedis(key: string, now: number) {
  if (!redis) return null;

  try {
    const [count, ttl] = (await redis.eval(
      redisRateLimitScript,
      1,
      `rate-limit:${key}`,
      WINDOW_MS,
    )) as [number, number];

    return { count, resetAt: now + Math.max(ttl, 0) };
  } catch {
    return null;
  }
}

export async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
  const apiKeyId = request.authenticatedApiKey?.id;
  if (!apiKeyId) return;

  const now = Date.now();
  const current =
    (await consumeRedis(apiKeyId, now)) ?? consumeFallback(apiKeyId, now);

  setHeaders(reply, current.count, current.resetAt);

  if (current.count > MAX_REQUESTS) {
    return reply.code(429).send({
      success: false,
      message: 'Rate limit exceeded. Try again later.',
    });
  }
}
