import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../shared/prisma';
import { getCache, setCache } from '../../shared/redis';

function requireTeamId(request: FastifyRequest, reply: FastifyReply): string | null {
  const teamId = request.authenticatedApiKey?.teamId ?? null;
  if (!teamId) {
    reply.code(403).send({
      success: false,
      message: 'A team-scoped API key is required for logs and analytics.',
    });
    return null;
  }
  return teamId;
}

export async function logRoutes(app: FastifyInstance) {
  app.get(
    '/logs',
    {
      schema: {
        tags: ['Logs'],
        summary: 'List request logs',
        description:
          'Returns recorded API request logs for the authenticated team with optional filtering by method, status code, and API-key fingerprint.',
        querystring: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              description: 'Filter by HTTP method. Example: GET, POST, DELETE.',
            },
            statusCode: {
              type: 'number',
              description: 'Filter by response status code. Example: 200, 201, 404.',
            },
            apiKey: {
              type: 'string',
              description: 'Filter logs by stored API-key fingerprint.',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const teamId = requireTeamId(request, reply);
      if (!teamId) return;

      const query = request.query as {
        method?: string;
        statusCode?: number;
        apiKey?: string;
      };

      const logs = await prisma.requestLog.findMany({
        where: {
          teamId,
          ...(query.method !== undefined ? { method: query.method } : {}),
          ...(query.statusCode !== undefined ? { statusCode: query.statusCode } : {}),
          ...(query.apiKey !== undefined ? { apiKey: query.apiKey } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      return {
        success: true,
        count: logs.length,
        data: logs,
      };
    },
  );

  app.get(
    '/logs/:id',
    {
      schema: {
        tags: ['Logs'],
        summary: 'Get request log',
        description: 'Returns a specific request log entry for the authenticated team.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Request log ID.',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const teamId = requireTeamId(request, reply);
      if (!teamId) return;

      const params = request.params as {
        id: string;
      };

      const log = await prisma.requestLog.findFirst({
        where: {
          id: params.id,
          teamId,
        },
      });

      if (!log) {
        return reply.code(404).send({
          success: false,
          message: 'Log not found',
        });
      }

      return {
        success: true,
        data: log,
      };
    },
  );

  app.get(
    '/analytics/usage',
    {
      schema: {
        tags: ['Analytics'],
        summary: 'Usage analytics',
        description:
          'Returns usage statistics derived from persisted request logs for the authenticated team.',
      },
    },
    async (request, reply) => {
      const teamId = requireTeamId(request, reply);
      if (!teamId) return;

      const cacheKey = `analytics:usage:${teamId}`;
      const cached = await getCache(cacheKey);

      if (cached) {
        reply.header('x-cache', 'HIT');

        return {
          ...(cached as Record<string, unknown>),
          cached: true,
        };
      }

      const totalRequests = await prisma.requestLog.count({ where: { teamId } });

      const successfulRequests = await prisma.requestLog.count({
        where: {
          teamId,
          statusCode: {
            gte: 200,
            lt: 400,
          },
        },
      });

      const failedRequests = await prisma.requestLog.count({
        where: {
          teamId,
          statusCode: {
            gte: 400,
          },
        },
      });

      const responseTimeAggregate = await prisma.requestLog.aggregate({
        where: { teamId },
        _avg: {
          responseTime: true,
        },
      });

      const topEndpoints = await prisma.requestLog.groupBy({
        by: ['path'],
        where: { teamId },
        _count: {
          path: true,
        },
        orderBy: {
          _count: {
            path: 'desc',
          },
        },
        take: 5,
      });

      const response = {
        success: true,
        cached: false,
        data: {
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime: Math.round(
            responseTimeAggregate._avg.responseTime || 0,
          ),
          topEndpoints: topEndpoints.map((endpoint) => ({
            path: endpoint.path,
            count: endpoint._count.path,
          })),
        },
      };

      await setCache(cacheKey, response, 30);

      reply.header('x-cache', 'MISS');

      return response;
    },
  );
}
