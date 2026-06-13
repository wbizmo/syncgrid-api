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

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
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

  return app;
}