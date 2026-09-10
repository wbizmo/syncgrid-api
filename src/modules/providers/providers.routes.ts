import type { FastifyInstance } from 'fastify';

const providers = [
  { id: 'paystack', name: 'Paystack', category: 'payments', status: 'active', supportedActions: ['create_payment', 'verify_payment'] },
  { id: 'stripe', name: 'Stripe', category: 'payments', status: 'inactive', supportedActions: ['create_payment', 'verify_payment'] },
  { id: 'flutterwave', name: 'Flutterwave', category: 'payments', status: 'inactive', supportedActions: ['create_payment', 'verify_payment'] },
  { id: 'resend', name: 'Resend', category: 'email', status: 'active', supportedActions: ['send_email'] },
  { id: 'mailgun', name: 'Mailgun', category: 'email', status: 'inactive', supportedActions: ['send_email'] },
  { id: 'sendgrid', name: 'SendGrid', category: 'email', status: 'inactive', supportedActions: ['send_email'] },
];

export async function providerRoutes(app: FastifyInstance) {
  app.get('/providers', {
    schema: {
      tags: ['Providers'],
      summary: 'List integration providers',
      description: 'Returns all third-party providers supported by SyncGrid. Supports filtering by provider category and status.',
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['payments', 'email'], description: 'Filter providers by category. Example: payments' },
          status: { type: 'string', enum: ['active', 'inactive'], description: 'Filter providers by status. Example: active' },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { category?: string; status?: string };
    const data = providers.filter((provider) =>
      (!query.category || provider.category === query.category) &&
      (!query.status || provider.status === query.status),
    );
    reply.header('x-cache', 'BYPASS');
    return { success: true, count: data.length, data, cached: false };
  });

  app.get('/providers/:providerId', {
    schema: {
      tags: ['Providers'],
      summary: 'Get provider details',
      description: 'Returns full details for a specific provider using its provider ID.',
      params: { type: 'object', required: ['providerId'], properties: { providerId: { type: 'string', description: 'Unique provider identifier. Example: paystack' } } },
    },
  }, async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const provider = providers.find((item) => item.id === providerId);
    if (!provider) return reply.code(404).send({ success: false, message: 'Provider not found' });
    reply.header('x-cache', 'BYPASS');
    return { success: true, data: provider, cached: false };
  });
}
