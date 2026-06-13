import type { FastifyInstance } from 'fastify';

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
];

export async function providerRoutes(app: FastifyInstance) {
  app.get(
    '/providers',
    {
      schema: {
        tags: ['Providers'],
        summary: 'List integration providers',
        description:
          'Returns all third-party providers supported by SyncGrid. Supports filtering by provider category and status.',
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
        response: {
          200: {
            description: 'Provider list response',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              count: { type: 'number', description: 'Number of returned providers.' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Provider ID. Example: paystack' },
                    name: { type: 'string', description: 'Provider name. Example: Paystack' },
                    category: {
                      type: 'string',
                      description: 'Provider category. Example: payments',
                    },
                    status: {
                      type: 'string',
                      description: 'Provider status. Example: active',
                    },
                    supportedActions: {
                      type: 'array',
                      description:
                        'Actions supported by the provider. Example: create_payment, verify_payment',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const query = request.query as {
        category?: string;
        status?: string;
      };

      let result = providers;

      if (query.category) {
        result = result.filter((provider) => provider.category === query.category);
      }

      if (query.status) {
        result = result.filter((provider) => provider.status === query.status);
      }

      return {
        success: true,
        count: result.length,
        data: result,
      };
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
        response: {
          200: {
            description: 'Provider details response',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Provider ID.' },
                  name: { type: 'string', description: 'Provider name.' },
                  category: { type: 'string', description: 'Provider category.' },
                  status: { type: 'string', description: 'Provider status.' },
                  supportedActions: {
                    type: 'array',
                    description: 'Actions supported by the provider.',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Provider not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              message: { type: 'string', description: 'Error message.' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as {
        providerId: string;
      };

      const provider = providers.find((item) => item.id === params.providerId);

      if (!provider) {
        return reply.code(404).send({
          success: false,
          message: 'Provider not found',
        });
      }

      return {
        success: true,
        data: provider,
      };
    },
  );
}