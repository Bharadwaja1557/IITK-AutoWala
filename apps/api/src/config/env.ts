import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Walk up from the working directory looking for a `.env`.
 *
 * The API is normally started from `apps/api` (npm workspace scripts set the
 * cwd there) but the single source of configuration lives at the repo root.
 * Rather than hardcode `../../.env` — which breaks the moment the file is run
 * from `dist/` or from the repo root directly — we search upwards.
 *
 * Under Docker there is no `.env` at all; compose injects the variables and
 * this returns null, which is fine.
 */
function findEnvFile(startDir: string): string | null {
  let dir = startDir;
  for (;;) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const envFile = findEnvFile(process.cwd());
if (envFile) dotenv.config({ path: envFile });

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z
    .string()
    .min(1, 'must be a MongoDB connection string, e.g. mongodb://127.0.0.1:27017/iitk-autowala'),

  JWT_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters — generate one with `openssl rand -base64 48`'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  AVAILABILITY_TTL_MINUTES: z.coerce.number().int().positive().max(720).default(45),
  DEFAULT_SEARCH_RADIUS_METERS: z.coerce.number().int().positive().max(50_000).default(5_000),
  MAX_NEARBY_RESULTS: z.coerce.number().int().positive().max(100).default(20),

  DEMO_MODE: booleanFromString.default('true'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const key = issue.path.join('.');
      return `  ${key}: ${issue.message}`;
    });

    console.error(
      [
        '',
        'Configuration error — the API cannot start.',
        '',
        ...lines,
        '',
        `Checked ${envFile ?? 'process environment only (no .env file found)'}.`,
        'See .env.example for every key, its meaning, and a working local default.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
