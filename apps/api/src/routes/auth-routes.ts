import { Router } from 'express';
import { loginSchema, registerSchema, type AuthResponse, type DriverProfile } from '@iitk-autowala/shared';
import { signToken } from '../auth/tokens.js';
import { parseOrThrow } from '../http/validate.js';
import { getAuthedDriver, requireAuth } from '../middleware/require-auth.js';
import { authenticateDriver, registerDriver, toDriverProfile } from '../services/driver-service.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const payload = parseOrThrow(registerSchema, req.body);
  const driver = await registerDriver(payload);

  const body: AuthResponse = {
    token: signToken(driver._id.toString()),
    driver: toDriverProfile(driver),
  };
  res.status(201).json(body);
});

authRouter.post('/login', async (req, res) => {
  const payload = parseOrThrow(loginSchema, req.body);
  const driver = await authenticateDriver(payload.phone, payload.password);

  const body: AuthResponse = {
    token: signToken(driver._id.toString()),
    driver: toDriverProfile(driver),
  };
  res.json(body);
});

// Lets the client restore a session after a reload without keeping the profile
// in storage next to the token.
authRouter.get('/me', requireAuth, (req, res) => {
  const body: DriverProfile = toDriverProfile(getAuthedDriver(req));
  res.json(body);
});
