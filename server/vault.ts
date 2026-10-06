import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Password vault: keeps an AES-256-GCM encrypted copy of each user's CURRENT password so the
 * Super Admin can reveal it on the Team page. Sign-in itself still checks the bcrypt hash.
 *
 * Key: PASSWORD_VAULT_KEY in .env (64 hex chars), otherwise a random key generated once and
 * saved to data/.vault-key. Keep that file — without it, stored passwords can't be revealed
 * (sign-in keeps working; the Super Admin can just set new passwords).
 */
const KEY_FILE = path.join(process.cwd(), 'data', '.vault-key');
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const fromEnv = (process.env.PASSWORD_VAULT_KEY || '').trim();
  if (/^[0-9a-f]{64}$/i.test(fromEnv)) {
    cachedKey = Buffer.from(fromEnv, 'hex');
    return cachedKey;
  }
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

export function decryptPassword(stored: string | null | undefined): string | null {
  if (!stored || !stored.startsWith('v1:')) return null;
  try {
    const [, ivB64, tagB64, ctB64] = stored.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null; // key changed or data damaged
  }
}
