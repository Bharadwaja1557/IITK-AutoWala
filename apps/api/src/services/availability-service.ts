import type { HydratedDocument } from 'mongoose';
import {
  LANDMARKS_BY_ID,
  findLandmark,
  type AvailabilitySessionView,
  type DeclareAvailabilityInput,
} from '@iitk-autowala/shared';
import { env } from '../config/env.js';
import { isDuplicateKeyError } from '../db/mongo-errors.js';
import {
  AvailabilitySession,
  type AvailabilitySessionDoc,
} from '../models/availability-session.js';

interface ResolvedLocation {
  landmarkId: string | null;
  coordinates: [number, number];
}

function resolveLocation(input: DeclareAvailabilityInput): ResolvedLocation {
  if (input.source === 'landmark') {
    const landmark = LANDMARKS_BY_ID[input.landmarkId];
    return {
      landmarkId: landmark.id,
      coordinates: [landmark.coordinates[0], landmark.coordinates[1]],
    };
  }
  // Straight from navigator.geolocation. No landmark to name it with.
  return { landmarkId: null, coordinates: [input.lng, input.lat] };
}

export function toSessionView(session: AvailabilitySessionDoc): AvailabilitySessionView {
  const landmark = session.landmarkId ? findLandmark(session.landmarkId) : undefined;
  return {
    id: session._id.toString(),
    landmarkId: session.landmarkId,
    landmarkName: landmark?.name ?? null,
    lng: session.location.coordinates[0],
    lat: session.location.coordinates[1],
    declaredAt: session.declaredAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * One tap. The session it writes replaces whatever the driver had before, and
 * expires on its own AVAILABILITY_TTL_MINUTES later.
 */
export async function declareAvailability(
  driverId: string,
  input: DeclareAvailabilityInput,
): Promise<HydratedDocument<AvailabilitySessionDoc>> {
  const { landmarkId, coordinates } = resolveLocation(input);
  const declaredAt = new Date();
  const expiresAt = new Date(declaredAt.getTime() + env.AVAILABILITY_TTL_MINUTES * 60_000);

  const update = {
    $set: {
      landmarkId,
      location: { type: 'Point' as const, coordinates },
      declaredAt,
      expiresAt,
    },
  };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };

  let session: HydratedDocument<AvailabilitySessionDoc> | null;
  try {
    session = await AvailabilitySession.findOneAndUpdate({ driverId }, update, options);
  } catch (error) {
    // Two taps racing to insert the first session for this driver: the unique
    // index rejects the loser rather than serialising it. By now the winner's
    // document exists, so the same call updates it instead of inserting.
    if (!isDuplicateKeyError(error)) throw error;
    session = await AvailabilitySession.findOneAndUpdate({ driverId }, update, options);
  }

  if (!session) {
    throw new Error('Upsert with new:true returned no availability session.');
  }
  return session;
}

/**
 * The driver's own current status.
 *
 * Filters on expiresAt as well as driverId: the TTL monitor runs about once a
 * minute, so a session that has already expired can still be sitting in the
 * collection. Reading it back would tell a driver they are visible to riders
 * when they are not.
 */
export async function getLiveSession(
  driverId: string,
): Promise<HydratedDocument<AvailabilitySessionDoc> | null> {
  return AvailabilitySession.findOne({ driverId, expiresAt: { $gt: new Date() } });
}

/** Going off duty before the window runs out. */
export async function endAvailability(driverId: string): Promise<void> {
  await AvailabilitySession.deleteMany({ driverId });
}
