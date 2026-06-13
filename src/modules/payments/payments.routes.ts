import type { FastifyInstance } from 'fastify';

const supportedPaymentProviders = ['paystack', 'stripe', 'flutterwave'];

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    '/payments/charges',
    {
      schema: {
        tags: ['Payments'],
        summary: 'Create payment charge',
        description:
          'Creates a payment charge using a selected provider. SyncGrid exposes one consistent API while routing the request to the chosen payment provider.',
        body: {
          type: 'object',
          required: ['provider', 'amount', 'currency', 'email'],
          properties: {
            provider: {
              type: 'string',
              enum: supportedPaymentProviders,
              description: 'Payment provider to route the charge through. Example: paystack',
            },
            amount: {
              type: 'number',
              minimum: 1,
              description: 'Payment amount in the smallest currency unit. Example: 500000 for ₦5,000.',
            },
            currency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              description: 'ISO currency code. Example: NGN, USD, GHS.',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Customer email address.',
            },
            reference: {
              type: 'string',
              description:
                'Optional transaction reference. If omitted, SyncGrid generates one.',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
              description:
                'Optional custom metadata attached to the payment request.',
            },
          },
        },
        response: {
          201: {
            description: 'Payment charge created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              message: { type: 'string', description: 'Result message.' },
              data: {
                type: 'object',
                properties: {
                  provider: { type: 'string', description: 'Selected payment provider.' },
                  reference: { type: 'string', description: 'Transaction reference.' },
                  amount: { type: 'number', description: 'Payment amount.' },
                  currency: { type: 'string', description: 'Payment currency.' },
                  status: { type: 'string', description: 'Payment status.' },
                  authorizationUrl: {
                    type: 'string',
                    description: 'Hosted checkout URL returned by provider.',
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid payment request',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              message: { type: 'string', description: 'Validation or provider error.' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        provider: string;
        amount: number;
        currency: string;
        email: string;
        reference?: string;
        metadata?: Record<string, unknown>;
      };

      const reference =
        body.reference || `SG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      return reply.code(201).send({
        success: true,
        message: 'Payment charge created successfully',
        data: {
          provider: body.provider,
          reference,
          amount: body.amount,
          currency: body.currency.toUpperCase(),
          status: 'pending',
          authorizationUrl: `https://checkout.syncgrid.test/${body.provider}/${reference}`,
        },
      });
    },
  );

  app.get(
    '/payments/charges/:reference',
    {
      schema: {
        tags: ['Payments'],
        summary: 'Verify payment charge',
        description:
          'Verifies a payment charge by reference. This demonstrates a unified verification endpoint across different payment providers.',
        params: {
          type: 'object',
          required: ['reference'],
          properties: {
            reference: {
              type: 'string',
              description: 'Transaction reference to verify. Example: SG-1234567890-demo12',
            },
          },
        },
        querystring: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: {
              type: 'string',
              enum: supportedPaymentProviders,
              description: 'Payment provider used for the original charge. Example: paystack',
            },
          },
        },
        response: {
          200: {
            description: 'Payment verification response',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              data: {
                type: 'object',
                properties: {
                  provider: { type: 'string', description: 'Payment provider.' },
                  reference: { type: 'string', description: 'Transaction reference.' },
                  status: { type: 'string', description: 'Payment status.' },
                  verifiedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Verification timestamp.',
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const params = request.params as { reference: string };
      const query = request.query as { provider: string };

      return {
        success: true,
        data: {
          provider: query.provider,
          reference: params.reference,
          status: 'success',
          verifiedAt: new Date().toISOString(),
        },
      };
    },
  );
}