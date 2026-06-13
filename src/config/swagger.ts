import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'SyncGrid API',
        description:
          'A unified integration gateway API for payments, email, webhooks, provider routing, API keys, request logs, and third-party service abstraction.',
        version: '1.0.0',
      },
      tags: [
        { name: 'System', description: 'System health and API status' },
        { name: 'Providers', description: 'Provider configuration and routing' },
        { name: 'Payments', description: 'Unified payment endpoints' },
        { name: 'Email', description: 'Unified email delivery endpoints' },
        { name: 'Webhooks', description: 'Webhook receiving, logging, and replay' },
        { name: 'Logs', description: 'Request and integration logs' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}