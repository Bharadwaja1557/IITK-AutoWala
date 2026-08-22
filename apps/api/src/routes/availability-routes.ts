import { Router } from 'express';
import { declareAvailabilitySchema, type AvailabilityStatus } from '@iitk-autowala/shared';
import { parseOrThrow } from '../http/validate.js';
import { getAuthedDriver, requireAuth } from '../middleware/require-auth.js';
import {
  declareAvailability,
  endAvailability,
  getLiveSession,
  toSessionView,
} from '../services/availability-service.js';

export const availabilityRouter = Router();

// Every route here is scoped to the caller. The driver id comes from the
// verified token, never from the request — there is no route in this API that
// takes a driver id as input.
availabilityRouter.use(requireAuth);

availabilityRouter.get('/', async (req, res) => {
  const driver = getAuthedDriver(req);
  const session = await getLiveSession(driver._id.toString());

  const body: AvailabilityStatus = {
    available: session !== null,
    session: session ? toSessionView(session) : null,
  };
  res.json(body);
});

availabilityRouter.post('/', async (req, res) => {
  const driver = getAuthedDriver(req);
  const input = parseOrThrow(declareAvailabilitySchema, req.body);
  const session = await declareAvailability(driver._id.toString(), input);

  const body: AvailabilityStatus = { available: true, session: toSessionView(session) };
  res.status(201).json(body);
});

availabilityRouter.delete('/', async (req, res) => {
  const driver = getAuthedDriver(req);
  await endAvailability(driver._id.toString());

  const body: AvailabilityStatus = { available: false, session: null };
  res.json(body);
});
