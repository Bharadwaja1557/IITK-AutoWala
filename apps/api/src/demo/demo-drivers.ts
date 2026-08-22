import type { LandmarkId, VehicleType } from '@iitk-autowala/shared';

export interface DemoDriver {
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  landmarkId: LandmarkId;
  /** How long ago this driver "tapped available", so the list shows a spread. */
  declaredMinutesAgo: number;
}

/**
 * Entirely invented people.
 *
 * Phone numbers all begin `55501`. Indian mobile numbers begin 6, 7, 8 or 9, so
 * nothing here can be dialled and nothing here can collide with a real line —
 * the same idea as 555 numbers in American films. The Zod schema in `shared`
 * enforces `^[6-9]\d{9}$` on every registration and login, which means these
 * rows are rejected by the API's own validator: a seeded account cannot be
 * signed into, and a seeded number cannot be re-registered by a real person.
 *
 * Vehicle numbers use a four-letter series (`DEMO`), which no Indian plate has
 * — the plate schema allows at most three — so they fail the same way, on
 * purpose.
 *
 * This file is the only place in the repo that writes to the database without
 * passing through those schemas. D-04 explains why that is allowed here and
 * what it costs.
 */
export const DEMO_DRIVERS: readonly DemoDriver[] = [
  {
    name: 'Shivram Bhalke',
    phone: '5550100001',
    vehicleNumber: 'UP 78 DEMO 0001',
    vehicleType: 'auto',
    landmarkId: 'hall-2',
    declaredMinutesAgo: 1,
  },
  {
    name: 'Anil Kushwaha',
    phone: '5550100002',
    vehicleNumber: 'UP 78 DEMO 0002',
    vehicleType: 'auto',
    landmarkId: 'shopping-centre',
    declaredMinutesAgo: 3,
  },
  {
    name: 'Sarita Devi',
    phone: '5550100003',
    vehicleNumber: 'UP 78 DEMO 0003',
    vehicleType: 'e-rickshaw',
    landmarkId: 'gh-tower',
    declaredMinutesAgo: 5,
  },
  {
    name: 'Dinesh Rathaur',
    phone: '5550100004',
    vehicleNumber: 'UP 78 DEMO 0004',
    vehicleType: 'auto',
    landmarkId: 'main-gate',
    declaredMinutesAgo: 8,
  },
  {
    name: 'Munna Prajapati',
    phone: '5550100005',
    vehicleNumber: 'UP 78 DEMO 0005',
    vehicleType: 'e-rickshaw',
    landmarkId: 'lecture-hall-complex',
    declaredMinutesAgo: 12,
  },
  {
    name: 'Rakesh Nishad',
    phone: '5550100006',
    vehicleNumber: 'UP 78 DEMO 0006',
    vehicleType: 'auto',
    landmarkId: 'hall-12',
    declaredMinutesAgo: 15,
  },
  {
    name: 'Farhan Qureshi',
    phone: '5550100007',
    vehicleNumber: 'UP 78 DEMO 0007',
    vehicleType: 'auto',
    landmarkId: 'health-centre',
    declaredMinutesAgo: 19,
  },
  {
    name: 'Vikram Sonkar',
    phone: '5550100008',
    vehicleNumber: 'UP 78 DEMO 0008',
    vehicleType: 'e-rickshaw',
    landmarkId: 'new-sac',
    declaredMinutesAgo: 24,
  },
  {
    name: 'Jitendra Pal',
    phone: '5550100009',
    vehicleNumber: 'UP 78 DEMO 0009',
    vehicleType: 'auto',
    landmarkId: 'pk-kelkar-library',
    declaredMinutesAgo: 28,
  },
  {
    name: 'Golu Tiwari',
    phone: '5550100010',
    vehicleNumber: 'UP 78 DEMO 0010',
    vehicleType: 'auto',
    landmarkId: 'hall-5',
    declaredMinutesAgo: 33,
  },
];
