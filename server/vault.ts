import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './paths';

/**
 * Password vault: keeps an AES-256-GCM encrypted copy of each user's CURRENT password so
 * Admins can reveal it on the Team page. Sign-in itself still checks the bcrypt hash.
 *
 * Key: PASSWORD_VAULT_KEY in .env (64 hex chars), otherwise a random key generated once and
 * saved to data/.vault-key. Keep that file — without it, stored passwords can't be revealed
 * (sign-in keeps working; Admins can just set new passwords).
 *
 * PASSWORD_VAULT_OLD_KEYS (optional, comma-separated): keys used earlier, e.g. the
 * data/.vault-key from your PC after moving the data to a server. Passwords saved with
 * any of them can still be shown.
 */
const KEY_FILE = path.join(DATA_DIR, '.vault-key');
let cachedKey: Buffer | null = null;
/** Key shared through the database — the same for every server process and every redeploy. */
let sharedKey: Buffer | null = null;

export function envVaultKey(): string | null {
  const fromEnv = (process.env.PASSWORD_VAULT_KEY || '').trim();
  return /^[0-9a-f]{64}$/i.test(fromEnv) ? fromEnv.toLowerCase() : null;
}

/** Called once the database is connected (see db.init). */
export function setSharedVaultKey(hex: string): void {
  if (/^[0-9a-f]{64}$/i.test(hex)) sharedKey = Buffer.from(hex, 'hex');
}

export function newVaultKeyHex(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getKey(): Buffer {
  const fromEnv = envVaultKey();
  if (fromEnv) return Buffer.from(fromEnv, 'hex');
  if (sharedKey) return sharedKey;
  if (cachedKey) return cachedKey;
  try {
    const fromFile = fs.readFileSync(KEY_FILE, 'utf8').trim();
    if (/^[0-9a-f]{64}$/i.test(fromFile)) {
      cachedKey = Buffer.from(fromFile, 'hex');
      return cachedKey;
    }
  } catch {
    // no key file yet
  }
  const key = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, key.toString('hex'), { mode: 0o600 });
  cachedKey = key;
  return key;
}

export function encryptPassword(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/** Every key that may have been used to save a password: current first, then older ones. */
function allKeys(): Buffer[] {
  const keys: Buffer[] = [getKey()];
  if (sharedKey && !keys.some(k => k.equals(sharedKey!))) keys.push(sharedKey);
  const add = (hex: string) => {
    const h = hex.trim();
    if (/^[0-9a-f]{64}$/i.test(h) && !keys.some(k => k.toString('hex') === h.toLowerCase())) {
      keys.push(Buffer.from(h, 'hex'));
    }
  };
  (process.env.PASSWORD_VAULT_OLD_KEYS || '').split(/[\s,;]+/).forEach(add);
  try { add(fs.readFileSync(KEY_FILE, 'utf8')); } catch { /* no key file */ }
  return keys;
}

export function decryptPassword(stored: string | null | undefined): string | null {
  if (!stored || !stored.startsWith('v1:')) return null;
  const [, ivB64, tagB64, ctB64] = stored.split(':');
  for (const key of allKeys()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      // not this key — try the next one
    }
  }
  return null; // saved with a key we don't have
}
