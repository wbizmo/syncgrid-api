import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { simulateProviderExecution } from '../../shared/provider-failover';

const supportedPaymentProviders = ['paystack', 'stripe', 'flutterwave'];

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/payments/charges', {
    schema: {
      tags: ['Payments'], summary: 'Create payment charge',
      description: 'Creates a payment charge using one consistent API. If the primary provider fails, SyncGrid can simulate failover to a backup payment provider.',
      body: { type: 'object', required: ['provider', 'amount', 'currency', 'email'], properties: {
        provider: { type: 'string', enum: supportedPaymentProviders }, amount: { type: 'number', minimum: 1 },
        currency: { type: 'string', minLength: 3, maxLength: 3 }, email: { type: 'string', format: 'email' },
        reference: { type: 'string' }, simulateFailure: { type: 'boolean' }, metadata: { type: 'object', additionalProperties: true },
      } },
    },
  }, async (request, reply) => {
    const body = request.body as { provider: string; amount: number; currency: string; email: string; reference?: string; simulateFailure?: boolean; metadata?: Record<string, unknown> };
    const reference = body.reference || `SG-${randomUUID()}`;
    const execution = simulateProviderExecution({ provider: body.provider, category: 'payments', shouldFail: body.simulateFailure ?? false });
    return reply.code(201).send({
      success: true,
      message: execution.failedOver ? 'Payment charge created using fallback provider' : 'Payment charge created successfully',
      data: { requestedProvider: body.provider, usedProvider: execution.usedProvider, attemptedProviders: execution.attemptedProviders, failedOver: execution.failedOver, reference, amount: body.amount, currency: body.currency.toUpperCase(), status: 'pending', authorizationUrl: `https://checkout.syncgrid.test/${execution.usedProvider}/${reference}` },
    });
  });

  app.get('/payments/charges/:reference', {
    schema: { tags: ['Payments'], summary: 'Verify payment charge', description: 'Verifies a payment charge by reference using a unified verification endpoint.', params: { type: 'object', required: ['reference'], properties: { reference: { type: 'string' } } }, querystring: { type: 'object', required: ['provider'], properties: { provider: { type: 'string', enum: supportedPaymentProviders } } } },
  }, async (request) => {
    const { reference } = request.params as { reference: string };
    const { provider } = request.query as { provider: string };
    return { success: true, data: { provider, reference, status: 'success', verifiedAt: new Date().toISOString() } };
  });
}
