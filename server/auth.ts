import crypto from 'crypto';
import type { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Cookies (tiny parser — avoids an extra dependency)
// ---------------------------------------------------------------------------
export const SESSION_COOKIE = 'cf_session';
export const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function isSecureRequest(req: Request): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}`,
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req: Request, res: Response) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecureRequest(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

/** Random session token (sent to the browser) and its SHA-256 hash (stored in the DB). */
export function newSessionToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Login rate limiting (in-memory, per IP + identifier)
// ---------------------------------------------------------------------------
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
  } else {
    entry.count++;
  }
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}

// ---------------------------------------------------------------------------
// Google ID token verification (Google Identity Services "Continue with Google")
// Verifies the RS256 signature against Google's published keys — no extra dependency.
// ---------------------------------------------------------------------------
const GOOGLE_CERTS_URL = process.env.GOOGLE_CERTS_URL || 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

let cachedKeys: { keys: Record<string, crypto.KeyObject>; expiresAt: number } | null = null;

async function getGoogleKeys(forceRefresh = false): Promise<Record<string, crypto.KeyObject>> {
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > Date.now()) {
    return cachedKeys.keys;
  }
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error(`Could not fetch Google signing keys (${res.status})`);
  const body = (await res.json()) as { keys: Array<Record<string, any>> };
  const keys: Record<string, crypto.KeyObject> = {};
  for (const jwk of body.keys || []) {
    if (jwk.kid) keys[jwk.kid] = crypto.createPublicKey({ key: jwk as any, format: 'jwk' });
  }
  const maxAgeMatch = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
  cachedKeys = { keys, expiresAt: Date.now() + maxAge };
  return keys;
}

function b64urlDecode(segment: string): Buffer {
  return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export interface GoogleIdentity {
  email: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdentity> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed Google credential');
  const [headerB64, payloadB64, sigB64] = parts;

  let header: any;
  try {
    header = JSON.parse(b64urlDecode(headerB64).toString('utf8'));
  } catch {
    throw new Error('Malformed Google credential');
  }
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Google credential');

  let keys = await getGoogleKeys();
  let key = keys[header.kid];
  if (!key) {
    keys = await getGoogleKeys(true); // Google rotates keys; refresh once
    key = keys[header.kid];
  }
  if (!key) throw new Error('Unknown Google signing key');

  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${headerB64}.${payloadB64}`),
    key,
    b64urlDecode(sigB64)
  );
  if (!valid) throw new Error('Invalid Google credential signature');

  let payload: any;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    throw new Error('Malformed Google credential');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (!GOOGLE_ISSUERS.includes(payload.iss)) throw new Error('Invalid Google credential issuer');
  if (payload.aud !== clientId) throw new Error('Google credential was issued for a different app');
  if (typeof payload.exp !== 'number' || payload.exp < nowSec - 60) throw new Error('Google credential has expired');
  if (!payload.email || (payload.email_verified !== true && payload.email_verified !== 'true')) {
    throw new Error('Google account email is not verified');
  }

  return {
    email: String(payload.email).toLowerCase(),
    name: payload.name,
    picture: payload.picture,
  };
}
