import { z } from 'zod';
import { CAMPUS_LANDMARK_IDS } from './landmarks.js';
import { VEHICLE_TYPES, type VehicleType } from './vehicle.js';

/**
 * Format validation lives here and only here — at the HTTP boundary, never on
 * the Mongoose path. See D-04.
 *
 * The consequence that matters: the seed script writes phone numbers that are
 * deliberately not dialable (`55501xxxxx`), and they are rejected by this regex
 * by construction. A seeded number can never be someone's real line, and it can
 * never be logged into either, because login runs through the same schema.
 */
export const indianMobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'must be a 10-digit Indian mobile number starting 6, 7, 8 or 9');

/**
 * Plates are normalised to `UP 78 AB 1234` before storage so that uniqueness is
 * about the vehicle rather than about how someone typed the spaces.
 */
export const vehicleNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/, 'must look like UP 78 AB 1234'),
  )
  .transform((compact) => {
    const parts = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/.exec(compact);
    // The pipe above guarantees a match; this branch exists so the types work
    // out without an assertion.
    if (!parts) return compact;
    return `${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}`;
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'name is too short').max(60, 'name is too long'),
  phone: indianMobileSchema,
  vehicleNumber: vehicleNumberSchema,
  vehicleType: z.enum(VEHICLE_TYPES),
  password: z
    .string()
    .min(8, 'password must be at least 8 characters')
    .max(128, 'password must be at most 128 characters'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  phone: indianMobileSchema,
  password: z.string().min(1, 'password is required'),
});
export type LoginInput = z.input<typeof loginSchema>;

/**
 * A driver either picks a campus landmark or lets the browser resolve their
 * position once. Both end up as a GeoJSON Point; the landmark id is kept
 * alongside so the rider list can say "at Hall 5" instead of a decimal pair.
 */
export const declareAvailabilitySchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('landmark'),
    landmarkId: z.enum(CAMPUS_LANDMARK_IDS),
  }),
  z.object({
    source: z.literal('device'),
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
  }),
]);
export type DeclareAvailabilityInput = z.infer<typeof declareAvailabilitySchema>;

/** Query strings arrive as strings, hence the coercion. */
export const nearbyQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  radiusMeters: z.coerce.number().int().positive().max(50_000).optional(),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
}

export interface AuthResponse {
  token: string;
  driver: DriverProfile;
}

export interface AvailabilitySessionView {
  id: string;
  /** null when the position came from the device rather than the picker. */
  landmarkId: string | null;
  landmarkName: string | null;
  lng: number;
  lat: number;
  declaredAt: string;
  expiresAt: string;
}

export interface AvailabilityStatus {
  available: boolean;
  session: AvailabilitySessionView | null;
}

export interface NearbyDriver {
  driverId: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  landmarkId: string | null;
  landmarkName: string | null;
  /** Great-circle metres from the rider's origin, computed by $geoNear. */
  distanceMeters: number;
  declaredAt: string;
  expiresAt: string;
}

export interface NearbyResponse {
  origin: { lng: number; lat: number };
  radiusMeters: number;
  drivers: NearbyDriver[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-level messages from Zod, keyed by dotted path. */
    details?: Record<string, string>;
  };
}
