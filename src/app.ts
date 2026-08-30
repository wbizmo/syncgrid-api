import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { registerSwagger } from './config/swagger';

import { apiKeyAuth } from './shared/api-key-auth';
import { requestLogger } from './shared/request-logger';
import { rateLimit } from './shared/rate-limit';

import { healthRoutes } from './modules/health/health.routes';
import { providerRoutes } from './modules/providers/providers.routes';
import { providerConfigRoutes } from './modules/provider-configs/provider-configs.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { emailRoutes } from './modules/email/email.routes';
import { webhookRoutes } from './modules/webhooks/webhooks.routes';
import { apiKeyRoutes } from './modules/api-keys/api-keys.routes';
import { logRoutes } from './modules/logs/logs.routes';
import { teamRoutes } from './modules/teams/teams.routes';

function allowedCorsOrigins(): string[] {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://localhost:5173'];
}

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  const corsOrigins = allowedCorsOrigins();

  await app.register(cors, {
    credentials: false,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, corsOrigins.includes(origin));
    },
  });

  await app.register(helmet);

  await registerSwagger(app);

  app.addHook('onRequest', requestLogger);

  app.addHook('preHandler', rateLimit);

  app.addHook('preHandler', apiKeyAuth);

  await app.register(healthRoutes);

  await app.register(apiKeyRoutes);

  await app.register(providerRoutes);

  await app.register(providerConfigRoutes);

  await app.register(paymentRoutes);

  await app.register(emailRoutes);

  await app.register(webhookRoutes);

  await app.register(logRoutes);

  await app.register(teamRoutes);

  return app;
}