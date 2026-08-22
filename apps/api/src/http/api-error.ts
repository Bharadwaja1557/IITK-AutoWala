/**
 * Every failure the API reports on purpose is one of these. Anything else that
 * reaches the error handler is a bug and becomes a 500 with no detail.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, string> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: Record<string, string>): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message: string): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static conflict(message: string, details?: Record<string, string>): ApiError {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }
}
