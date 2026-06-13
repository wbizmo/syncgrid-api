import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';

export async function providerConfigRoutes(app: FastifyInstance) {
  app.post(
    '/provider-configs',
    {
      schema: {
        tags: ['Providers'],
        summary: 'Create provider configuration',
        description:
          'Stores a provider configuration for payments, email, or webhook integrations.',
        body: {
          type: 'object',
          required: ['provider', 'name', 'config'],
          properties: {
            provider: {
              type: 'string',
              description: 'Provider name. Example: paystack, stripe, resend, mailgun.',
            },
            name: {
              type: 'string',
              minLength: 2,
              description: 'Human-readable configuration name.',
            },
            config: {
              type: 'object',
              additionalProperties: true,
              description: 'Provider credentials and settings.',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        provider: string;
        name: string;
        config: Record<string, unknown>;
      };

      const providerConfig = await prisma.providerConfig.create({
        data: {
          provider: body.provider,
          name: body.name,
          status: 'active',
          config: body.config,
        },
      });

      return reply.code(201).send({
        success: true,
        data: providerConfig,
      });
    },
  );

  app.get('/provider-configs', async () => {
    const providerConfigs = await prisma.providerConfig.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      count: providerConfigs.length,
      data: providerConfigs,
    };
  });

  app.get('/provider-configs/:id', async (request, reply) => {
    const params = request.params as {
      id: string;
    };

    const providerConfig = await prisma.providerConfig.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!providerConfig) {
      return reply.code(404).send({
        success: false,
        message: 'Provider configuration not found',
      });
    }

    return {
      success: true,
      data: providerConfig,
    };
  });

  app.delete('/provider-configs/:id', async (request, reply) => {
    const params = request.params as {
      id: string;
    };

    const providerConfig = await prisma.providerConfig.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!providerConfig) {
      return reply.code(404).send({
        success: false,
        message: 'Provider configuration not found',
      });
    }

    const disabledProviderConfig = await prisma.providerConfig.update({
      where: {
        id: params.id,
      },
      data: {
        status: 'inactive',
      },
    });

    return {
      success: true,
      message: 'Provider configuration disabled',
      data: disabledProviderConfig,
    };
  });
}