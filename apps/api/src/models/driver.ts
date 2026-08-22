import { Schema, model, type Types } from 'mongoose';
import { VEHICLE_TYPES, type VehicleType } from '@iitk-autowala/shared';

export const DRIVER_ROLES = ['driver', 'admin'] as const;
export type DriverRole = (typeof DRIVER_ROLES)[number];

export interface DriverDoc {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  passwordHash: string;
  role: DriverRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permanent record. One document per driver, written at registration and
 * otherwise read-only in this phase.
 *
 * Constraints here are structural only — type, required, unique, enum, ref.
 * Format rules (what a valid phone or plate looks like) live in the Zod schemas
 * in `shared` and are applied at the HTTP boundary. D-04 explains why, and what
 * it costs.
 */
const driverSchema = new Schema<DriverDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    vehicleNumber: { type: String, required: true, unique: true, trim: true },
    vehicleType: { type: String, required: true, enum: VEHICLE_TYPES },
    // Never leaves the database by accident: every query has to ask for it
    // explicitly with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: DRIVER_ROLES, default: 'driver' },
  },
  { timestamps: true },
);

export const Driver = model<DriverDoc>('Driver', driverSchema);
