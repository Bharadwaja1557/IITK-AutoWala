import { Router } from 'express';
import { nearbyQuerySchema, type NearbyResponse } from '@iitk-autowala/shared';
import { env } from '../config/env.js';
import { ensureDemoData } from '../demo/seed.js';
import { parseOrThrow } from '../http/validate.js';
import { findNearbyDrivers } from '../services/discovery-service.js';

export const discoveryRouter = Router();

/**
 * Public. Riders have no accounts in v1 — requiring one would mean every
 * student registers before they can find out whether an auto exists, which is
 * the friction the whole thing is trying to remove.
 */
discoveryRouter.get('/nearby', async (req, res) => {
  const query = parseOrThrow(nearbyQuerySchema, req.query);
  const radiusMeters = query.radiusMeters ?? env.DEFAULT_SEARCH_RADIUS_METERS;

  const search = {
    lng: query.lng,
    lat: query.lat,
    radiusMeters,
    limit: env.MAX_NEARBY_RESULTS,
  };

  let drivers = await findNearbyDrivers(search);

  // Self-healing demo: seeded sessions expire like real ones, so a deployment
  // left alone for longer than the TTL would show an empty screen and read as
  // broken rather than as quiet. Rather than run a scheduler, the first rider
  // to find nothing re-seeds. Concurrent callers share one seed via the
  // in-flight promise in ensureDemoData. D-11 — note this makes a GET write.
  if (drivers.length === 0 && env.DEMO_MODE) {
    await ensureDemoData();
    drivers = await findNearbyDrivers(search);
  }

  const body: NearbyResponse = {
    origin: { lng: query.lng, lat: query.lat },
    radiusMeters,
    drivers,
  };
  res.json(body);
});
