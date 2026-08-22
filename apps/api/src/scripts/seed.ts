import { env } from '../config/env.js';
import { connectToDatabase, disconnectFromDatabase } from '../db/connection.js';
import { ensureDemoData } from '../demo/seed.js';

await connectToDatabase(env.MONGODB_URI);
const seeded = await ensureDemoData();
console.log(`Seeded ${seeded} demo drivers, each with a live availability session.`);
console.log('All of it is synthetic: invented names, undialable numbers, invented plates.');
await disconnectFromDatabase();
