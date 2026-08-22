import type { HydratedDocument } from 'mongoose';
import type { DriverDoc } from '../models/driver.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Absent everywhere else — use getAuthedDriver(). */
      driver?: HydratedDocument<DriverDoc>;
    }
  }
}

export {};
