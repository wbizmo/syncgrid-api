import type { FastifyInstance } from 'fastify';
import { simulateProviderExecution } from '../../shared/provider-failover';

const supportedEmailProviders = ['resend', 'mailgun', 'sendgrid'];

export async function emailRoutes(app: FastifyInstance) {
  app.get('/emails/providers', async () => {
    return {
      success: true,
      data: supportedEmailProviders,
    };
  });

  app.post(
    '/emails/send',
    {
      schema: {
        tags: ['Email'],
        summary: 'Send email',
        description:
          'Sends an email using one consistent API. If the primary provider fails, SyncGrid can simulate failover to a backup email provider.',
        body: {
          type: 'object',
          required: ['provider', 'from', 'to', 'subject', 'html'],
          properties: {
            provider: {
              type: 'string',
              enum: supportedEmailProviders,
              description: 'Primary email provider. Example: resend',
            },
            from: { type: 'string', format: 'email' },
            to: { type: 'string', format: 'email' },
            subject: { type: 'string', minLength: 1 },
            html: { type: 'string', minLength: 1 },
            replyTo: { type: 'string', format: 'email' },
            simulateFailure: {
              type: 'boolean',
              description:
                'When true, SyncGrid simulates primary provider failure and attempts failover.',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        provider: string;
        from: string;
        to: string;
        subject: string;
        html: string;
        replyTo?: string;
        simulateFailure?: boolean;
        metadata?: Record<string, unknown>;
      };

      const execution = simulateProviderExecution({
        provider: body.provider,
        category: 'email',
        shouldFail: body.simulateFailure,
      });

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      return reply.code(202).send({
        success: true,
        message: execution.failedOver
          ? 'Email accepted using fallback provider'
          : 'Email accepted for delivery',
        data: {
          requestedProvider: body.provider,
          usedProvider: execution.usedProvider,
          attemptedProviders: execution.attemptedProviders,
          failedOver: execution.failedOver,
          messageId,
          status: 'queued',
          acceptedAt: new Date().toISOString(),
        },
      });
    },
  );

  app.get('/emails/messages/:messageId', async (request) => {
    const params = request.params as { messageId: string };
    const query = request.query as { provider: string };

    return {
      success: true,
      data: {
        provider: query.provider,
        messageId: params.messageId,
        status: 'delivered',
        checkedAt: new Date().toISOString(),
      },
    };
  });
}