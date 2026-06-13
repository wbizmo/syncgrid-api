import type { FastifyInstance } from 'fastify';
import { requestLogs } from './logs.store';

export async function logRoutes(app: FastifyInstance) {
  app.get(
    '/logs',
    {
      schema: {
        tags: ['Logs'],
        summary: 'List request logs',
        description: 'Returns recorded API request logs.',
      },
    },
    async () => {
      return {
        success: true,
        count: requestLogs.length,
        data: requestLogs,
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
            },
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as {
        id: string;
      };

      const log = requestLogs.find((item) => item.id === params.id);

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
        description: 'Returns usage statistics derived from request logs.',
      },
    },
    async () => {
      const totalRequests = requestLogs.length;

      const successfulRequests = requestLogs.filter(
        (log) => log.statusCode >= 200 && log.statusCode < 400,
      ).length;

      const failedRequests = requestLogs.filter(
        (log) => log.statusCode >= 400,
      ).length;

      const averageResponseTime =
        totalRequests > 0
          ? Math.round(
              requestLogs.reduce(
                (total, log) => total + log.responseTime,
                0,
              ) / totalRequests,
            )
          : 0;

      return {
        success: true,
        data: {
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime,
        },
      };
    },
  );
}