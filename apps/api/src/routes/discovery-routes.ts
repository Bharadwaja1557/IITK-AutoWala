import { Router } from 'express';
import { nearbyQuerySchema, type NearbyResponse } from '@iitk-autowala/shared';
import { env } from '../config/env.js';
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

  const drivers = await findNearbyDrivers({
    lng: query.lng,
    lat: query.lat,
    radiusMeters,
    limit: env.MAX_NEARBY_RESULTS,
  });

  const body: NearbyResponse = {
    origin: { lng: query.lng, lat: query.lat },
    radiusMeters,
    drivers,
  };
  res.json(body);
});
