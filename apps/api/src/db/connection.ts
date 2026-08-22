import mongoose from 'mongoose';
import { AvailabilitySession } from '../models/availability-session.js';
import { Driver } from '../models/driver.js';

/**
 * Build every index the schemas declare, and drop any that are no longer
 * declared. Called before the server accepts traffic, and by the test setup.
 *
 * This is not optional housekeeping: `$geoNear` errors out if the 2dsphere
 * index is missing, so a cold database with no indexes fails every rider query
 * rather than degrading.
 */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([Driver.syncIndexes(), AvailabilitySession.syncIndexes()]);
}

export async function connectToDatabase(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await ensureIndexes();
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}
