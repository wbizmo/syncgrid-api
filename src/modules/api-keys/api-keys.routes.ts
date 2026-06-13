import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';

export async function apiKeyRoutes(app: FastifyInstance) {
  app.post(
    '/api-keys',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Create API key',
        description: 'Creates a new API key for accessing protected SyncGrid endpoints.',
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
              description: 'Optional team ID that owns this API key.',
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

      const apiKey = await prisma.apiKey.create({
        data: {
          name: body.name,
          teamId: body.teamId,
          key: `sg_live_${Math.random().toString(36).slice(2)}${Date.now()}`,
          status: 'active',
        },
      });

      return reply.code(201).send({
        success: true,
        data: apiKey,
      });
    },
  );

  app.get('/api-keys', async () => {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      count: apiKeys.length,
      data: apiKeys,
    };
  });

  app.get('/api-keys/:id', async (request, reply) => {
    const params = request.params as {
      id: string;
    };

    const apiKey = await prisma.apiKey.findUnique({
      where: {
        id: params.id,
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
      data: apiKey,
    };
  });

  app.delete('/api-keys/:id', async (request, reply) => {
    const params = request.params as {
      id: string;
    };

    const apiKey = await prisma.apiKey.findUnique({
      where: {
        id: params.id,
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
      data: revokedApiKey,
    };
  });
}