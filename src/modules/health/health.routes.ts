import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      schema: {
        tags: ['System'],
        summary: 'Get API status',
        description: 'Returns basic information about the SyncGrid API service.',
        response: {
          200: {
            description: 'API status response',
            type: 'object',
            properties: {
              name: { type: 'string', example: 'SyncGrid API' },
              version: { type: 'string', example: '1.0.0' },
              status: { type: 'string', example: 'running' },
            },
          },
        },
      },
    },
    async () => {
      return {
        name: 'SyncGrid API',
        version: '1.0.0',
        status: 'running',
      };
    },
  );

  app.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Check API health',
        description: 'Returns the current health status of the API.',
        response: {
          200: {
            description: 'Health check response',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'API is healthy' },
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2026-06-13T19:25:42.310Z',
              },
            },
          },
        },
      },
    },
    async () => {
      return {
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
      };
    },
  );
}