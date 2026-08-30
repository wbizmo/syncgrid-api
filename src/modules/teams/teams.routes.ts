import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';
import type { AuthenticatedRequest } from '../../shared/api-key-auth';

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
        description: 'Creates a team workspace. Only a platform API key (an active key not yet bound to a team) may bootstrap new teams.',
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
      const auth = (request as AuthenticatedRequest).auth;
      if (!auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });
      if (auth.teamId) {
        return reply.code(403).send({ success: false, message: 'Team-scoped API keys cannot create additional teams.' });
      }

      const body = request.body as { name: string; ownerEmail: string; plan?: 'free' | 'pro' | 'business' };
      const team = await prisma.team.create({
        data: {
          name: body.name,
          slug: `${createSlug(body.name)}-${Date.now()}`,
          plan: body.plan || 'free',
          members: { create: { email: body.ownerEmail, role: 'owner' } },
        },
        include: { members: true },
      });
      return reply.code(201).send({ success: true, data: team });
    },
  );

  app.get('/teams', async (request, reply) => {
    const auth = (request as AuthenticatedRequest).auth;
    if (!auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    if (!auth.teamId) {
      return reply.code(403).send({ success: false, message: 'Platform keys cannot enumerate teams.' });
    }
    const team = await prisma.team.findUnique({ where: { id: auth.teamId }, include: { members: true } });
    return { success: true, count: team ? 1 : 0, data: team ? [team] : [] };
  });

  app.get('/teams/:id', async (request, reply) => {
    const auth = (request as AuthenticatedRequest).auth;
    const params = request.params as { id: string };
    if (!auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    if (!auth.teamId || auth.teamId !== params.id) {
      return reply.code(404).send({ success: false, message: 'Team not found' });
    }
    const team = await prisma.team.findUnique({ where: { id: params.id }, include: { members: true } });
    if (!team) return reply.code(404).send({ success: false, message: 'Team not found' });
    return { success: true, data: team };
  });

  app.post('/teams/:id/members', async (request, reply) => {
    const auth = (request as AuthenticatedRequest).auth;
    const params = request.params as { id: string };
    const body = request.body as { email: string; role: 'admin' | 'developer' | 'viewer' };
    if (!auth) return reply.code(401).send({ success: false, message: 'Unauthorized' });
    if (!auth.teamId || auth.teamId !== params.id) {
      return reply.code(404).send({ success: false, message: 'Team not found' });
    }

    const team = await prisma.team.findUnique({ where: { id: params.id } });
    if (!team) return reply.code(404).send({ success: false, message: 'Team not found' });

    await prisma.teamMember.create({ data: { teamId: params.id, email: body.email, role: body.role } });
    const updatedTeam = await prisma.team.findUnique({ where: { id: params.id }, include: { members: true } });
    return reply.code(201).send({ success: true, message: 'Team member added', data: updatedTeam });
  });
}