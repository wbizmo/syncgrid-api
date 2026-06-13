import type { FastifyInstance } from 'fastify';
import { getCache, setCache } from '../../shared/redis';

const providers = [
  {
    id: 'paystack',
    name: 'Paystack',
    category: 'payments',
    status: 'active',
    supportedActions: ['create_payment', 'verify_payment'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    status: 'inactive',
    supportedActions: ['create_payment', 'verify_payment'],
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    category: 'payments',
    status: 'inactive',
    supportedActions: ['create_payment', 'verify_payment'],
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'email',
    status: 'active',
    supportedActions: ['send_email'],
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    category: 'email',
    status: 'inactive',
    supportedActions: ['send_email'],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'email',
    status: 'inactive',
    supportedActions: ['send_email'],
  },
];

export async function providerRoutes(app: FastifyInstance) {
  app.get(
    '/providers',
    {
      schema: {
        tags: ['Providers'],
        summary: 'List integration providers',
        description:
          'Returns all third-party providers supported by SyncGrid. Supports filtering by provider category and status. Response is cache-ready through Redis.',
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['payments', 'email'],
              description: 'Filter providers by category. Example: payments',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Filter providers by status. Example: active',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as {
        category?: string;
        status?: string;
      };

      const cacheKey = `providers:${query.category || 'all'}:${query.status || 'all'}`;
      const cached = await getCache<{
        success: boolean;
        count: number;
        data: typeof providers;
        cached: boolean;
      }>(cacheKey);

      if (cached) {
        reply.header('x-cache', 'HIT');

        return {
          ...cached,
          cached: true,
        };
      }

      let result = providers;

      if (query.category) {
        result = result.filter((provider) => provider.category === query.category);
      }

      if (query.status) {
        result = result.filter((provider) => provider.status === query.status);
      }

      const response = {
        success: true,
        count: result.length,
        data: result,
        cached: false,
      };

      await setCache(cacheKey, response, 60);

      reply.header('x-cache', 'MISS');

      return response;
    },
  );

  app.get(
    '/providers/:providerId',
    {
      schema: {
        tags: ['Providers'],
        summary: 'Get provider details',
        description: 'Returns full details for a specific provider using its provider ID.',
        params: {
          type: 'object',
          required: ['providerId'],
          properties: {
            providerId: {
              type: 'string',
              description: 'Unique provider identifier. Example: paystack',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as {
        providerId: string;
      };

      const cacheKey = `providers:details:${params.providerId}`;
      const cached = await getCache<{
        success: boolean;
        data: (typeof providers)[number];
        cached: boolean;
      }>(cacheKey);

      if (cached) {
        reply.header('x-cache', 'HIT');

        return {
          ...cached,
          cached: true,
        };
      }

      const provider = providers.find((item) => item.id === params.providerId);

      if (!provider) {
        return reply.code(404).send({
          success: false,
          message: 'Provider not found',
        });
      }

      const response = {
        success: true,
        data: provider,
        cached: false,
      };

      await setCache(cacheKey, response, 60);

      reply.header('x-cache', 'MISS');

      return response;
    },
  );
}