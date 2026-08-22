import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectToDatabase, disconnectFromDatabase } from './db/connection.js';

await connectToDatabase(env.MONGODB_URI);

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
