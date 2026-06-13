import type { FastifyInstance } from 'fastify';
import { simulateProviderExecution } from '../../shared/provider-failover';

const supportedPaymentProviders = ['paystack', 'stripe', 'flutterwave'];

export async function paymentRoutes(app: FastifyInstance) {
  app.post(
    '/payments/charges',
    {
      schema: {
        tags: ['Payments'],
        summary: 'Create payment charge',
        description:
          'Creates a payment charge using one consistent API. If the primary provider fails, SyncGrid can simulate failover to a backup payment provider.',
        body: {
          type: 'object',
          required: ['provider', 'amount', 'currency', 'email'],
          properties: {
            provider: {
              type: 'string',
              enum: supportedPaymentProviders,
              description: 'Primary payment provider. Example: paystack',
            },
            amount: {
              type: 'number',
              minimum: 1,
              description: 'Payment amount in the smallest currency unit.',
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
              description: 'Optional transaction reference.',
            },
            simulateFailure: {
              type: 'boolean',
              description:
                'When true, SyncGrid simulates primary provider failure and attempts failover.',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
              description: 'Optional custom metadata.',
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
        simulateFailure?: boolean;
        metadata?: Record<string, unknown>;
      };

      const reference =
        body.reference ||
        `SG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const execution = simulateProviderExecution({
        provider: body.provider,
        category: 'payments',
        shouldFail: body.simulateFailure,
      });

      return reply.code(201).send({
        success: true,
        message: execution.failedOver
          ? 'Payment charge created using fallback provider'
          : 'Payment charge created successfully',
        data: {
          requestedProvider: body.provider,
          usedProvider: execution.usedProvider,
          attemptedProviders: execution.attemptedProviders,
          failedOver: execution.failedOver,
          reference,
          amount: body.amount,
          currency: body.currency.toUpperCase(),
          status: 'pending',
          authorizationUrl: `https://checkout.syncgrid.test/${execution.usedProvider}/${reference}`,
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
          'Verifies a payment charge by reference using a unified verification endpoint.',
        params: {
          type: 'object',
          required: ['reference'],
          properties: {
            reference: {
              type: 'string',
              description: 'Transaction reference to verify.',
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
              description: 'Payment provider used for the original charge.',
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