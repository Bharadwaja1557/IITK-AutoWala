import { Schema, model, type Types } from 'mongoose';

export interface GeoPoint {
  type: 'Point';
  /** GeoJSON order: [longitude, latitude]. */
  coordinates: [number, number];
}

export interface AvailabilitySessionDoc {
  _id: Types.ObjectId;
  driverId: Types.ObjectId;
  /** The landmark the driver picked, or null if the position came from the device. */
  landmarkId: string | null;
  location: GeoPoint;
  declaredAt: Date;
  expiresAt: Date;
}

const pointSchema = new Schema<GeoPoint>(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

/**
 * Ephemeral record. One document per "I'm available" tap; it dies on its own.
 *
 * Kept separate from `drivers` rather than as fields on the driver document —
 * see D-05. The short version: a TTL index deletes whole documents, and the
 * geo index should cover only the handful of drivers currently live, not the
 * entire roster.
 */
const availabilitySessionSchema = new Schema<AvailabilitySessionDoc>({
  // Unique: a driver has one current position, and declaring again moves it
  // rather than adding a second. See D-09.
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, unique: true },
  landmarkId: { type: String, default: null },
  location: { type: pointSchema, required: true },
  declaredAt: { type: Date, required: true, default: () => new Date() },
  expiresAt: { type: Date, required: true },
});

// Required by $geoNear. Without it the aggregation does not fall back to a
// slower plan, it errors.
availabilitySessionSchema.index({ location: '2dsphere' });

// TTL: MongoDB deletes a document once `expiresAt` is in the past.
//
// IMPORTANT, and the reason every read in this codebase also filters on
// expiresAt: the TTL monitor wakes roughly once every 60 seconds, and deletion
// of a large batch takes longer still. So an expired session can be sitting in
// the collection, fully indexed and matchable, for up to a minute after it
// should have vanished.
//
// The index is for cleanup. The filter is for correctness. Neither substitutes
// for the other.
availabilitySessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// `unique: true` on driverId already builds the index that serves "does this
// driver have a live session"; expiresAt is filtered from it rather than
// indexed alongside, because there is at most one document per driver.

export const AvailabilitySession = model<AvailabilitySessionDoc>(
  'AvailabilitySession',
  availabilitySessionSchema,
);
