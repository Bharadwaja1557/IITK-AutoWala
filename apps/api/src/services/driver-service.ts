import type { HydratedDocument } from 'mongoose';
import type { z } from 'zod';
import type { DriverProfile, registerSchema } from '@iitk-autowala/shared';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { ApiError } from '../http/api-error.js';
import { Driver, type DriverDoc } from '../models/driver.js';

type RegisterPayload = z.output<typeof registerSchema>;

function isDuplicateKeyError(error: unknown): error is { keyPattern?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export function toDriverProfile(driver: DriverDoc): DriverProfile {
  return {
    id: driver._id.toString(),
    name: driver.name,
    phone: driver.phone,
    vehicleNumber: driver.vehicleNumber,
    vehicleType: driver.vehicleType,
  };
}

export async function registerDriver(
  payload: RegisterPayload,
): Promise<HydratedDocument<DriverDoc>> {
  const passwordHash = await hashPassword(payload.password);

  try {
    return await Driver.create({
      name: payload.name,
      phone: payload.phone,
      vehicleNumber: payload.vehicleNumber,
      vehicleType: payload.vehicleType,
      passwordHash,
      role: 'driver',
    });
  } catch (error) {
    // Checking for an existing driver first and then inserting would still
    // race; the unique indexes are the actual guarantee, so the duplicate-key
    // error is the thing worth translating.
    if (isDuplicateKeyError(error)) {
      const field = Object.keys(error.keyPattern ?? {})[0];
      if (field === 'phone') {
        throw ApiError.conflict('That phone number is already registered.', {
          phone: 'Already registered. Sign in instead.',
        });
      }
      if (field === 'vehicleNumber') {
        throw ApiError.conflict('That vehicle number is already registered.', {
          vehicleNumber: 'Already registered to another account.',
        });
      }
      throw ApiError.conflict('That driver is already registered.');
    }
    throw error;
  }
}

export async function authenticateDriver(
  phone: string,
  password: string,
): Promise<HydratedDocument<DriverDoc>> {
  const driver = await Driver.findOne({ phone }).select('+passwordHash');

  // Same message either way: whether a number is registered is not something
  // an unauthenticated caller should be able to ask.
  if (!driver) throw ApiError.unauthorized('Wrong phone number or password.');

  const matches = await verifyPassword(password, driver.passwordHash);
  if (!matches) throw ApiError.unauthorized('Wrong phone number or password.');

  return driver;
}
