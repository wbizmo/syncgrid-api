import type { FastifyReply, FastifyRequest } from 'fastify';

const publicRoutes = ['/', '/health'];

export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const url = request.url;

  if (publicRoutes.includes(url) || url.startsWith('/docs') || url.startsWith('/documentation')) {
    return;
  }

  const apiKey = request.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    return reply.code(401).send({
      success: false,
      message: 'Missing API key. Provide x-api-key header.',
    });
  }

  if (!apiKey.startsWith('sg_live_')) {
    return reply.code(401).send({
      success: false,
      message: 'Invalid API key format.',
    });
  }
}