import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma';

const publicRoutes = ['/', '/health'];

export type AuthenticatedRequest = FastifyRequest & {
  auth?: {
    apiKeyId: string;
    teamId: string | null;
  };
};

function hashApiKey(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const url = request.url.split('?')[0];

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

  if (!/^sg_live_[A-Za-z0-9_-]{40,}$/.test(apiKey)) {
    return reply.code(401).send({
      success: false,
      message: 'Invalid API key.',
    });
  }

  const presentedHash = hashApiKey(apiKey);
  const record = await prisma.apiKey.findUnique({
    where: { key: presentedHash },
    select: { id: true, teamId: true, status: true, key: true },
  });

  if (!record || record.status !== 'active') {
    return reply.code(401).send({ success: false, message: 'Invalid API key.' });
  }

  const expected = Buffer.from(record.key, 'hex');
  const actual = Buffer.from(presentedHash, 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return reply.code(401).send({ success: false, message: 'Invalid API key.' });
  }

  (request as AuthenticatedRequest).auth = {
    apiKeyId: record.id,
    teamId: record.teamId,
  };
}