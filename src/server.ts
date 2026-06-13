import { buildApp } from './app';
import { startWorkers } from './jobs/workers';

async function start() {
  try {
    const app = await buildApp();

    startWorkers();

    await app.listen({
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0',
    });

    console.log('SyncGrid API running');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();