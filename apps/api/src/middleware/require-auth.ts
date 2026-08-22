import type { NextFunction, Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { verifyToken } from '../auth/tokens.js';
import { ApiError } from '../http/api-error.js';
import { Driver, type DriverDoc } from '../models/driver.js';

/**
 * Rejects the request unless it carries a valid bearer token for a driver that
 * still exists, and attaches that driver.
 *
 * Every mutating route sits behind this. The identity used by the handlers is
 * always `req.driver._id` — never a phone number or an id from the request
 * body. The previous version of this project let any caller flip any driver's
 * status by knowing their phone number.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Sign in to continue.'));
    return;
  }

  try {
    const driverId = verifyToken(header.slice('Bearer '.length).trim());
    const driver = await Driver.findById(driverId);
    if (!driver) {
      next(ApiError.unauthorized('That account no longer exists.'));
      return;
    }
    req.driver = driver;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Narrows away the optional. If this throws, a route was mounted without
 * requireAuth in front of it — a wiring bug, surfaced as a 401 rather than a
 * crash on undefined.
 */
export function getAuthedDriver(req: Request): HydratedDocument<DriverDoc> {
  if (!req.driver) throw ApiError.unauthorized('Sign in to continue.');
  return req.driver;
}
