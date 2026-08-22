/**
 * MongoDB reports a unique-index violation as error code 11000 with a
 * `keyPattern` naming the offending index. Checking for an existing row before
 * inserting would still race, so the index is the real guarantee and this is
 * how the guarantee gets translated into an HTTP response.
 */
export function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}
