import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerSwagger } from './config/swagger';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(helmet);

  await registerSwagger(app);

  app.get(
    '/',
    {
      schema: {
        tags: ['System'],
        summary: 'API status',
        response: {
          200: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              status: { type: 'string' },
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
        summary: 'Health check',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
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

  return app;
}