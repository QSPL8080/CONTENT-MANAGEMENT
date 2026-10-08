import fs from 'fs';
import type { PoolConfig } from 'pg';

/**
 * Connection settings for PostgreSQL — works for a local database (no SSL) and for
 * hosted ones such as Supabase (SSL required).
 *
 *   DATABASE_SSL     auto (default) | true | false
 *                    auto = SSL for any host that is not localhost / 127.0.0.1
 *   DATABASE_SSL_CA  optional path to the provider's CA certificate (Supabase:
 *                    Project Settings → Database → SSL → Download certificate).
 *                    When set, the server certificate is fully verified.
 *   DB_POOL_MAX      max connections this app opens (default 10; use 5 on Supabase)
 */
export function isLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return ['localhost', '127.0.0.1', '::1', ''].includes(host);
  } catch {
    return true;
  }
}

export function usesSsl(url: string): boolean {
  const mode = String(process.env.DATABASE_SSL || 'auto').toLowerCase();
  if (['false', 'disable', 'off', '0', 'no'].includes(mode)) return false;
  if (['true', 'require', 'on', '1', 'yes'].includes(mode)) return true;
  return !isLocalDatabase(url);
}

export function pgConnectionConfig(url: string): PoolConfig {
  let connectionString = url;
  // sslmode=... inside the URL would override the ssl settings below, so drop it.
  try {
    const u = new URL(url);
    ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'].forEach(k => u.searchParams.delete(k));
    connectionString = u.toString();
  } catch { /* unusual URL — use as given */ }

  const config: PoolConfig = { connectionString };
  if (usesSsl(url)) {
    const caPath = process.env.DATABASE_SSL_CA;
    config.ssl = caPath && fs.existsSync(caPath)
      ? { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true }
      : { rejectUnauthorized: false }; // encrypted; certificate not pinned
  }
  return config;
}
