import type { FastifyInstance } from 'fastify';

const teams: Array<{
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'business';
  members: Array<{
    email: string;
    role: 'owner' | 'admin' | 'developer' | 'viewer';
  }>;
  createdAt: string;
}> = [];

export async function teamRoutes(app: FastifyInstance) {
  app.post(
    '/teams',
    {
      schema: {
        tags: ['Teams'],
        summary: 'Create team',
        description: 'Creates a team workspace for managing API keys, provider configurations, logs, and integrations.',
        body: {
          type: 'object',
          required: ['name', 'ownerEmail'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              description: 'Team or workspace name.',
            },
            ownerEmail: {
              type: 'string',
              format: 'email',
              description: 'Email address of the team owner.',
            },
            plan: {
              type: 'string',
              enum: ['free', 'pro', 'business'],
              description: 'Subscription plan for the team.',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        ownerEmail: string;
        plan?: 'free' | 'pro' | 'business';
      };

      const team = {
        id: `TEAM-${Date.now()}`,
        name: body.name,
        slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        plan: body.plan || ('free' as const),
        members: [
          {
            email: body.ownerEmail,
            role: 'owner' as const,
          },
        ],
        createdAt: new Date().toISOString(),
      };

      teams.unshift(team);

      return reply.code(201).send({
        success: true,
        data: team,
      });
    },
  );

  app.get('/teams', async () => {
    return {
      success: true,
      count: teams.length,
      data: teams,
    };
  });

  app.get('/teams/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const team = teams.find((item) => item.id === params.id);

    if (!team) {
      return reply.code(404).send({
        success: false,
        message: 'Team not found',
      });
    }

    return {
      success: true,
      data: team,
    };
  });

  app.post('/teams/:id/members', async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as {
      email: string;
      role: 'admin' | 'developer' | 'viewer';
    };

    const team = teams.find((item) => item.id === params.id);

    if (!team) {
      return reply.code(404).send({
        success: false,
        message: 'Team not found',
      });
    }

    team.members.push({
      email: body.email,
      role: body.role,
    });

    return reply.code(201).send({
      success: true,
      message: 'Team member added',
      data: team,
    });
  });
}