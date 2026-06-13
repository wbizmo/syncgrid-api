import type { FastifyInstance } from 'fastify';

const webhookEvents: Array<{
  id: string;
  provider: string;
  event: string;
  status: string;
  receivedAt: string;
  payload: Record<string, unknown>;
}> = [];

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
        response: {
          202: {
            description: 'Webhook accepted',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              message: { type: 'string', description: 'Result message.' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Webhook event ID.' },
                  provider: { type: 'string', description: 'Webhook provider.' },
                  status: { type: 'string', description: 'Webhook processing status.' },
                  receivedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Webhook received timestamp.',
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as { provider: string };
      const payload = request.body as Record<string, unknown>;

      const event = {
        id: `WH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        provider: params.provider,
        event: String(payload.event || payload.type || 'unknown.event'),
        status: 'received',
        receivedAt: new Date().toISOString(),
        payload,
      };

      webhookEvents.unshift(event);

      return reply.code(202).send({
        success: true,
        message: 'Webhook accepted',
        data: {
          id: event.id,
          provider: event.provider,
          status: event.status,
          receivedAt: event.receivedAt,
        },
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
        response: {
          200: {
            description: 'Webhook event list',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              count: { type: 'number', description: 'Number of returned events.' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Webhook event ID.' },
                    provider: { type: 'string', description: 'Webhook provider.' },
                    event: { type: 'string', description: 'Webhook event name.' },
                    status: { type: 'string', description: 'Webhook processing status.' },
                    receivedAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Webhook received timestamp.',
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
        provider?: string;
        status?: string;
      };

      let result = webhookEvents;

      if (query.provider) {
        result = result.filter((event) => event.provider === query.provider);
      }

      if (query.status) {
        result = result.filter((event) => event.status === query.status);
      }

      return {
        success: true,
        count: result.length,
        data: result.map(({ payload, ...event }) => event),
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
              description: 'Webhook event ID. Example: WH-123456789-demo12',
            },
          },
        },
        response: {
          200: {
            description: 'Webhook event details',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Webhook event ID.' },
                  provider: { type: 'string', description: 'Webhook provider.' },
                  event: { type: 'string', description: 'Webhook event name.' },
                  status: { type: 'string', description: 'Webhook processing status.' },
                  receivedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Webhook received timestamp.',
                  },
                  payload: {
                    type: 'object',
                    additionalProperties: true,
                    description: 'Original webhook payload.',
                  },
                },
              },
            },
          },
          404: {
            description: 'Webhook event not found',
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
      const params = request.params as { id: string };
      const event = webhookEvents.find((item) => item.id === params.id);

      if (!event) {
        return reply.code(404).send({
          success: false,
          message: 'Webhook event not found',
        });
      }

      return {
        success: true,
        data: event,
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
              description: 'Webhook event ID to replay. Example: WH-123456789-demo12',
            },
          },
        },
        response: {
          202: {
            description: 'Webhook replay queued',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              message: { type: 'string', description: 'Result message.' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Webhook event ID.' },
                  status: { type: 'string', description: 'Replay status.' },
                  replayedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Replay timestamp.',
                  },
                },
              },
            },
          },
          404: {
            description: 'Webhook event not found',
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
      const params = request.params as { id: string };
      const event = webhookEvents.find((item) => item.id === params.id);

      if (!event) {
        return reply.code(404).send({
          success: false,
          message: 'Webhook event not found',
        });
      }

      event.status = 'replayed';

      return reply.code(202).send({
        success: true,
        message: 'Webhook replay queued',
        data: {
          id: event.id,
          status: event.status,
          replayedAt: new Date().toISOString(),
        },
      });
    },
  );
}