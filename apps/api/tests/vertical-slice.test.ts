import request from 'supertest';
import {
  LANDMARKS_BY_ID,
  type AuthResponse,
  type AvailabilityStatus,
  type NearbyResponse,
} from '@iitk-autowala/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

const REGISTRATION = {
  name: 'Ashok Verma',
  phone: '9876500001',
  vehicleNumber: 'up78ab1234',
  vehicleType: 'auto',
  password: 'a-long-enough-password',
};

async function registerDriver(): Promise<AuthResponse> {
  const response = await request(app).post('/api/auth/register').send(REGISTRATION).expect(201);
  return response.body as AuthResponse;
}

describe('the phase 1 path: register, sign in, declare, be discovered', () => {
  it('carries a driver from registration to a rider result ranked by distance', async () => {
    const registered = await registerDriver();
    // The plate was sent lowercase and hyphen-free; storage normalises it.
    expect(registered.driver.vehicleNumber).toBe('UP 78 AB 1234');

    const signedIn = await request(app)
      .post('/api/auth/login')
      .send({ phone: REGISTRATION.phone, password: REGISTRATION.password })
      .expect(200);
    const { token } = signedIn.body as AuthResponse;

    const declared = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'landmark', landmarkId: 'hall-2' })
      .expect(201);
    const status = declared.body as AvailabilityStatus;

    expect(status.available).toBe(true);
    expect(status.session?.landmarkName).toBe('Hall 2');
    expect(new Date(status.session?.expiresAt ?? 0).getTime()).toBeGreaterThan(Date.now());

    const origin = LANDMARKS_BY_ID['shopping-centre'].coordinates;
    const nearby = await request(app)
      .get('/api/drivers/nearby')
      .query({ lng: origin[0], lat: origin[1] })
      .expect(200);
    const body = nearby.body as NearbyResponse;

    expect(body.drivers).toHaveLength(1);
    expect(body.drivers[0]?.name).toBe('Ashok Verma');
    expect(body.drivers[0]?.landmarkName).toBe('Hall 2');
    expect(body.drivers[0]?.vehicleType).toBe('auto');
    expect(body.drivers[0]?.distanceMeters).toBeGreaterThan(0);
  });

  it('never exposes a password hash', async () => {
    const registered = await registerDriver();
    expect(JSON.stringify(registered)).not.toContain('$2');

    await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${registered.token}`)
      .send({ source: 'landmark', landmarkId: 'hall-2' })
      .expect(201);

    const origin = LANDMARKS_BY_ID['hall-2'].coordinates;
    const nearby = await request(app)
      .get('/api/drivers/nearby')
      .query({ lng: origin[0], lat: origin[1] })
      .expect(200);

    // The $lookup projects explicitly because Mongoose's select:false does not
    // apply inside an aggregation pipeline.
    expect(JSON.stringify(nearby.body)).not.toContain('passwordHash');
    expect(JSON.stringify(nearby.body)).not.toContain('$2');
  });

  it('replaces the previous session instead of adding a second one', async () => {
    const registered = await registerDriver();
    const auth = `Bearer ${registered.token}`;

    await request(app)
      .post('/api/availability')
      .set('Authorization', auth)
      .send({ source: 'landmark', landmarkId: 'hall-2' })
      .expect(201);
    await request(app)
      .post('/api/availability')
      .set('Authorization', auth)
      .send({ source: 'landmark', landmarkId: 'main-gate' })
      .expect(201);

    const origin = LANDMARKS_BY_ID['shopping-centre'].coordinates;
    const nearby = await request(app)
      .get('/api/drivers/nearby')
      .query({ lng: origin[0], lat: origin[1] })
      .expect(200);
    const body = nearby.body as NearbyResponse;

    expect(body.drivers).toHaveLength(1);
    expect(body.drivers[0]?.landmarkName).toBe('Main Gate');
  });

  it('drops the driver from results after going off duty', async () => {
    const registered = await registerDriver();
    const auth = `Bearer ${registered.token}`;

    await request(app)
      .post('/api/availability')
      .set('Authorization', auth)
      .send({ source: 'landmark', landmarkId: 'hall-2' })
      .expect(201);
    await request(app).delete('/api/availability').set('Authorization', auth).expect(200);

    const status = await request(app)
      .get('/api/availability')
      .set('Authorization', auth)
      .expect(200);
    expect((status.body as AvailabilityStatus).available).toBe(false);

    const origin = LANDMARKS_BY_ID['hall-2'].coordinates;
    const nearby = await request(app)
      .get('/api/drivers/nearby')
      .query({ lng: origin[0], lat: origin[1] })
      .expect(200);
    expect((nearby.body as NearbyResponse).drivers).toHaveLength(0);
  });
});

describe('authorisation', () => {
  it('refuses to declare availability without a token', async () => {
    const response = await request(app)
      .post('/api/availability')
      .send({ source: 'landmark', landmarkId: 'hall-2' })
      .expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('refuses a forged token', async () => {
    await request(app)
      .post('/api/availability')
      .set('Authorization', 'Bearer not.a.real.token')
      .send({ source: 'landmark', landmarkId: 'hall-2' })
      .expect(401);
  });

  it('has no route that accepts a driver id, so one driver cannot move another', async () => {
    const victim = await registerDriver();
    const attacker = await request(app)
      .post('/api/auth/register')
      .send({ ...REGISTRATION, phone: '9876500002', vehicleNumber: 'UP 78 CD 5678' })
      .expect(201);
    const attackerAuth = `Bearer ${(attacker.body as AuthResponse).token}`;

    // The old version identified a driver by a phone number in the body. Here
    // the extra fields are simply not read: the session that gets written is
    // the attacker's own, and the victim stays undiscoverable.
    await request(app)
      .post('/api/availability')
      .set('Authorization', attackerAuth)
      .send({
        source: 'landmark',
        landmarkId: 'main-gate',
        driverId: victim.driver.id,
        phone: victim.driver.phone,
      })
      .expect(201);

    const origin = LANDMARKS_BY_ID['main-gate'].coordinates;
    const nearby = await request(app)
      .get('/api/drivers/nearby')
      .query({ lng: origin[0], lat: origin[1] })
      .expect(200);
    const body = nearby.body as NearbyResponse;

    expect(body.drivers).toHaveLength(1);
    expect(body.drivers[0]?.driverId).toBe((attacker.body as AuthResponse).driver.id);
  });

  it('rejects a second registration on the same phone number', async () => {
    await registerDriver();
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...REGISTRATION, vehicleNumber: 'UP 78 EF 9012' })
      .expect(409);
    expect(response.body.error.details.phone).toBeTruthy();
  });

  it('cannot sign in to a seeded demo account, because the number is not a valid mobile', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ phone: '5550100001', password: 'anything-at-all' })
      .expect(400);
    expect(response.body.error.details.phone).toContain('6, 7, 8 or 9');
  });
});
