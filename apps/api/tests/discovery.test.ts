import request from 'supertest';
import { LANDMARKS_BY_ID, type NearbyResponse } from '@iitk-autowala/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AvailabilitySession } from '../src/models/availability-session.js';
import { haversineMetres, makeDriver, makeSession } from './factories.js';

const app = createApp();

const ORIGIN = LANDMARKS_BY_ID['shopping-centre'].coordinates;

async function queryNearby(radiusMeters?: number): Promise<NearbyResponse> {
  const response = await request(app)
    .get('/api/drivers/nearby')
    .query({
      lng: ORIGIN[0],
      lat: ORIGIN[1],
      ...(radiusMeters === undefined ? {} : { radiusMeters }),
    })
    .expect(200);

  return response.body as NearbyResponse;
}

describe('GET /api/drivers/nearby', () => {
  it('ranks live drivers by real distance and reports it in metres', async () => {
    // Three landmarks at clearly different distances from the Shopping Centre.
    const near = await makeDriver({ name: 'Near Driver' });
    const middle = await makeDriver({ name: 'Middle Driver' });
    const far = await makeDriver({ name: 'Far Driver' });

    // Inserted in the wrong order on purpose: if the pipeline were returning
    // insertion order this test would pass by accident otherwise.
    await makeSession(far._id, { landmarkId: 'hall-12', expiresInMinutes: 30 });
    await makeSession(near._id, { landmarkId: 'health-centre', expiresInMinutes: 30 });
    await makeSession(middle._id, { landmarkId: 'hall-2', expiresInMinutes: 30 });

    const body = await queryNearby();

    expect(body.drivers.map((driver) => driver.name)).toEqual([
      'Near Driver',
      'Middle Driver',
      'Far Driver',
    ]);

    const distances = body.drivers.map((driver) => driver.distanceMeters);
    expect(distances[0]).toBeLessThan(distances[1] as number);
    expect(distances[1]).toBeLessThan(distances[2] as number);

    // The ordering above only proves the ranking is consistent. This proves the
    // numbers are actual metres, by checking them against an independent
    // haversine calculation rather than against the pipeline's own output.
    const expected = [
      haversineMetres(ORIGIN, LANDMARKS_BY_ID['health-centre'].coordinates),
      haversineMetres(ORIGIN, LANDMARKS_BY_ID['hall-2'].coordinates),
      haversineMetres(ORIGIN, LANDMARKS_BY_ID['hall-12'].coordinates),
    ];

    body.drivers.forEach((driver, index) => {
      // $geoNear measures on the WGS84 ellipsoid, haversine on a sphere; over a
      // couple of kilometres they differ by well under a percent.
      expect(driver.distanceMeters).toBeCloseTo(expected[index] as number, -1);
      expect(Math.abs(driver.distanceMeters - (expected[index] as number))).toBeLessThan(
        (expected[index] as number) * 0.01 + 5,
      );
    });
  });

  it('excludes an expired session that the TTL reaper has not collected yet', async () => {
    const live = await makeDriver({ name: 'Still Available' });
    const stale = await makeDriver({ name: 'Expired An Hour Ago' });

    await makeSession(live._id, { landmarkId: 'hall-2', expiresInMinutes: 30 });
    // Closer to the origin than the live driver, so if it were included it
    // would be first in the list — this cannot pass by ordering luck.
    await makeSession(stale._id, { landmarkId: 'shopping-centre', expiresInMinutes: -60 });

    // The whole point of the test: the expired document is still physically in
    // the collection. MongoDB's TTL monitor only wakes about once a minute, so
    // between expiry and collection there is a window where an expired session
    // is fully indexed and would match a geo query. If the API relied on the
    // TTL index alone, "Expired An Hour Ago" would be the top result.
    expect(await AvailabilitySession.countDocuments({})).toBe(2);
    expect(
      await AvailabilitySession.countDocuments({ expiresAt: { $lt: new Date() } }),
    ).toBe(1);

    const body = await queryNearby();

    expect(body.drivers.map((driver) => driver.name)).toEqual(['Still Available']);
  });

  it('does not return drivers outside the requested radius', async () => {
    const inside = await makeDriver({ name: 'Inside Radius' });
    const outside = await makeDriver({ name: 'Outside Radius' });

    await makeSession(inside._id, { landmarkId: 'health-centre', expiresInMinutes: 30 });
    await makeSession(outside._id, { landmarkId: 'hall-12', expiresInMinutes: 30 });

    const tight = haversineMetres(ORIGIN, LANDMARKS_BY_ID['health-centre'].coordinates) + 50;
    const body = await queryNearby(Math.round(tight));

    expect(body.radiusMeters).toBe(Math.round(tight));
    expect(body.drivers.map((driver) => driver.name)).toEqual(['Inside Radius']);
  });

  it('rejects a query with no coordinates', async () => {
    const response = await request(app).get('/api/drivers/nearby').expect(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(Object.keys(response.body.error.details)).toEqual(['lng', 'lat']);
  });
});
