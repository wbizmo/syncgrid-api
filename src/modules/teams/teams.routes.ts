import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function teamRoutes(app: FastifyInstance) {
  app.post(
    '/teams',
    {
      schema: {
        tags: ['Teams'],
        summary: 'Create team',
        description:
          'Creates a team workspace for managing API keys, provider configurations, logs, and integrations.',
        body: {
          type: 'object',
          required: ['name', 'ownerEmail'],
          properties: {
            name: { type: 'string', minLength: 2 },
            ownerEmail: { type: 'string', format: 'email' },
            plan: { type: 'string', enum: ['free', 'pro', 'business'] },
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

      const team = await prisma.team.create({
        data: {
          name: body.name,
          slug: `${createSlug(body.name)}-${Date.now()}`,
          plan: body.plan || 'free',
          members: {
            create: {
              email: body.ownerEmail,
              role: 'owner',
            },
          },
        },
        include: {
          members: true,
        },
      });

      return reply.code(201).send({
        success: true,
        data: team,
      });
    },
  );

  app.get('/teams', async () => {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      count: teams.length,
      data: teams,
    };
  });

  app.get('/teams/:id', async (request, reply) => {
    const params = request.params as { id: string };

    const team = await prisma.team.findUnique({
      where: {
        id: params.id,
      },
      include: {
        members: true,
      },
    });

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

    const team = await prisma.team.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!team) {
      return reply.code(404).send({
        success: false,
        message: 'Team not found',
      });
    }

    await prisma.teamMember.create({
      data: {
        teamId: params.id,
        email: body.email,
        role: body.role,
      },
    });

    const updatedTeam = await prisma.team.findUnique({
      where: {
        id: params.id,
      },
      include: {
        members: true,
      },
    });

    return reply.code(201).send({
      success: true,
      message: 'Team member added',
      data: updatedTeam,
    });
  });
}