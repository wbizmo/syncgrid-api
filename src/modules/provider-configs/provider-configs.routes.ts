import type { FastifyInstance } from 'fastify';

const providerConfigs: Array<{
  id: string;
  provider: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  config: Record<string, unknown>;
}> = [];

export async function providerConfigRoutes(app: FastifyInstance) {
  app.post(
    '/provider-configs',
    {
      schema: {
        tags: ['Providers'],
        summary: 'Create provider configuration',
      },
    },
    async (request, reply) => {
      const body = request.body as {
        provider: string;
        name: string;
        config: Record<string, unknown>;
      };

      const providerConfig = {
        id: `CFG-${Date.now()}`,
        provider: body.provider,
        name: body.name,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        config: body.config,
      };

      providerConfigs.unshift(providerConfig);

      return reply.code(201).send({
        success: true,
        data: providerConfig,
      });
    },
  );

  app.get('/provider-configs', async () => {
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

    const config = providerConfigs.find(
      (item) => item.id === params.id,
    );

    if (!config) {
      return reply.code(404).send({
        success: false,
        message: 'Provider configuration not found',
      });
    }

    return {
      success: true,
      data: config,
    };
  });

  app.delete('/provider-configs/:id', async (request, reply) => {
    const params = request.params as {
      id: string;
    };

    const config = providerConfigs.find(
      (item) => item.id === params.id,
    );

    if (!config) {
      return reply.code(404).send({
        success: false,
        message: 'Provider configuration not found',
      });
    }

    config.status = 'inactive';

    return {
      success: true,
      message: 'Provider configuration disabled',
      data: config,
    };
  });
}