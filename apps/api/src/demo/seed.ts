import { randomBytes } from 'node:crypto';
import { LANDMARKS_BY_ID } from '@iitk-autowala/shared';
import { hashPassword } from '../auth/password.js';
import { env } from '../config/env.js';
import { AvailabilitySession } from '../models/availability-session.js';
import { Driver } from '../models/driver.js';
import { DEMO_DRIVERS } from './demo-drivers.js';

/**
 * Shared by every concurrent caller, so a burst of rider requests arriving at
 * an empty database triggers one seed rather than ten. Module-level, therefore
 * per process — see the note in Known weaknesses about multiple instances.
 */
let inFlight: Promise<number> | null = null;

async function seedDemoData(): Promise<number> {
  // Every demo account is unreachable by design: the phone numbers fail the
  // login schema, so no password will ever be checked against this hash. It is
  // a random value nobody holds, rather than a known constant that could be
  // reused if the phone rule ever loosened.
  const passwordHash = await hashPassword(randomBytes(24).toString('hex'));
  const now = new Date();

  // A driver who declared 33 minutes ago is only interesting if the window is
  // longer than that. If AVAILABILITY_TTL_MINUTES is configured short, the
  // seeded ages compress instead of producing sessions that are born expired.
  const oldestAllowedMinutes = Math.max(1, Math.floor(env.AVAILABILITY_TTL_MINUTES * 0.7));

  let seeded = 0;
  for (const demo of DEMO_DRIVERS) {
    const driver = await Driver.findOneAndUpdate(
      { phone: demo.phone },
      {
        $set: {
          name: demo.name,
          vehicleNumber: demo.vehicleNumber,
          vehicleType: demo.vehicleType,
        },
        $setOnInsert: { phone: demo.phone, passwordHash, role: 'driver' },
      },
      { upsert: true, new: true },
    );

    const ageMinutes = Math.min(demo.declaredMinutesAgo, oldestAllowedMinutes);
    const declaredAt = new Date(now.getTime() - ageMinutes * 60_000);
    const expiresAt = new Date(declaredAt.getTime() + env.AVAILABILITY_TTL_MINUTES * 60_000);
    const landmark = LANDMARKS_BY_ID[demo.landmarkId];

    await AvailabilitySession.findOneAndUpdate(
      { driverId: driver._id },
      {
        $set: {
          landmarkId: landmark.id,
          location: {
            type: 'Point' as const,
            coordinates: [landmark.coordinates[0], landmark.coordinates[1]],
          },
          declaredAt,
          expiresAt,
        },
      },
      { upsert: true, new: true },
    );

    seeded += 1;
  }

  return seeded;
}

/**
 * Idempotent: drivers are upserted by phone and each gets exactly one session,
 * so running it twice refreshes the demo rather than duplicating it.
 *
 * Returns how many demo drivers are now live.
 */
export function ensureDemoData(): Promise<number> {
  if (!inFlight) {
    inFlight = seedDemoData().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
