import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma';

function apiKeyFingerprint(value: string): string {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 16)}`;
}

export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const start = Date.now();

  reply.raw.on('finish', () => {
    const responseTime = Date.now() - start;
    const apiKey = request.headers['x-api-key'];

    prisma.requestLog
      .create({
        data: {
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          responseTime,
          apiKey: typeof apiKey === 'string' ? apiKeyFingerprint(apiKey) : null,
        },
      })
      .catch((error) => {
        request.log.error(error, 'Failed to save request log');
      });
  });
}
