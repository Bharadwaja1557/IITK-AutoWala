import type {
  ApiErrorBody,
  AuthResponse,
  AvailabilityStatus,
  DeclareAvailabilityInput,
  DriverProfile,
  LoginInput,
  NearbyResponse,
  RegisterInput,
} from '@iitk-autowala/shared';

const TOKEN_KEY = 'iitk-autowala.token';

/**
 * A failure the API described on purpose. `details` is keyed by field name, so
 * a form can put each message next to the input it belongs to.
 */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly details: Record<string, string>;

  constructor(code: string, message: string, details: Record<string, string>) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.details = details;
  }
}

export function readToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string | null): void {
  if (token === null) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

// Always same-origin: Vite proxies /api in development, nginx proxies it in the
// container. There is no API base URL to configure. D-08.
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  if (options.auth) {
    const token = readToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = payload as ApiErrorBody | null;
    throw new ApiRequestError(
      body?.error.code ?? 'NETWORK',
      body?.error.message ?? `Request failed (${response.status}).`,
      body?.error.details ?? {},
    );
  }

  return payload as T;
}

export function registerDriver(input: RegisterInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', { method: 'POST', body: input });
}

export function signIn(input: LoginInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: input });
}

export function fetchProfile(): Promise<DriverProfile> {
  return request<DriverProfile>('/auth/me', { auth: true });
}

export function fetchAvailability(): Promise<AvailabilityStatus> {
  return request<AvailabilityStatus>('/availability', { auth: true });
}

export function declareAvailability(
  input: DeclareAvailabilityInput,
): Promise<AvailabilityStatus> {
  return request<AvailabilityStatus>('/availability', {
    method: 'POST',
    body: input,
    auth: true,
  });
}

export function endAvailability(): Promise<AvailabilityStatus> {
  return request<AvailabilityStatus>('/availability', { method: 'DELETE', auth: true });
}

export function fetchNearby(lng: number, lat: number): Promise<NearbyResponse> {
  const query = new URLSearchParams({ lng: String(lng), lat: String(lat) });
  return request<NearbyResponse>(`/drivers/nearby?${query.toString()}`);
}
