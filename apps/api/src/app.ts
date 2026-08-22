import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { authRouter } from './routes/auth-routes.js';
import { availabilityRouter } from './routes/availability-routes.js';

/**
 * Builds the app without binding a port, so Supertest can drive it directly.
 *
 * There is no CORS middleware on purpose: the web client always calls the API
 * on a same-origin `/api` path, proxied by Vite in development and by nginx in
 * the container. D-09.
 */
export function createApp(): Express {
  const app = express();

  // Every request body in this API is a small JSON object; the cap keeps a
  // large upload from being parsed before anything rejects it.
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/availability', availabilityRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
