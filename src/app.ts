import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerSwagger } from './config/swagger';
import { healthRoutes } from './modules/health/health.routes';
import { providerRoutes } from './modules/providers/providers.routes';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(helmet);
  await registerSwagger(app);

  await app.register(healthRoutes);
  await app.register(providerRoutes);

  return app;
}