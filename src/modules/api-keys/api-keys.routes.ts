import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';
import { hashApiKey } from '../../shared/api-key-auth';

function visibleApiKey<T extends { key: string }>(record: T) {
  const { key: _secret, ...safe } = record;
  return safe;
}

export async function apiKeyRoutes(app: FastifyInstance) {
  app.post(
    '/api-keys',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Create API key',
        description: 'Creates a new API key. The raw key is returned once and is never stored in plaintext.',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              description: 'Human-readable API key name.',
            },
            teamId: {
              type: 'string',
              description: 'Team ID that owns this API key. Team-scoped callers cannot create keys for another team.',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        teamId?: string;
      };
      const callerTeamId = request.authenticatedApiKey?.teamId ?? null;
      const teamId = callerTeamId ?? body.teamId ?? null;

      if (callerTeamId && body.teamId && body.teamId !== callerTeamId) {
        return reply.code(403).send({
          success: false,
          message: 'API keys can only be created for the authenticated team.',
        });
      }

      if (teamId) {
        const teamExists = await prisma.team.findUnique({
          where: { id: teamId },
          select: { id: true },
        });
        if (!teamExists) {
          return reply.code(404).send({ success: false, message: 'Team not found' });
        }
      }

      const rawKey = `sg_live_${randomBytes(32).toString('base64url')}`;
      const apiKey = await prisma.apiKey.create({
        data: {
          name: body.name,
          teamId,
          key: hashApiKey(rawKey),
          status: 'active',
        },
      });

      return reply.code(201).send({
        success: true,
        data: {
          ...visibleApiKey(apiKey),
          key: rawKey,
        },
      });
    },
  );

  app.get('/api-keys', async (request) => {
    const callerTeamId = request.authenticatedApiKey?.teamId ?? null;
    const apiKeys = await prisma.apiKey.findMany({
      where: callerTeamId ? { teamId: callerTeamId } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      count: apiKeys.length,
      data: apiKeys.map(visibleApiKey),
    };
  });

  app.get('/api-keys/:id', async (request, reply) => {
    const params = request.params as {
      id: string;
    };
    const callerTeamId = request.authenticatedApiKey?.teamId ?? null;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        ...(callerTeamId ? { teamId: callerTeamId } : {}),
      },
    });

    if (!apiKey) {
      return reply.code(404).send({
        success: false,
        message: 'API key not found',
      });
    }

    return {
      success: true,
      data: visibleApiKey(apiKey),
    };
  });

  app.delete('/api-keys/:id', async (request, reply) => {
    const params = request.params as {
      id: string;
    };
    const callerTeamId = request.authenticatedApiKey?.teamId ?? null;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        ...(callerTeamId ? { teamId: callerTeamId } : {}),
      },
    });

    if (!apiKey) {
      return reply.code(404).send({
        success: false,
        message: 'API key not found',
      });
    }

    const revokedApiKey = await prisma.apiKey.update({
      where: {
        id: params.id,
      },
      data: {
        status: 'revoked',
      },
    });

    return {
      success: true,
      message: 'API key revoked successfully',
      data: visibleApiKey(revokedApiKey),
    };
  });
}
