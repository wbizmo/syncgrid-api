import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma';

const publicRoutes = ['/', '/health'];

export type AuthenticatedApiKey = {
  id: string;
  teamId: string | null;
};

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedApiKey?: AuthenticatedApiKey;
  }
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey, 'utf8').digest('hex');
}

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

  if (!apiKey.startsWith('sg_live_') || apiKey.length < 32 || apiKey.length > 128) {
    return reply.code(401).send({
      success: false,
      message: 'Invalid API key.',
    });
  }

  const digest = hashApiKey(apiKey);
  const record = await prisma.apiKey.findFirst({
    where: {
      status: 'active',
      key: { in: [digest, apiKey] },
    },
    select: {
      id: true,
      teamId: true,
      key: true,
    },
  });

  if (!record) {
    return reply.code(401).send({
      success: false,
      message: 'Invalid or revoked API key.',
    });
  }

  // Transparently migrate legacy plaintext keys the first time they are used.
  if (record.key === apiKey) {
    await prisma.apiKey.update({
      where: { id: record.id },
      data: { key: digest },
    });
  }

  request.authenticatedApiKey = {
    id: record.id,
    teamId: record.teamId,
  };
}
