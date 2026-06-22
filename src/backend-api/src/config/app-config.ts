import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtExpiresInSeconds: number;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

let environmentLoaded = false;

function loadEnvironmentFile() {
  if (environmentLoaded) {
    return;
  }

  const envPath = resolve(__dirname, '..', '..', '.env');
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }

  environmentLoaded = true;
}

export function loadConfig(): AppConfig {
  loadEnvironmentFile();

  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtIssuer = process.env.JWT_ISSUER ?? 'ticketbox-backend';
  const jwtExpiresInSeconds = Number(
    process.env.JWT_EXPIRES_IN_SECONDS ?? '3600',
  );

  const missing = [
    ['DATABASE_URL', databaseUrl],
    ['JWT_SECRET', jwtSecret],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  if (!jwtIssuer.trim()) {
    throw new Error('JWT_ISSUER must not be empty');
  }

  if (!Number.isInteger(jwtExpiresInSeconds) || jwtExpiresInSeconds <= 0) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be a positive integer');
  }

  return {
    databaseUrl: databaseUrl as string,
    jwtSecret: jwtSecret as string,
    jwtIssuer,
    jwtExpiresInSeconds,
  };
}
