import type { FastifyInstance } from 'fastify';

const apiKeys: Array<{
  id: string;
  name: string;
  key: string;
  status: 'active' | 'revoked';
  createdAt: string;
}> = [];

export async function apiKeyRoutes(app: FastifyInstance) {
  app.post(
    '/api-keys',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Create API key',
        description:
          'Creates a new API key for accessing protected SyncGrid endpoints.',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              description: 'Human-readable API key name.',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  key: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
      };

      const apiKey = {
        id: `KEY-${Date.now()}`,
        name: body.name,
        key: `sg_live_${Math.random().toString(36).slice(2)}${Date.now()}`,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      };

      apiKeys.unshift(apiKey);

      return reply.code(201).send({
        success: true,
        data: apiKey,
      });
    },
  );

  app.get(
    '/api-keys',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'List API keys',
        description: 'Returns all API keys.',
      },
    },
    async () => {
      return {
        success: true,
        count: apiKeys.length,
        data: apiKeys,
      };
    },
  );

  app.get(
    '/api-keys/:id',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Get API key',
        description: 'Returns a specific API key.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as {
        id: string;
      };

      const apiKey = apiKeys.find((item) => item.id === params.id);

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
    },
  );

  app.delete(
    '/api-keys/:id',
    {
      schema: {
        tags: ['API Keys'],
        summary: 'Revoke API key',
        description: 'Revokes an existing API key.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as {
        id: string;
      };

      const apiKey = apiKeys.find((item) => item.id === params.id);

      if (!apiKey) {
        return reply.code(404).send({
          success: false,
          message: 'API key not found',
        });
      }

      apiKey.status = 'revoked';

      return {
        success: true,
        message: 'API key revoked successfully',
        data: apiKey,
      };
    },
  );
}