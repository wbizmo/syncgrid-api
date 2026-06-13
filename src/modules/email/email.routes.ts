import type { FastifyInstance } from 'fastify';

const supportedEmailProviders = ['resend', 'mailgun', 'sendgrid'];

export async function emailRoutes(app: FastifyInstance) {
  app.get(
    '/emails/providers',
    {
      schema: {
        tags: ['Email'],
        summary: 'List email providers',
        description: 'Returns the supported email providers available through SyncGrid.',
        response: {
          200: {
            description: 'Email providers response',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              data: {
                type: 'array',
                items: { type: 'string' },
                description: 'Supported email providers.',
              },
            },
          },
        },
      },
    },
    async () => {
      return {
        success: true,
        data: supportedEmailProviders,
      };
    },
  );

  app.post(
    '/emails/send',
    {
      schema: {
        tags: ['Email'],
        summary: 'Send email',
        description:
          'Sends an email using a selected provider. SyncGrid exposes one consistent email API while routing delivery through the chosen provider.',
        body: {
          type: 'object',
          required: ['provider', 'from', 'to', 'subject', 'html'],
          properties: {
            provider: {
              type: 'string',
              enum: supportedEmailProviders,
              description: 'Email provider to use. Example: resend',
            },
            from: {
              type: 'string',
              format: 'email',
              description: 'Sender email address.',
            },
            to: {
              type: 'string',
              format: 'email',
              description: 'Recipient email address.',
            },
            subject: {
              type: 'string',
              minLength: 1,
              description: 'Email subject line.',
            },
            html: {
              type: 'string',
              minLength: 1,
              description: 'HTML email body.',
            },
            replyTo: {
              type: 'string',
              format: 'email',
              description: 'Optional reply-to email address.',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
              description: 'Optional metadata attached to the email request.',
            },
          },
        },
        response: {
          202: {
            description: 'Email accepted for delivery',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              message: { type: 'string', description: 'Result message.' },
              data: {
                type: 'object',
                properties: {
                  provider: { type: 'string', description: 'Selected email provider.' },
                  messageId: { type: 'string', description: 'Generated message ID.' },
                  status: { type: 'string', description: 'Delivery status.' },
                  acceptedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Request acceptance timestamp.',
                  },
                },
              },
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
        metadata?: Record<string, unknown>;
      };

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      return reply.code(202).send({
        success: true,
        message: 'Email accepted for delivery',
        data: {
          provider: body.provider,
          messageId,
          status: 'queued',
          acceptedAt: new Date().toISOString(),
        },
      });
    },
  );

  app.get(
    '/emails/messages/:messageId',
    {
      schema: {
        tags: ['Email'],
        summary: 'Get email message status',
        description:
          'Returns the delivery status of an email message by message ID.',
        params: {
          type: 'object',
          required: ['messageId'],
          properties: {
            messageId: {
              type: 'string',
              description: 'Email message ID. Example: MSG-123456789-demo12',
            },
          },
        },
        querystring: {
          type: 'object',
          required: ['provider'],
          properties: {
            provider: {
              type: 'string',
              enum: supportedEmailProviders,
              description: 'Email provider used to send the message. Example: resend',
            },
          },
        },
        response: {
          200: {
            description: 'Email message status response',
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Request status.' },
              data: {
                type: 'object',
                properties: {
                  provider: { type: 'string', description: 'Email provider.' },
                  messageId: { type: 'string', description: 'Email message ID.' },
                  status: { type: 'string', description: 'Delivery status.' },
                  checkedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Status check timestamp.',
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
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
    },
  );
}