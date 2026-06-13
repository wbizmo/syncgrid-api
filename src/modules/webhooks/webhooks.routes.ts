import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';

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

  app.get(
    '/webhooks',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'List webhook events',
        description:
          'Returns received webhook events. Supports filtering by provider and status.',
        querystring: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: supportedWebhookProviders,
              description: 'Filter webhook events by provider. Example: paystack',
            },
            status: {
              type: 'string',
              enum: ['received', 'processing', 'processed', 'failed', 'replayed'],
              description: 'Filter webhook events by status. Example: received',
            },
          },
        },
      },
    },
    async (request) => {
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
    },
  );

  app.get(
    '/webhooks/:id',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Get webhook event details',
        description:
          'Returns full details for a webhook event, including the stored payload.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Webhook event ID.',
            },
          },
        },
      },
    },
    async (request, reply) => {
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
    },
  );

  app.post(
    '/webhooks/:id/replay',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Replay webhook event',
        description:
          'Replays a stored webhook event. In production, this would push the event back into a retry queue.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Webhook event ID to replay.',
            },
          },
        },
      },
    },
    async (request, reply) => {
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

      const replayedWebhookEvent = await prisma.webhookEvent.update({
        where: {
          id: params.id,
        },
        data: {
          status: 'replayed',
        },
      });

      return reply.code(202).send({
        success: true,
        message: 'Webhook replay queued',
        data: replayedWebhookEvent,
      });
    },
  );
}