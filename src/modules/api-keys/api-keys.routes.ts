import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';
import type { AuthenticatedRequest } from '../../shared/api-key-auth';

function hashApiKey(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function publicApiKey(record: { id: string; teamId: string | null; name: string; key: string; status: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: record.id,
    teamId: record.teamId,
    name: record.name,
    keyFingerprint: record.key.slice(0, 12),
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function apiKeyRoutes(app: FastifyInstance) {
  app.post(
    '/api-keys',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Create API key',
        description: 'Creates a cryptographically random API key. The plaintext key is returned once and only its SHA-256 hash is stored.',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 120 },
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { name: string; teamId?: string };
      const auth = (request as AuthenticatedRequest).auth;
      if (!auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });

      const targetTeamId = body.teamId ?? auth.teamId;
      if (!targetTeamId) {
        return reply.code(400).send({ success: false, message: 'A team ID is required for team-scoped API keys.' });
      }
      if (auth.teamId && auth.teamId !== targetTeamId) {
        return reply.code(403).send({ success: false, message: 'Cannot create API keys for another team.' });
      }
      const team = await prisma.team.findUnique({ where: { id: targetTeamId }, select: { id: true } });
      if (!team) return reply.code(404).send({ success: false, message: 'Team not found' });

      const rawKey = `sg_live_${randomBytes(32).toString('base64url')}`;
      const apiKey = await prisma.apiKey.create({
        data: {
          name: body.name,
          teamId: targetTeamId,
          key: hashApiKey(rawKey),
          status: 'active',
        },
      });

      return reply.code(201).send({
        success: true,
        data: { ...publicApiKey(apiKey), key: rawKey },
        warning: 'Copy this API key now. It will not be shown again.',
      });
    },
  );

  app.get('/api-keys', async (request: AuthenticatedRequest, reply) => {
    if (!request.auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    const where = request.auth.teamId ? { teamId: request.auth.teamId } : {};
    const apiKeys = await prisma.apiKey.findMany({ where, orderBy: { createdAt: 'desc' } });
    return { success: true, count: apiKeys.length, data: apiKeys.map(publicApiKey) };
  });

  app.get('/api-keys/:id', async (request: AuthenticatedRequest, reply) => {
    const params = request.params as { id: string };
    if (!request.auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: params.id, ...(request.auth.teamId ? { teamId: request.auth.teamId } : {}) },
    });
    if (!apiKey) return reply.code(404).send({ success: false, message: 'API key not found' });
    return { success: true, data: publicApiKey(apiKey) };
  });

  app.delete('/api-keys/:id', async (request: AuthenticatedRequest, reply) => {
    const params = request.params as { id: string };
    if (!request.auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: params.id, ...(request.auth.teamId ? { teamId: request.auth.teamId } : {}) },
    });
    if (!apiKey) return reply.code(404).send({ success: false, message: 'API key not found' });
    const revokedApiKey = await prisma.apiKey.update({ where: { id: apiKey.id }, data: { status: 'revoked' } });
    return { success: true, message: 'API key revoked successfully', data: publicApiKey(revokedApiKey) };
  });
}