import type { ZodTypeAny, z } from 'zod';
import { ApiError } from './api-error.js';

/**
 * Parse a request payload with a shared Zod schema, or fail as a 400 carrying
 * one message per bad field. The client renders `details` directly next to the
 * inputs, which is why the keys are the dotted field paths.
 */
export function parseOrThrow<T extends ZodTypeAny>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const details: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    // First message per field wins; later ones are usually consequences.
    if (!(key in details)) details[key] = issue.message;
  }

  throw ApiError.badRequest('Some fields did not pass validation.', details);
}
