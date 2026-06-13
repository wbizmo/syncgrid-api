import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/prisma';

export async function logRoutes(app: FastifyInstance) {
  app.get(
    '/logs',
    {
      schema: {
        tags: ['Logs'],
        summary: 'List request logs',
        description:
          'Returns recorded API request logs with optional filtering by method, status code, and API key.',
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
              description: 'Filter logs by API key.',
            },
          },
        },
      },
    },
    async (request) => {
      const query = request.query as {
        method?: string;
        statusCode?: number;
        apiKey?: string;
      };

      const logs = await prisma.requestLog.findMany({
        where: {
          method: query.method,
          statusCode: query.statusCode,
          apiKey: query.apiKey,
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
        description: 'Returns a specific request log entry.',
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
      const params = request.params as {
        id: string;
      };

      const log = await prisma.requestLog.findUnique({
        where: {
          id: params.id,
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
          'Returns usage statistics derived from persisted request logs.',
      },
    },
    async () => {
      const totalRequests = await prisma.requestLog.count();

      const successfulRequests = await prisma.requestLog.count({
        where: {
          statusCode: {
            gte: 200,
            lt: 400,
          },
        },
      });

      const failedRequests = await prisma.requestLog.count({
        where: {
          statusCode: {
            gte: 400,
          },
        },
      });

      const responseTimeAggregate = await prisma.requestLog.aggregate({
        _avg: {
          responseTime: true,
        },
      });

      const topEndpoints = await prisma.requestLog.groupBy({
        by: ['path'],
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

      return {
        success: true,
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
    },
  );
}