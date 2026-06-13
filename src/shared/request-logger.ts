import type { FastifyReply, FastifyRequest } from 'fastify';
import { requestLogs } from '../modules/logs/logs.store';

export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const start = Date.now();

  reply.raw.on('finish', () => {
    requestLogs.unshift({
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      responseTime: Date.now() - start,
      timestamp: new Date().toISOString(),
      apiKey:
        typeof request.headers['x-api-key'] === 'string'
          ? request.headers['x-api-key']
          : undefined,
    });

    if (requestLogs.length > 1000) {
      requestLogs.pop();
    }
  });
}