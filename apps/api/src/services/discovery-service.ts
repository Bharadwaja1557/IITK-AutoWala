import type { Types } from 'mongoose';
import { findLandmark, type NearbyDriver, type VehicleType } from '@iitk-autowala/shared';
import { AvailabilitySession } from '../models/availability-session.js';

export interface NearbySearch {
  lng: number;
  lat: number;
  radiusMeters: number;
  limit: number;
}

interface NearbyRow {
  driverId: Types.ObjectId;
  landmarkId: string | null;
  distanceMeters: number;
  declaredAt: Date;
  expiresAt: Date;
  driver: {
    name: string;
    phone: string;
    vehicleNumber: string;
    vehicleType: VehicleType;
  };
}

/**
 * The rider query. Live availability sessions within `radiusMeters` of a point,
 * nearest first, with the driver attached.
 *
 * Three things about this pipeline are deliberate.
 *
 * 1. `$geoNear` must be the first stage — MongoDB rejects the aggregation
 *    otherwise. So the expiry predicate cannot be a `$match` in front of it,
 *    and goes in `$geoNear`'s own `query` instead. See D-10.
 *
 * 2. The expiry predicate is not optional decoration on top of the TTL index.
 *    The TTL monitor wakes roughly every 60 seconds, so a session that expired
 *    40 seconds ago is still in the collection and still matches the geo index.
 *    The index reclaims space; this filter is what makes the answer correct.
 *
 * 3. The `$lookup` carries its own `$project`. Mongoose's `select: false` on
 *    passwordHash is a Mongoose-layer rule and has no effect inside an
 *    aggregation — without the inner projection the hash would be read out of
 *    the drivers collection on every rider query.
 */
export async function findNearbyDrivers(search: NearbySearch): Promise<NearbyDriver[]> {
  const now = new Date();

  const rows = await AvailabilitySession.aggregate<NearbyRow>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [search.lng, search.lat] },
        distanceField: 'distanceMeters',
        // Great-circle metres over the WGS84 ellipsoid rather than flat
        // degrees. On a 2km campus the difference is small; getting it wrong
        // would make the numbers meaningless anyway.
        spherical: true,
        maxDistance: search.radiusMeters,
        // Explicit because there is exactly one 2dsphere index today and I
        // would rather this fail loudly than silently pick a different one if
        // a second is ever added.
        key: 'location',
        query: { expiresAt: { $gt: now } },
      },
    },
    { $limit: search.limit },
    {
      $lookup: {
        from: 'drivers',
        localField: 'driverId',
        foreignField: '_id',
        as: 'driver',
        pipeline: [{ $project: { _id: 0, name: 1, phone: 1, vehicleNumber: 1, vehicleType: 1 } }],
      },
    },
    // Drops sessions whose driver has been deleted. That is the behaviour we
    // want: an orphaned session is not something a rider should be shown.
    { $unwind: '$driver' },
    {
      $project: {
        _id: 0,
        driverId: 1,
        landmarkId: 1,
        distanceMeters: 1,
        declaredAt: 1,
        expiresAt: 1,
        driver: 1,
      },
    },
  ]);

  return rows.map((row) => ({
    driverId: row.driverId.toString(),
    name: row.driver.name,
    phone: row.driver.phone,
    vehicleNumber: row.driver.vehicleNumber,
    vehicleType: row.driver.vehicleType,
    landmarkId: row.landmarkId,
    landmarkName: row.landmarkId ? (findLandmark(row.landmarkId)?.name ?? null) : null,
    // Sub-metre precision is noise given landmark-level input (D-03).
    distanceMeters: Math.round(row.distanceMeters),
    declaredAt: row.declaredAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}
