import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma';

export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const start = Date.now();

  reply.raw.on('finish', () => {
    const responseTime = Date.now() - start;

    prisma.requestLog
      .create({
        data: {
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          responseTime,
          apiKey:
            typeof request.headers['x-api-key'] === 'string'
              ? request.headers['x-api-key']
              : null,
        },
      })
      .catch((error) => {
        request.log.error(error, 'Failed to save request log');
      });
  });
}