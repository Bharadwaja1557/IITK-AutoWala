import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { ensureIndexes } from '../src/db/connection.js';

/**
 * A real mongod, in a temp directory, thrown away afterwards.
 *
 * It has to be a real one rather than a mock: the two things these tests exist
 * to prove — that $geoNear ranks by true distance, and that the expiry filter
 * catches what the TTL reaper has not yet collected — are properties of
 * MongoDB, not of code I wrote. Mocking the driver would test the mock.
 */
let mongo: MongoMemoryServer;

beforeAll(async () => {
  // Pinned to the same major the container runs (see docker-compose.yml), so a
  // difference in behaviour between test and deployment cannot hide here.
  mongo = await MongoMemoryServer.create({ binary: { version: '8.0.4' } });
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongo.getUri('iitk-autowala-test'));
  // $geoNear errors without the 2dsphere index, so build indexes up front
  // exactly as the server does at boot.
  await ensureIndexes();
});

afterEach(async () => {
  // Empty the collections but leave the indexes in place.
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
