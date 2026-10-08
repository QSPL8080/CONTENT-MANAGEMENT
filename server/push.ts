import webpush from 'web-push';
import type { Pool } from 'pg';

/**
 * Web Push: desktop pop-ups (bottom-right on Windows) that arrive even when ContentOps is
 * not open — Chrome only needs to be running (it can be minimised or in the background).
 *
 * Each browser that allows notifications registers a "push subscription" for the signed-in
 * person. The server sends pop-ups to those subscriptions; the browser's service worker
 * (public/sw.js) shows them. Keys (VAPID) are created once and kept in the database.
 */

let ready = false;
let publicKey = '';

export function pushPublicKey(): string {
  return publicKey;
}

export async function initPush(pool: Pool): Promise<void> {
  try {
    const { rows } = await pool.query('SELECT vapid_public, vapid_private FROM settings ORDER BY id LIMIT 1');
    if (!rows[0]?.vapid_public || !rows[0]?.vapid_private) {
      const keys = webpush.generateVAPIDKeys();
      await pool.query(
        `UPDATE settings SET vapid_public = $1, vapid_private = $2
          WHERE id = (SELECT MIN(id) FROM settings) AND vapid_public IS NULL`,
        [keys.publicKey, keys.privateKey]
      );
    }
    const { rows: k } = await pool.query(
      'SELECT vapid_public, vapid_private FROM settings WHERE vapid_public IS NOT NULL ORDER BY id LIMIT 1'
    );
    if (!k[0]) return;
    const contact = process.env.SMTP_USER || 'admin@quickuppsoftech.com';
    webpush.setVapidDetails(`mailto:${contact}`, k[0].vapid_public, k[0].vapid_private);
    publicKey = k[0].vapid_public;
    ready = true;
  } catch (err: any) {
    console.warn(`⚠️  Desktop push pop-ups unavailable: ${err.message}`);
  }
}

export async function saveSubscription(
  pool: Pool,
  userId: string,
  sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
): Promise<boolean> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return false;
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [sub.endpoint, userId, sub.keys.p256dh, sub.keys.auth]
  );
  return true;
}

export async function removeSubscription(pool: Pool, endpoint: string): Promise<void> {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  contentId?: string | null;
  /** true: stays on screen until clicked. false: disappears by itself. */
  persistent?: boolean;
}

/** Sends to every browser of the given (active) users. Never throws; runs in the background. */
export function pushToUsers(pool: Pool, userIds: string[], payload: PushPayload): void {
  if (!ready) return;
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  (async () => {
    const { rows } = await pool.query(
      `SELECT s.endpoint, s.p256dh, s.auth FROM push_subscriptions s
         JOIN users u ON u.id = s.user_id
        WHERE s.user_id = ANY($1::text[]) AND u.status = 'active'`,
      [ids]
    );
    await Promise.all(rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 } // delivered within 24 h if the computer is offline now
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await removeSubscription(pool, r.endpoint).catch(() => {}); // browser unsubscribed
        } else {
          console.warn(`⚠️  Push pop-up failed: ${err?.statusCode || ''} ${err?.message || err}`);
        }
      }
    }));
  })().catch(err => console.warn(`⚠️  Push pop-ups skipped: ${err.message}`));
}

/** Title shown on the Admin's pop-up for each kind of activity. */
export const ACTIVITY_TITLES: Record<string, string> = {
  created_content: '🆕 New task created',
  reassigned_creator: '👤 Task assigned',
  reassigned_poster: '👤 Intern assigned',
  status_changed: '🔄 Status changed',
  uploaded_final_video: '📤 Final file uploaded — ready to post',
  replaced_final_video: '📤 Final file replaced',
  revision_requested: '✏️ Revision requested',
  reported_issue: '⚠️ Issue reported',
  resolved_issue: '✅ Issue resolved',
  marked_posted: '✅ Posted',
  added_post_url: '🔗 Post link added',
  date_changed: '📅 Rescheduled',
  edited_content: '📝 Content edited',
  deleted_content: '🗑️ Content deleted',
  duplicated_content: '📄 Content duplicated',
  downloaded_video: '⬇️ File downloaded',
  editor_notes: '🗒️ Notes added',
  password_changed: '🔑 Password changed',
  password_viewed: '👁️ Password viewed',
  user_added: '👥 Team member added',
  user_updated: '👥 Team member updated',
  user_deleted: '👥 Team member deleted',
  settings_updated: '⚙️ Settings changed',
};
