import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../shared/prisma';

function requireTeamId(request: FastifyRequest, reply: FastifyReply): string | null {
  const teamId = request.authenticatedApiKey?.teamId ?? null;
  if (!teamId) {
    reply.code(403).send({
      success: false,
      message: 'A team-scoped API key is required for provider configurations.',
    });
    return null;
  }
  return teamId;
}

function safeProviderConfig<T extends { config: unknown }>(providerConfig: T) {
  const { config: _config, ...safe } = providerConfig;
  return safe;
}

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
      const teamId = requireTeamId(request, reply);
      if (!teamId) return;

      const body = request.body as {
        provider: string;
        name: string;
        config: Record<string, unknown>;
      };

      const providerConfig = await prisma.providerConfig.create({
        data: {
          teamId,
          provider: body.provider,
          name: body.name,
          status: 'active',
          config: body.config,
        },
      });

      return reply.code(201).send({
        success: true,
        data: safeProviderConfig(providerConfig),
      });
    },
  );

  app.get('/provider-configs', async (request, reply) => {
    const teamId = requireTeamId(request, reply);
    if (!teamId) return;

    const providerConfigs = await prisma.providerConfig.findMany({
      where: { teamId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      count: providerConfigs.length,
      data: providerConfigs.map(safeProviderConfig),
    };
  });

  app.get('/provider-configs/:id', async (request, reply) => {
    const teamId = requireTeamId(request, reply);
    if (!teamId) return;

    const params = request.params as {
      id: string;
    };

    const providerConfig = await prisma.providerConfig.findFirst({
      where: {
        id: params.id,
        teamId,
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
      data: safeProviderConfig(providerConfig),
    };
  });

  app.delete('/provider-configs/:id', async (request, reply) => {
    const teamId = requireTeamId(request, reply);
    if (!teamId) return;

    const params = request.params as {
      id: string;
    };

    const providerConfig = await prisma.providerConfig.findFirst({
      where: {
        id: params.id,
        teamId,
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
        id: providerConfig.id,
      },
      data: {
        status: 'inactive',
      },
    });

    return {
      success: true,
      message: 'Provider configuration disabled',
      data: safeProviderConfig(disabledProviderConfig),
    };
  });
}
