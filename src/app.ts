import Fastify from 'fastify';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.get('/', async () => {
    return {
      name: 'SyncGrid API',
      version: '1.0.0',
      status: 'running',
    };
  });

  app.get('/health', async () => {
    return {
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}