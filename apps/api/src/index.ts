import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectToDatabase, disconnectFromDatabase } from './db/connection.js';
import { ensureDemoData } from './demo/seed.js';

await connectToDatabase(env.MONGODB_URI);

// `docker compose up` has to produce a populated app, not an empty one waiting
// for its first request.
if (env.DEMO_MODE) {
  const seeded = await ensureDemoData();
  console.log(`Demo mode: ${seeded} synthetic drivers available.`);
}

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down.`);
  server.close();
  await disconnectFromDatabase();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
