import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';
import { addWebhookReplayJob } from '../../jobs/queue';

const supportedWebhookProviders = [
  'paystack',
  'stripe',
  'flutterwave',
  'resend',
  'mailgun',
  'sendgrid',
];

export async function webhookRoutes(app: FastifyInstance) {
  app.post(
    '/webhooks/:provider',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Receive provider webhook',
        description:
          'Receives and stores webhook events from supported payment and email providers.',
        params: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: {
              type: 'string',
              enum: supportedWebhookProviders,
              description: 'Provider sending the webhook. Example: paystack',
            },
          },
        },
        body: {
          type: 'object',
          additionalProperties: true,
          description:
            'Raw webhook payload sent by the provider. The payload shape depends on the provider.',
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { provider: string };
      const payload = request.body as Record<string, unknown>;

      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          provider: params.provider,
          event: String(payload.event || payload.type || 'unknown.event'),
          status: 'received',
          payload,
        },
      });

      return reply.code(202).send({
        success: true,
        message: 'Webhook accepted',
        data: webhookEvent,
      });
    },
  );

  app.get('/webhooks', async (request) => {
    const query = request.query as {
      provider?: string;
      status?: string;
    };

    const webhookEvents = await prisma.webhookEvent.findMany({
      where: {
        provider: query.provider,
        status: query.status,
      },
      orderBy: {
        receivedAt: 'desc',
      },
    });

    return {
      success: true,
      count: webhookEvents.length,
      data: webhookEvents,
    };
  });

  app.get('/webhooks/:id', async (request, reply) => {
    const params = request.params as { id: string };

    const webhookEvent = await prisma.webhookEvent.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!webhookEvent) {
      return reply.code(404).send({
        success: false,
        message: 'Webhook event not found',
      });
    }

    return {
      success: true,
      data: webhookEvent,
    };
  });

  app.post('/webhooks/:id/replay', async (request, reply) => {
    const params = request.params as { id: string };

    const webhookEvent = await prisma.webhookEvent.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!webhookEvent) {
      return reply.code(404).send({
        success: false,
        message: 'Webhook event not found',
      });
    }

    const job = await addWebhookReplayJob({
      webhookEventId: webhookEvent.id,
      provider: webhookEvent.provider,
    });

    const replayedWebhookEvent = await prisma.webhookEvent.update({
      where: {
        id: params.id,
      },
      data: {
        status: job ? 'queued' : 'replayed',
      },
    });

    return reply.code(202).send({
      success: true,
      message: job
        ? 'Webhook replay queued'
        : 'Webhook replay simulated because Redis is not configured',
      data: {
        webhookEvent: replayedWebhookEvent,
        jobId: job?.id || null,
        queueEnabled: Boolean(job),
      },
    });
  });
}