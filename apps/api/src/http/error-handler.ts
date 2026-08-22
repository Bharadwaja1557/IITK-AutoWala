import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorBody } from '@iitk-autowala/shared';
import { ApiError } from './api-error.js';

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` },
  };
  res.status(404).json(body);
}

/**
 * Express 5 forwards rejected promises from handlers here on its own, which is
 * why no route in this codebase wraps itself in try/catch just to call next().
 *
 * `next` is unused but must stay in the signature — Express identifies error
 * middleware by arity.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  // Unexpected. Log the real thing, tell the client nothing.
  console.error('Unhandled error:', error);
  const body: ApiErrorBody = {
    error: { code: 'INTERNAL', message: 'Something went wrong.' },
  };
  res.status(500).json(body);
}
