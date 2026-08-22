import { LANDMARKS_BY_ID, type LandmarkId, type VehicleType } from '@iitk-autowala/shared';
import type { HydratedDocument } from 'mongoose';
import { AvailabilitySession } from '../src/models/availability-session.js';
import { Driver, type DriverDoc } from '../src/models/driver.js';

let sequence = 0;

/**
 * Writes straight to the collections, bypassing the Zod schemas exactly the way
 * the seed script does. That is what makes it possible to build states the API
 * would never produce — such as a session that expired an hour ago.
 */
export async function makeDriver(
  overrides: Partial<Pick<DriverDoc, 'name' | 'phone' | 'vehicleNumber' | 'vehicleType'>> = {},
): Promise<HydratedDocument<DriverDoc>> {
  sequence += 1;
  const padded = String(sequence).padStart(4, '0');

  return Driver.create({
    name: overrides.name ?? `Test Driver ${padded}`,
    phone: overrides.phone ?? `55509${padded.padStart(5, '0')}`,
    vehicleNumber: overrides.vehicleNumber ?? `UP 78 TEST ${padded}`,
    vehicleType: (overrides.vehicleType ?? 'auto') satisfies VehicleType,
    passwordHash: 'not-a-real-hash-these-accounts-are-never-signed-into',
    role: 'driver',
  });
}

export interface SessionOptions {
  landmarkId: LandmarkId;
  /** Positive is in the future, negative is already expired. */
  expiresInMinutes: number;
  declaredMinutesAgo?: number;
}

export async function makeSession(
  driverId: HydratedDocument<DriverDoc>['_id'],
  options: SessionOptions,
): Promise<void> {
  const landmark = LANDMARKS_BY_ID[options.landmarkId];
  const now = Date.now();

  await AvailabilitySession.create({
    driverId,
    landmarkId: landmark.id,
    location: {
      type: 'Point',
      coordinates: [landmark.coordinates[0], landmark.coordinates[1]],
    },
    declaredAt: new Date(now - (options.declaredMinutesAgo ?? 0) * 60_000),
    expiresAt: new Date(now + options.expiresInMinutes * 60_000),
  });
}

/**
 * Great-circle distance on a sphere. Deliberately a second, independent
 * implementation: asserting $geoNear's output against a number computed here
 * checks that the pipeline returns real metres, not that it agrees with itself.
 */
export function haversineMetres(
  from: readonly [number, number],
  to: readonly [number, number],
): number {
  const earthRadius = 6_371_008.8;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(to[1] - from[1]);
  const deltaLng = toRadians(to[0] - from[0]);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from[1])) * Math.cos(toRadians(to[1])) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}
