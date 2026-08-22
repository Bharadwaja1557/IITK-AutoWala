import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../http/api-error.js';

/**
 * The token says who, and nothing else. Authorisation facts — role, whether the
 * account still exists — are read from the database on each request, so
 * revoking access takes effect immediately instead of at token expiry. D-06.
 */
export function signToken(driverId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: driverId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): string {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    // Expired, wrong signature, malformed — the client can do nothing
    // different about any of them, so they collapse into one message.
    throw ApiError.unauthorized('Your session is not valid. Sign in again.');
  }

  if (typeof payload === 'string' || !payload.sub) {
    throw ApiError.unauthorized('Your session is not valid. Sign in again.');
  }

  return payload.sub;
}
