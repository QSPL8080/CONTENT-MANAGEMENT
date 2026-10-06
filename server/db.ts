import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  User,
  UserRole,
  ContentItem,
  ContentStatus,
  ActivityLog,
  ContentIssue,
  AppNotification,
  WorkspaceSettings,
  OperationalMetrics,
} from '../src/types';
import { isManagerial, roleLabel } from '../src/lib/roles';
import { TEAM_ROSTER } from './team';
import { encryptPassword, decryptPassword } from './vault';

dotenv.config();

const { Pool } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings. Without this, pg turns them into
// JS Dates at local midnight, and on an IST (UTC+5:30) server toISOString() shifts every
// scheduled date one day back.
pg.types.setTypeParser(1082, (v: string) => v);

// ---------------------------------------------------------------------------
// Pool (singleton)
// ---------------------------------------------------------------------------
export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:8080@localhost:5432/content_management';

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Create the database itself (e.g. content_management) if it does not exist yet, by connecting
 * to the built-in "postgres" database first. Tables are created afterwards by init().
 */
async function ensureDatabaseExists(): Promise<void> {
  let dbName = '';
  let adminUrl = '';
  try {
    const url = new URL(DATABASE_URL);
    dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
    url.pathname = '/postgres';
    adminUrl = url.toString();
  } catch {
    return; // unusual connection string — let the normal connection report any problem
  }
  if (!dbName || dbName === 'postgres') return;

  const admin = new pg.Client({ connectionString: adminUrl });
  try {
    await admin.connect();
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`✅ Created PostgreSQL database "${dbName}"`);
    }
  } catch (err: any) {
    console.warn(`⚠️  Could not check/create database "${dbName}" automatically: ${err.message}`);
  } finally {
    await admin.end().catch(() => {});
  }
}

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// ---------------------------------------------------------------------------
// Schema (idempotent — runs on every start, safe on an existing database)
// ---------------------------------------------------------------------------
const ROLE_CHECK = `CHECK (role IN ('super_admin','admin','manager','graphic_designer','editor','poster'))`;

const SCHEMA_SQL = `
-- SRS 7.5: Workspace → Users → Content → Calendar (v1 runs one workspace: 'default')
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO workspaces (id, name) VALUES ('default', 'Quickupp Softech') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL DEFAULT '',
  avatar         TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  workspace_id   TEXT NOT NULL DEFAULT 'default',
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_items (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  content_type         TEXT NOT NULL DEFAULT 'reel',
  platform             TEXT NOT NULL DEFAULT 'instagram',
  category             TEXT NOT NULL DEFAULT 'Education',
  scheduled_date       DATE NOT NULL,
  scheduled_time       TIME NOT NULL,
  editor_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  poster_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  caption              TEXT NOT NULL DEFAULT '',
  hashtags             TEXT NOT NULL DEFAULT '',
  instructions         TEXT NOT NULL DEFAULT '',
  video_url            TEXT,
  video_filename       TEXT,
  video_filesize       BIGINT,
  video_uploaded_at    TIMESTAMPTZ,
  video_uploaded_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  thumbnail_url        TEXT,
  status               TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','EDITING','READY_TO_POST','POSTED','REVISION','ISSUE')),
  post_url             TEXT,
  posted_at            TIMESTAMPTZ,
  posted_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
  posting_notes        TEXT,
  reference_file_url   TEXT,
  reference_notes      TEXT,
  internal_notes       TEXT,
  editor_notes         TEXT,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  workspace_id         TEXT NOT NULL DEFAULT 'default',
  created_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          TEXT PRIMARY KEY,
  content_id  TEXT REFERENCES content_items(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  user_name   TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id             TEXT PRIMARY KEY,
  content_id     TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  content_title  TEXT,
  reported_by    TEXT NOT NULL,
  reporter_name  TEXT,
  issue_type     TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED')),
  resolved_by    TEXT,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  content_id  TEXT REFERENCES content_items(id) ON DELETE CASCADE,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  type        TEXT NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id                  SERIAL PRIMARY KEY,
  workspace_name      TEXT NOT NULL DEFAULT 'ContentFlow',
  default_timezone    TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  default_platform    TEXT NOT NULL DEFAULT 'instagram',
  allow_editor_replace BOOLEAN NOT NULL DEFAULT TRUE,
  notification_email  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash      TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acting_as_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  auth_method     TEXT NOT NULL DEFAULT 'password',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL
);

-- Columns added after v1 (no-ops on fresh databases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_enc TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS credentials_version INT NOT NULL DEFAULT 0;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS editor_notes TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_workspace_fk') THEN ALTER TABLE users ADD CONSTRAINT users_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_workspace_fk') THEN ALTER TABLE content_items ADD CONSTRAINT content_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id); END IF; END $$;

-- Role list: super_admin, admin, manager, graphic_designer, editor (video editor), poster (intern)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check ${ROLE_CHECK};

CREATE INDEX IF NOT EXISTS idx_content_date    ON content_items (scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_content_editor  ON content_items (editor_id);
CREATE INDEX IF NOT EXISTS idx_content_poster  ON content_items (poster_id);
CREATE INDEX IF NOT EXISTS idx_logs_content    ON activity_logs (content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_content  ON issues (content_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

INSERT INTO settings (workspace_name, default_timezone, default_platform, allow_editor_replace, notification_email)
SELECT 'ContentFlow', 'Asia/Kolkata', 'instagram', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM settings);
`;

// ---------------------------------------------------------------------------
// Row → domain-type helpers
// ---------------------------------------------------------------------------

function iso(v: any): string {
  return new Date(v).toISOString();
}

function rowToUser(r: Record<string, any>): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    avatar: r.avatar,
    role: r.role,
    status: r.status,
    has_password: Boolean(r.password_hash),
    must_change_password: Boolean(r.must_change_password),
    last_login_at: r.last_login_at ? iso(r.last_login_at) : undefined,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
  };
}

function rowToContent(r: Record<string, any>): ContentItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    content_type: r.content_type,
    platform: r.platform,
    category: r.category,
    scheduled_date: String(r.scheduled_date).slice(0, 10),
    scheduled_time: String(r.scheduled_time).slice(0, 5),
    editor_id: r.editor_id,
    poster_id: r.poster_id,
    caption: r.caption,
    hashtags: r.hashtags,
    instructions: r.instructions,
    video_url: r.video_url ?? undefined,
    video_filename: r.video_filename ?? undefined,
    video_filesize: r.video_filesize != null ? Number(r.video_filesize) : undefined,
    video_uploaded_at: r.video_uploaded_at ? iso(r.video_uploaded_at) : undefined,
    video_uploaded_by: r.video_uploaded_by ?? undefined,
    thumbnail_url: r.thumbnail_url ?? undefined,
    status: r.status,
    post_url: r.post_url ?? undefined,
    posted_at: r.posted_at ? iso(r.posted_at) : undefined,
    posted_by: r.posted_by ?? undefined,
    posting_notes: r.posting_notes ?? undefined,
    reference_file_url: r.reference_file_url ?? undefined,
    reference_notes: r.reference_notes ?? undefined,
    internal_notes: r.internal_notes ?? undefined,
    editor_notes: r.editor_notes ?? undefined,
    tags: r.tags ?? [],
    created_by: r.created_by,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
  };
}

function rowToLog(r: Record<string, any>): ActivityLog {
  return {
    id: r.id,
    content_id: r.content_id ?? undefined,
    user_id: r.user_id,
    user_name: r.user_name ?? undefined,
    user_role: r.user_role ?? undefined,
    action: r.action,
    description: r.description,
    metadata: r.metadata ?? undefined,
    created_at: iso(r.created_at),
  };
}

function rowToIssue(r: Record<string, any>): ContentIssue {
  return {
    id: r.id,
    content_id: r.content_id,
    content_title: r.content_title ?? undefined,
    reported_by: r.reported_by,
    reporter_name: r.reporter_name ?? undefined,
    issue_type: r.issue_type,
    description: r.description,
    status: r.status,
    resolved_by: r.resolved_by ?? undefined,
    resolved_at: r.resolved_at ? iso(r.resolved_at) : undefined,
    created_at: iso(r.created_at),
  };
}

function rowToNotif(r: Record<string, any>): AppNotification {
  return {
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    message: r.message,
    content_id: r.content_id ?? undefined,
    read: r.read,
    type: r.type,
    created_at: iso(r.created_at),
  };
}

function rowToSettings(r: Record<string, any>): WorkspaceSettings {
  return {
    workspace_name: r.workspace_name,
    default_timezone: r.default_timezone,
    default_platform: r.default_platform,
    allow_editor_replace: r.allow_editor_replace,
    notification_email: r.notification_email,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  PLANNED: 'Planned',
  EDITING: 'Editing',
  READY_TO_POST: 'Ready to Post',
  POSTED: 'Posted',
  REVISION: 'Revision',
  ISSUE: 'Issue',
};

/** Current date (YYYY-MM-DD) and time (HH:mm) in the given IANA timezone. */
export function nowInTimezone(tz: string): { date: string; time: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
  } catch {
    const d = new Date();
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
  }
}

/** SQL fragment restricting content rows to what `viewer` may see. */
function visibilityClause(viewer: User | undefined, startIdx: number, alias = ''):
  { sql: string; vals: any[] } {
  if (!viewer || isManagerial(viewer.role)) return { sql: '', vals: [] };
  const a = alias ? `${alias}.` : '';
  return { sql: `(${a}editor_id = $${startIdx} OR ${a}poster_id = $${startIdx})`, vals: [viewer.id] };
}

export type SessionInfo = {
  user: User;          // the effective user (the one being "viewed as", if any)
  realUser: User;      // the person who actually signed in
  actingAs: boolean;
};

// ---------------------------------------------------------------------------
// Database class
// ---------------------------------------------------------------------------
class RelationalDatabase {
  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at');
    return rows.map(rowToUser);
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (!id) return undefined;
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? rowToUser(rows[0]) : undefined;
  }

  async getUserByEmail(email: string): Promise<(User & { password_hash?: string }) | undefined> {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (!rows[0]) return undefined;
    return {
      ...rowToUser(rows[0]),
      password_hash: rows[0].password_hash || '',
    };
  }

  /** Email + password sign-in. Accounts without a password (not yet set by the Super Admin) cannot sign in. */
  async verifyUserPassword(email: string, plainPassword: string): Promise<User | null> {
    const userWithHash = await this.getUserByEmail(email);
    if (!userWithHash || !userWithHash.password_hash || !plainPassword) return null;
    const match = await bcrypt.compare(plainPassword, userWithHash.password_hash);
    if (!match) return null;
    const { password_hash, ...safeUser } = userWithHash;
    return safeUser;
  }

  async countActiveSuperAdmins(excludeUserId?: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE role = 'super_admin' AND status = 'active' AND id <> $1`,
      [excludeUserId || '']
    );
    return rows[0].n;
  }

  async createUser(user: { name: string; email: string; role: UserRole; avatar?: string; status?: string; password?: string; must_change_password?: boolean }): Promise<User> {
    const id = newId('user');
    const now = new Date().toISOString();
    const passwordHash = user.password ? await bcrypt.hash(user.password, 10) : '';
    const passwordEnc = user.password ? encryptPassword(user.password) : null;
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, password_enc, avatar, role, status, must_change_password, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, user.name.trim(), user.email.trim().toLowerCase(), passwordHash, passwordEnc, user.avatar || '', user.role, user.status || 'active', Boolean(user.must_change_password), now, now]
    );
    return rowToUser(rows[0]);
  }

  async updateUser(id: string, updates: Partial<User> & { password?: string; must_change_password?: boolean }): Promise<User | null> {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const allowed: (keyof User)[] = ['name', 'email', 'avatar', 'role', 'status'];
    for (const key of allowed) {
      if (key in updates && (updates as any)[key] !== undefined) {
        let v = (updates as any)[key];
        if (key === 'email') v = String(v).trim().toLowerCase();
        if (key === 'name') v = String(v).trim();
        sets.push(`${key} = $${i++}`);
        vals.push(v);
      }
    }
    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      sets.push(`password_hash = $${i++}`);
      vals.push(passwordHash);
      // Keep the Super Admin's view of the password in sync with every change
      sets.push(`password_enc = $${i++}`);
      vals.push(encryptPassword(updates.password));
    }
    if (updates.must_change_password !== undefined) {
      sets.push(`must_change_password = $${i++}`);
      vals.push(Boolean(updates.must_change_password));
    }
    if (sets.length === 0) {
      return (await this.getUserById(id)) ?? null;
    }
    sets.push(`updated_at = $${i++}`);
    vals.push(now);
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async touchLastLogin(userId: string, avatar?: string): Promise<void> {
    if (avatar) {
      // Use the given profile photo unless an avatar was set explicitly
      await pool.query(
        `UPDATE users SET last_login_at = NOW(),
           avatar = CASE WHEN avatar = '' OR avatar LIKE 'https://api.dicebear.com/%' OR avatar LIKE 'https://lh3.googleusercontent.com/%' THEN $2 ELSE avatar END
         WHERE id = $1`,
        [userId, avatar]
      );
    } else {
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
    }
  }

  // ------------------------------------------------------------------
  // Sessions
  // ------------------------------------------------------------------
  async createSession(tokenHash: string, userId: string, method: string, ttlDays: number): Promise<void> {
    await pool.query(
      `INSERT INTO sessions (token_hash, user_id, auth_method, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval)`,
      [tokenHash, userId, method, String(ttlDays)]
    );
    // Opportunistic cleanup of expired sessions
    pool.query('DELETE FROM sessions WHERE expires_at < NOW()').catch(() => {});
  }

  async getSession(tokenHash: string): Promise<SessionInfo | null> {
    const { rows } = await pool.query(
      'SELECT * FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    const s = rows[0];
    if (!s) return null;
    const realUser = await this.getUserById(s.user_id);
    // FR-AUTH-4: disabled users are denied immediately
    if (!realUser || realUser.status !== 'active') return null;

    return { user: realUser, realUser, actingAs: false };
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }

  async deleteSessionsForUser(userId: string, exceptTokenHash?: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [userId, exceptTokenHash || '']);
  }

  /** Check a user's current password (for "Change password"). */
  async checkPassword(userId: string, plainPassword: string): Promise<boolean> {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!rows[0]?.password_hash || !plainPassword) return false;
    return bcrypt.compare(plainPassword, rows[0].password_hash);
  }

  /** Super Admin only (checked in the route): the user's current password, if it can be shown. */
  async revealPassword(userId: string): Promise<string | null> {
    const { rows } = await pool.query('SELECT password_enc FROM users WHERE id = $1', [userId]);
    return decryptPassword(rows[0]?.password_enc);
  }

  async setMustChangePassword(userId: string, value: boolean): Promise<void> {
    await pool.query('UPDATE users SET must_change_password = $1 WHERE id = $2', [value, userId]);
  }

  // ------------------------------------------------------------------
  // Content
  // ------------------------------------------------------------------
  async getContentList(filters?: {
    status?: string;
    editor_id?: string;
    poster_id?: string;
    platform?: string;
    date?: string;
    search?: string;
    visibleTo?: User;
  }): Promise<ContentItem[]> {
    const conditions: string[] = [];
    const vals: any[] = [];
    let i = 1;

    const vis = visibilityClause(filters?.visibleTo, i);
    if (vis.sql) {
      conditions.push(vis.sql);
      vals.push(...vis.vals);
      i += vis.vals.length;
    }
    if (filters?.status) {
      conditions.push(`status = $${i++}`);
      vals.push(filters.status);
    }
    if (filters?.editor_id) {
      conditions.push(`editor_id = $${i++}`);
      vals.push(filters.editor_id);
    }
    if (filters?.poster_id) {
      conditions.push(`poster_id = $${i++}`);
      vals.push(filters.poster_id);
    }
    if (filters?.platform) {
      conditions.push(`platform = $${i++}`);
      vals.push(filters.platform);
    }
    if (filters?.date) {
      conditions.push(`scheduled_date = $${i++}`);
      vals.push(filters.date);
    }
    if (filters?.search) {
      const q = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        `(LOWER(title) LIKE $${i} OR LOWER(caption) LIKE $${i} OR LOWER(hashtags) LIKE $${i} OR LOWER(platform) LIKE $${i})`
      );
      vals.push(q);
      i++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT * FROM content_items ${where} ORDER BY scheduled_date ASC, scheduled_time ASC`,
      vals
    );
    return rows.map(rowToContent);
  }

  async getContentById(id: string): Promise<ContentItem | undefined> {
    const { rows } = await pool.query('SELECT * FROM content_items WHERE id = $1', [id]);
    return rows[0] ? rowToContent(rows[0]) : undefined;
  }

  /** Users who should hear about a content item: managers/admins + its creator + its intern. */
  async getStakeholderIds(item: Pick<ContentItem, 'editor_id' | 'poster_id'>): Promise<string[]> {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE status = 'active' AND role IN ('super_admin','admin','manager')`
    );
    const ids = new Set<string>(rows.map(r => r.id));
    if (item.editor_id) ids.add(item.editor_id);
    if (item.poster_id) ids.add(item.poster_id);
    return [...ids];
  }

  async notifyUsers(
    userIds: string[],
    notif: { title: string; message: string; content_id?: string; type?: AppNotification['type'] },
    excludeUserId?: string
  ): Promise<void> {
    const targets = [...new Set(userIds)].filter(id => id && id !== excludeUserId);
    await Promise.all(
      targets.map(uid =>
        this.createNotification({
          user_id: uid,
          title: notif.title,
          message: notif.message,
          content_id: notif.content_id,
          type: notif.type || 'general',
        })
      )
    );
  }

  async createContent(
    item: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>,
    creator: User
  ): Promise<ContentItem> {
    const id = newId('content');
    const now = new Date().toISOString();
    const { rows } = await pool.query(
      `INSERT INTO content_items
        (id, title, description, content_type, platform, category,
         scheduled_date, scheduled_time, editor_id, poster_id, caption, hashtags,
         instructions, status, tags, created_by, created_at, updated_at,
         reference_notes, internal_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        id, item.title, item.description, item.content_type, item.platform,
        item.category || 'Education', item.scheduled_date, item.scheduled_time,
        item.editor_id, item.poster_id, item.caption, item.hashtags,
        item.instructions, item.status || 'PLANNED', item.tags || [],
        creator.id, now, now,
        item.reference_notes ?? null, item.internal_notes ?? null,
      ]
    );
    const newContent = rowToContent(rows[0]);

    await this.logActivity({
      content_id: newContent.id,
      user_id: creator.id,
      user_name: creator.name,
      user_role: creator.role,
      action: 'created_content',
      description: `${creator.name} created "${newContent.title}" for ${newContent.scheduled_date} at ${newContent.scheduled_time}.`,
    });

    if (newContent.editor_id && newContent.editor_id !== creator.id) {
      await this.createNotification({
        user_id: newContent.editor_id,
        title: `New task assigned: "${newContent.title}"`,
        message: `${creator.name} assigned you to create "${newContent.title}" (${newContent.content_type}) — due ${newContent.scheduled_date} at ${newContent.scheduled_time}.`,
        content_id: newContent.id,
        type: 'assigned',
      });
    }
    if (newContent.poster_id && newContent.poster_id !== creator.id && newContent.poster_id !== newContent.editor_id) {
      await this.createNotification({
        user_id: newContent.poster_id,
        title: `New post scheduled: "${newContent.title}"`,
        message: `You will publish "${newContent.title}" on ${newContent.platform} — ${newContent.scheduled_date} at ${newContent.scheduled_time}.`,
        content_id: newContent.id,
        type: 'assigned',
      });
    }

    return newContent;
  }

  async updateContent(
    id: string,
    updates: Partial<ContentItem>,
    modifier: User,
    options: { silent?: boolean } = {}
  ): Promise<ContentItem | null> {
    const oldItem = await this.getContentById(id);
    if (!oldItem) return null;

    const now = new Date().toISOString();
    const allowed: (keyof ContentItem)[] = [
      'title', 'description', 'content_type', 'platform', 'category',
      'scheduled_date', 'scheduled_time', 'editor_id', 'poster_id',
      'caption', 'hashtags', 'instructions', 'status', 'tags',
      'video_url', 'video_filename', 'video_filesize',
      'video_uploaded_at', 'video_uploaded_by',
      'thumbnail_url', 'post_url', 'posted_at', 'posted_by',
      'posting_notes', 'reference_file_url', 'reference_notes', 'internal_notes',
      'editor_notes',
    ];

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;

    for (const key of allowed) {
      if (key in updates && (updates as any)[key] !== undefined) {
        sets.push(`${key} = $${i++}`);
        let v = (updates as any)[key];
        if (key === 'tags') v = Array.isArray(v) ? v : [];
        vals.push(v === '' && (key === 'editor_id' || key === 'poster_id') ? null : v ?? null);
      }
    }

    if (sets.length === 0) return oldItem;

    sets.push(`updated_at = $${i++}`);
    vals.push(now);
    vals.push(id);

    const { rows } = await pool.query(
      `UPDATE content_items SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    const updatedItem = rows[0] ? rowToContent(rows[0]) : null;
    if (!updatedItem || options.silent) return updatedItem;

    // Side-effects: activity log + targeted notifications
    if (updates.editor_id && updates.editor_id !== oldItem.editor_id) {
      const newEditor = await this.getUserById(updates.editor_id);
      await this.logActivity({
        content_id: id, user_id: modifier.id, user_name: modifier.name, user_role: modifier.role,
        action: 'reassigned_creator',
        description: `${modifier.name} assigned ${newEditor?.name || 'a new creator'} (${roleLabel(newEditor?.role)}) to this content.`,
      });
      await this.notifyUsers([updates.editor_id], {
        title: `Task assigned to you: "${updatedItem.title}"`,
        message: `${modifier.name} assigned you to "${updatedItem.title}" — due ${updatedItem.scheduled_date}.`,
        content_id: id,
        type: 'assigned',
      }, modifier.id);
    }
    if (updates.poster_id && updates.poster_id !== oldItem.poster_id) {
      const newPoster = await this.getUserById(updates.poster_id);
      await this.logActivity({
        content_id: id, user_id: modifier.id, user_name: modifier.name, user_role: modifier.role,
        action: 'reassigned_poster',
        description: `${modifier.name} assigned ${newPoster?.name || 'a new intern'} to publish this content.`,
      });
      await this.notifyUsers([updates.poster_id], {
        title: `Posting task assigned to you: "${updatedItem.title}"`,
        message: `${modifier.name} assigned you to publish "${updatedItem.title}" on ${updatedItem.platform}.`,
        content_id: id,
        type: 'assigned',
      }, modifier.id);
    }
    const dateChanged = updates.scheduled_date && updates.scheduled_date !== oldItem.scheduled_date;
    const timeChanged = updates.scheduled_time && updates.scheduled_time !== oldItem.scheduled_time;
    if (dateChanged || timeChanged) {
      const from = `${oldItem.scheduled_date} ${oldItem.scheduled_time}`;
      const to = `${updatedItem.scheduled_date} ${updatedItem.scheduled_time}`;
      await this.logActivity({
        content_id: id, user_id: modifier.id, user_name: modifier.name, user_role: modifier.role,
        action: 'date_changed',
        description: `${modifier.name} moved this content from ${from} to ${to}.`,
        metadata: { from, to },
      });
      await this.notifyUsers(await this.getStakeholderIds(updatedItem), {
        title: `Rescheduled: "${updatedItem.title}"`,
        message: `${modifier.name} moved it from ${from} to ${to}.`,
        content_id: id,
        type: 'general',
      }, modifier.id);
    }
    if (updates.status && updates.status !== oldItem.status) {
      await this.logActivity({
        content_id: id, user_id: modifier.id, user_name: modifier.name, user_role: modifier.role,
        action: 'status_changed',
        description: `${modifier.name} changed status from ${STATUS_LABELS[oldItem.status]} to ${STATUS_LABELS[updates.status]}.`,
        metadata: { from: oldItem.status, to: updates.status },
      });
    }
    const otherEdits = Object.keys(updates).filter(k =>
      ['title', 'description', 'content_type', 'platform', 'category', 'caption', 'hashtags', 'instructions', 'tags', 'reference_notes', 'internal_notes'].includes(k) &&
      JSON.stringify((updates as any)[k] ?? '') !== JSON.stringify((oldItem as any)[k] ?? '')
    );
    if (otherEdits.length > 0) {
      const pretty = otherEdits.map(k => k.replace(/_/g, ' ')).join(', ');
      await this.logActivity({
        content_id: id, user_id: modifier.id, user_name: modifier.name, user_role: modifier.role,
        action: 'edited_content',
        description: `${modifier.name} updated ${pretty}.`,
      });
    }
    if ('editor_notes' in updates && (updates.editor_notes ?? '') !== (oldItem.editor_notes ?? '')) {
      await this.logActivity({
        content_id: id, user_id: modifier.id, user_name: modifier.name, user_role: modifier.role,
        action: 'editor_notes',
        description: `${modifier.name} updated the creator notes.`,
      });
    }

    return updatedItem;
  }

  async duplicateContent(id: string, user: User): Promise<ContentItem | null> {
    const source = await this.getContentById(id);
    if (!source) return null;

    const newId2 = newId('content');
    const now = new Date().toISOString();
    const { rows } = await pool.query(
      `INSERT INTO content_items
        (id, title, description, content_type, platform, category,
         scheduled_date, scheduled_time, editor_id, poster_id, caption, hashtags,
         instructions, status, tags, created_by, created_at, updated_at,
         reference_notes, internal_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        newId2, `${source.title} (Copy)`, source.description, source.content_type,
        source.platform, source.category || 'Education',
        source.scheduled_date, source.scheduled_time,
        source.editor_id, source.poster_id, source.caption, source.hashtags,
        source.instructions, 'PLANNED', source.tags || [],
        user.id, now, now,
        source.reference_notes ?? null, source.internal_notes ?? null,
      ]
    );
    const duplicate = rowToContent(rows[0]);

    await this.logActivity({
      content_id: duplicate.id,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'duplicated_content',
      description: `${user.name} duplicated "${source.title}".`,
    });

    return duplicate;
  }

  async deleteContent(id: string, user: User): Promise<boolean> {
    const item = await this.getContentById(id);
    if (!item) return false;
    await pool.query('DELETE FROM content_items WHERE id = $1', [id]);
    await this.logActivity({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'deleted_content',
      description: `${user.name} deleted content "${item.title}".`,
    });
    return true;
  }

  // ------------------------------------------------------------------
  // Final asset upload — stores only metadata (path/filename/size), NOT the binary
  // ------------------------------------------------------------------
  async uploadVideoForContent(
    contentId: string,
    videoData: {
      video_url: string;      // served path, e.g. /api/videos/<file>
      video_filename: string;
      video_filesize: number;
    },
    uploader: User
  ): Promise<ContentItem | null> {
    const item = await this.getContentById(contentId);
    if (!item) return null;
    const isReplacement = Boolean(item.video_url);

    // Uploading the final asset moves the item to READY_TO_POST (unless already posted —
    // only admins can replace after posting, and that should not reopen it).
    const nextStatus: ContentStatus = item.status === 'POSTED' ? 'POSTED' : 'READY_TO_POST';

    const updatedItem = await this.updateContent(
      contentId,
      {
        video_url: videoData.video_url,
        video_filename: videoData.video_filename,
        video_filesize: videoData.video_filesize,
        video_uploaded_at: new Date().toISOString(),
        video_uploaded_by: uploader.id,
        status: nextStatus,
      },
      uploader
    );

    if (updatedItem) {
      await this.logActivity({
        content_id: contentId,
        user_id: uploader.id,
        user_name: uploader.name,
        user_role: uploader.role,
        action: isReplacement ? 'replaced_final_video' : 'uploaded_final_video',
        description: `${uploader.name} ${isReplacement ? 'replaced the final file with' : 'uploaded'} ${videoData.video_filename}.`,
        metadata: videoData,
      });

      if (nextStatus === 'READY_TO_POST') {
        await this.notifyUsers(await this.getStakeholderIds(item), {
          title: `Ready to post: "${item.title}"`,
          message: `${uploader.name} uploaded the final file for "${item.title}". It is ready to publish on ${item.platform} (${item.scheduled_date} at ${item.scheduled_time}).`,
          content_id: item.id,
          type: 'ready_to_post',
        }, uploader.id);
      }
    }

    return updatedItem;
  }

  // ------------------------------------------------------------------
  // Mark as posted (atomic — a POSTED item can never be posted twice)
  // ------------------------------------------------------------------
  async markContentAsPosted(
    contentId: string,
    postingData: {
      post_url?: string;
      posted_at?: string;
      posting_notes?: string;
      platform?: string;
    },
    poster: User
  ): Promise<{ item: ContentItem | null; alreadyPosted: boolean }> {
    const item = await this.getContentById(contentId);
    if (!item) return { item: null, alreadyPosted: false };

    const postedAt = postingData.posted_at && !isNaN(Date.parse(postingData.posted_at))
      ? new Date(postingData.posted_at).toISOString()
      : new Date().toISOString();

    const { rows } = await pool.query(
      `UPDATE content_items
         SET status = 'POSTED', posted_by = $1, posted_at = $2, post_url = $3,
             posting_notes = $4, platform = COALESCE(NULLIF($5, ''), platform), updated_at = NOW()
       WHERE id = $6 AND status <> 'POSTED'
       RETURNING *`,
      [poster.id, postedAt, postingData.post_url || null, postingData.posting_notes || null, postingData.platform || '', contentId]
    );
    if (!rows[0]) return { item: await this.getContentById(contentId) ?? null, alreadyPosted: true };
    const updated = rowToContent(rows[0]);

    await this.logActivity({
      content_id: contentId,
      user_id: poster.id,
      user_name: poster.name,
      user_role: poster.role,
      action: 'marked_posted',
      description: `${poster.name} marked "${item.title}" as Posted on ${updated.platform}.`,
      metadata: { from: item.status, to: 'POSTED' },
    });

    if (postingData.post_url) {
      await this.logActivity({
        content_id: contentId,
        user_id: poster.id,
        user_name: poster.name,
        user_role: poster.role,
        action: 'added_post_url',
        description: `${poster.name} added the post link: ${postingData.post_url}`,
      });
    }

    await this.notifyUsers(await this.getStakeholderIds(item), {
      title: `Posted: "${item.title}"`,
      message: `${poster.name} published "${item.title}" on ${updated.platform}.`,
      content_id: item.id,
      type: 'posted',
    }, poster.id);

    return { item: updated, alreadyPosted: false };
  }

  // ------------------------------------------------------------------
  // Revision
  // ------------------------------------------------------------------
  async requestRevision(
    contentId: string,
    notes: string,
    requester: User
  ): Promise<ContentItem | null> {
    const item = await this.getContentById(contentId);
    if (!item) return null;

    const updated = await this.updateContent(
      contentId,
      { status: 'REVISION', internal_notes: notes },
      requester,
      { silent: true }
    );

    if (updated) {
      await this.logActivity({
        content_id: contentId,
        user_id: requester.id,
        user_name: requester.name,
        user_role: requester.role,
        action: 'revision_requested',
        description: `${requester.name} sent this back for revision: "${notes}"`,
        metadata: { from: item.status, to: 'REVISION' },
      });

      await this.notifyUsers([item.editor_id], {
        title: `Revision requested: "${item.title}"`,
        message: `${requester.name}: "${notes}"`,
        content_id: item.id,
        type: 'revision',
      }, requester.id);
    }

    return updated;
  }

  // ------------------------------------------------------------------
  // Issues
  // ------------------------------------------------------------------
  async reportIssue(
    issueData: {
      content_id: string;
      issue_type: any;
      description: string;
    },
    reporter: User
  ): Promise<ContentIssue> {
    const content = await this.getContentById(issueData.content_id);
    const id = newId('issue');
    const now = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO issues (id, content_id, content_title, reported_by, reporter_name, issue_type, description, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'OPEN',$8) RETURNING *`,
      [
        id, issueData.content_id, content?.title || 'Unknown Content',
        reporter.id, reporter.name, issueData.issue_type,
        issueData.description, now,
      ]
    );
    const newIssue = rowToIssue(rows[0]);
    const typeLabel = String(issueData.issue_type).replace(/_/g, ' ');

    if (content && content.status !== 'POSTED') {
      await this.updateContent(issueData.content_id, { status: 'ISSUE' }, reporter, { silent: true });
    }

    await this.logActivity({
      content_id: issueData.content_id,
      user_id: reporter.id,
      user_name: reporter.name,
      user_role: reporter.role,
      action: 'reported_issue',
      description: `${reporter.name} reported an issue (${typeLabel})${issueData.description ? `: ${issueData.description}` : '.'}`,
    });

    if (content) {
      // FR-POST-7: notify Admin(s)/Manager(s) and the assigned creator
      const { rows: mgrs } = await pool.query(
        `SELECT id FROM users WHERE status = 'active' AND role IN ('super_admin','admin','manager')`
      );
      await this.notifyUsers([...mgrs.map(r => r.id), content.editor_id], {
        title: `Issue reported: "${content.title}"`,
        message: `${reporter.name} reported "${typeLabel}"${issueData.description ? `: ${issueData.description}` : '.'}`,
        content_id: issueData.content_id,
        type: 'issue',
      }, reporter.id);
    }

    return newIssue;
  }

  async getIssueById(issueId: string): Promise<ContentIssue | undefined> {
    const { rows } = await pool.query('SELECT * FROM issues WHERE id = $1', [issueId]);
    return rows[0] ? rowToIssue(rows[0]) : undefined;
  }

  async resolveIssue(issueId: string, resolver: User): Promise<ContentIssue | null> {
    const existing = await this.getIssueById(issueId);
    if (!existing) return null;

    const { rows } = await pool.query(
      `UPDATE issues SET status='RESOLVED', resolved_by=$1, resolved_at=NOW() WHERE id=$2 RETURNING *`,
      [resolver.id, issueId]
    );
    const issue = rowToIssue(rows[0]);

    const content = await this.getContentById(issue.content_id);
    if (content && content.status === 'ISSUE') {
      const { rows: open } = await pool.query(
        `SELECT 1 FROM issues WHERE content_id = $1 AND status = 'OPEN' LIMIT 1`,
        [content.id]
      );
      if (open.length === 0) {
        const nextStatus: ContentStatus = content.video_url ? 'READY_TO_POST' : 'EDITING';
        await this.updateContent(content.id, { status: nextStatus }, resolver);
      }
    }

    await this.logActivity({
      content_id: issue.content_id,
      user_id: resolver.id,
      user_name: resolver.name,
      user_role: resolver.role,
      action: 'resolved_issue',
      description: `${resolver.name} resolved the "${issue.issue_type.replace(/_/g, ' ')}" issue.`,
    });

    if (content) {
      await this.notifyUsers([existing.reported_by, content.editor_id, content.poster_id], {
        title: `Issue resolved: "${issue.content_title || content.title}"`,
        message: `${resolver.name} marked the reported issue as resolved.`,
        content_id: issue.content_id,
        type: 'general',
      }, resolver.id);
    }

    return issue;
  }

  async getIssues(contentId?: string, visibleTo?: User): Promise<ContentIssue[]> {
    const conditions: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (contentId) {
      conditions.push(`i.content_id = $${i++}`);
      vals.push(contentId);
    }
    const vis = visibilityClause(visibleTo, i, 'c');
    if (vis.sql) {
      conditions.push(vis.sql);
      vals.push(...vis.vals);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT i.* FROM issues i JOIN content_items c ON c.id = i.content_id ${where} ORDER BY i.created_at DESC`,
      vals
    );
    return rows.map(rowToIssue);
  }

  // ------------------------------------------------------------------
  // Activity Logs
  // ------------------------------------------------------------------
  async logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<ActivityLog> {
    const id = newId('log');
    const now = new Date().toISOString();
    const { rows } = await pool.query(
      `INSERT INTO activity_logs (id, content_id, user_id, user_name, user_role, action, description, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        id, log.content_id ?? null, log.user_id, log.user_name ?? null,
        log.user_role ?? null, log.action, log.description,
        log.metadata ? JSON.stringify(log.metadata) : null, now,
      ]
    );
    return rowToLog(rows[0]);
  }

  async getActivityLogs(contentId?: string, limit = 50, visibleTo?: User): Promise<ActivityLog[]> {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 500));
    const conditions: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (contentId) {
      conditions.push(`l.content_id = $${i++}`);
      vals.push(contentId);
    }
    if (visibleTo && !isManagerial(visibleTo.role)) {
      // Non-managers only see activity on content assigned to them
      conditions.push(`(c.editor_id = $${i} OR c.poster_id = $${i})`);
      vals.push(visibleTo.id);
      i++;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    vals.push(safeLimit);
    const { rows } = await pool.query(
      `SELECT l.* FROM activity_logs l LEFT JOIN content_items c ON c.id = l.content_id
       ${where} ORDER BY l.created_at DESC LIMIT $${i}`,
      vals
    );
    return rows.map(rowToLog);
  }

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------
  async createNotification(
    notif: Omit<AppNotification, 'id' | 'created_at' | 'read'>
  ): Promise<AppNotification> {
    const id = newId('notif');
    const now = new Date().toISOString();
    const { rows } = await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, content_id, read, type, created_at)
       VALUES ($1,$2,$3,$4,$5,FALSE,$6,$7) RETURNING *`,
      [id, notif.user_id, notif.title, notif.message, notif.content_id ?? null, notif.type || 'general', now]
    );
    return rowToNotif(rows[0]);
  }

  async getNotifications(userId: string): Promise<AppNotification[]> {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId]
    );
    return rows.map(rowToNotif);
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [userId]);
  }

  // ------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------
  async getSettings(): Promise<WorkspaceSettings> {
    const { rows } = await pool.query('SELECT * FROM settings ORDER BY id LIMIT 1');
    if (!rows[0]) {
      return {
        workspace_name: 'ContentFlow',
        default_timezone: 'Asia/Kolkata',
        default_platform: 'instagram',
        allow_editor_replace: true,
        notification_email: true,
      };
    }
    return rowToSettings(rows[0]);
  }

  async updateSettings(settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    const { rows: existing } = await pool.query('SELECT id FROM settings ORDER BY id LIMIT 1');
    const id = existing[0]?.id;
    if (!id) {
      const { rows } = await pool.query(
        `INSERT INTO settings (workspace_name, default_timezone, default_platform, allow_editor_replace, notification_email)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [
          settings.workspace_name || 'ContentFlow',
          settings.default_timezone || 'Asia/Kolkata',
          settings.default_platform || 'instagram',
          settings.allow_editor_replace ?? true,
          settings.notification_email ?? true,
        ]
      );
      return rowToSettings(rows[0]);
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const allowed: (keyof WorkspaceSettings)[] = [
      'workspace_name', 'default_timezone', 'default_platform',
      'allow_editor_replace', 'notification_email',
    ];
    for (const key of allowed) {
      if (key in settings && (settings as any)[key] !== undefined) {
        sets.push(`${key} = $${i++}`);
        vals.push((settings as any)[key]);
      }
    }
    if (sets.length === 0) return this.getSettings();
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE settings SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    return rowToSettings(rows[0]);
  }

  // ------------------------------------------------------------------
  // Metrics (scoped to what the viewer can see; "today" uses the workspace timezone)
  // ------------------------------------------------------------------
  async getOperationalMetrics(viewer?: User): Promise<OperationalMetrics> {
    const settings = await this.getSettings();
    const { date: referenceDate, time: referenceTime } = nowInTimezone(settings.default_timezone);

    const vis = visibilityClause(viewer, 1);
    const { rows } = await pool.query(
      `SELECT status, scheduled_date, scheduled_time FROM content_items ${vis.sql ? `WHERE ${vis.sql}` : ''}`,
      vis.vals
    );

    let planned = 0, editing = 0, ready_to_post = 0, posted = 0, revision = 0, issue = 0;
    let overdue_editing = 0, overdue_posting = 0, today_count = 0;

    for (const row of rows) {
      const sd = String(row.scheduled_date).slice(0, 10);
      const st = String(row.scheduled_time).slice(0, 5);
      const status: string = row.status;

      if (status === 'PLANNED') planned++;
      else if (status === 'EDITING') editing++;
      else if (status === 'READY_TO_POST') ready_to_post++;
      else if (status === 'POSTED') posted++;
      else if (status === 'REVISION') revision++;
      else if (status === 'ISSUE') issue++;

      if (sd === referenceDate) today_count++;

      // FR-OVERDUE-1: editing overdue once the scheduled DATE has passed
      if ((status === 'EDITING' || status === 'PLANNED') && sd < referenceDate) overdue_editing++;
      // FR-OVERDUE-2: posting overdue once the scheduled TIME has passed
      if (status === 'READY_TO_POST' && (sd < referenceDate || (sd === referenceDate && st < referenceTime))) {
        overdue_posting++;
      }
    }

    return {
      total: rows.length,
      planned, editing, ready_to_post, posted, revision, issue,
      overdue_editing, overdue_posting, today_count,
    };
  }

  // ------------------------------------------------------------------
  // Init — create/migrate schema, seed Super Admin and the team roster
  // ------------------------------------------------------------------
  async init(): Promise<void> {
    await ensureDatabaseExists();
    const client = await pool.connect();
    try {
      // Run statements one by one so a single optional step (e.g. an index on a legacy
      // database with odd data) cannot block startup.
      const statements = SCHEMA_SQL.split(/;\s*\n/).map(x => x.trim()).filter(Boolean);
      for (const stmt of statements) {
        try {
          await client.query(stmt);
        } catch (err: any) {
          if (/^CREATE (UNIQUE )?INDEX/i.test(stmt)) {
            console.warn(`⚠️  Skipped index (${err.message}): ${stmt.slice(0, 80)}`);
          } else {
            throw err;
          }
        }
      }

      // --- Credentials -------------------------------------------------------------
      const saEmail = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@gmail.com').trim().toLowerCase();
      const saPassword = process.env.SUPER_ADMIN_PASSWORD || 'content@1234';
      const saName = process.env.SUPER_ADMIN_NAME || 'Super Admin';
      const teamPassword = process.env.TEAM_DEFAULT_PASSWORD || 'Quickupp@123';
      const rosterEmails = TEAM_ROSTER.map(m => m.email.trim().toLowerCase());

      const setPassword = async (userId: string, plain: string, _unused?: boolean) => {
        await client.query(
          `UPDATE users SET password_hash = $1, password_enc = $2, must_change_password = FALSE, updated_at = NOW() WHERE id = $3`,
          [await bcrypt.hash(plain, 10), encryptPassword(plain), userId]
        );
      };
      // The "temporary password / must change at next sign-in" step is no longer used
      await client.query('UPDATE users SET must_change_password = FALSE WHERE must_change_password = TRUE');

      // 1) Make sure the Super Admin exists
      let sa = await client.query('SELECT * FROM users WHERE LOWER(email) = $1', [saEmail]);
      if (sa.rows.length === 0) {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, avatar, role, status)
           VALUES ($1, $2, $3, '', '', 'super_admin', 'active')`,
          [newId('user'), saName, saEmail]
        );
        sa = await client.query('SELECT * FROM users WHERE LOWER(email) = $1', [saEmail]);
        await setPassword(sa.rows[0].id, saPassword, false);
        sa = await client.query('SELECT * FROM users WHERE LOWER(email) = $1', [saEmail]);
        console.log(`✅ Super Admin created: ${saEmail}`);
      } else if (sa.rows[0].role !== 'super_admin' || sa.rows[0].status !== 'active') {
        await client.query(`UPDATE users SET role = 'super_admin', status = 'active' WHERE id = $1`, [sa.rows[0].id]);
      }
      if (process.env.SUPER_ADMIN_RESET_PASSWORD === 'true' || !sa.rows[0].password_hash) {
        await setPassword(sa.rows[0].id, saPassword, false);
        console.log(`✅ Super Admin password reset for ${saEmail}`);
      }

      // 2) Make sure every roster member exists (new ones get the default team password)
      for (const member of TEAM_ROSTER) {
        const email = member.email.trim().toLowerCase();
        const found = await client.query('SELECT id, password_hash FROM users WHERE LOWER(email) = $1', [email]);
        if (found.rows.length === 0) {
          const id = newId('user');
          await client.query(
            `INSERT INTO users (id, name, email, password_hash, avatar, role, status)
             VALUES ($1, $2, $3, '', '', $4, 'active')`,
            [id, member.name, email, member.role]
          );
          await setPassword(id, teamPassword, true);
          console.log(`✅ Added ${member.name} (${email})`);
        } else if (!found.rows[0].password_hash) {
          await setPassword(found.rows[0].id, teamPassword, true);
        }
      }

      // 3) One-time clean-up: keep ONLY the Super Admin + the team list, with fresh credentials.
      //    Removes old/test accounts (e.g. admin@cf.com) and signs everyone out. Runs once.
      const CREDENTIALS_VERSION = 2;
      const { rows: verRows } = await client.query('SELECT id, credentials_version FROM settings ORDER BY id LIMIT 1');
      if (verRows[0] && verRows[0].credentials_version < CREDENTIALS_VERSION) {
        const keep = [saEmail, ...rosterEmails];
        const removed = await client.query(
          `DELETE FROM users WHERE LOWER(email) <> ALL($1::text[]) RETURNING email`,
          [keep]
        );
        await setPassword(sa.rows[0].id, saPassword, false);
        await client.query(`UPDATE users SET name = $1 WHERE id = $2`, [saName, sa.rows[0].id]);
        for (const member of TEAM_ROSTER) {
          const { rows } = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [member.email.trim().toLowerCase()]);
          if (!rows[0]) continue;
          await client.query(
            `UPDATE users SET name = $1, role = $2, status = 'active' WHERE id = $3`,
            [member.name, member.role, rows[0].id]
          );
          await setPassword(rows[0].id, teamPassword, true);
        }
        await client.query('DELETE FROM sessions');
        await client.query('DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users)');
        await client.query('UPDATE settings SET credentials_version = $1 WHERE id = $2', [CREDENTIALS_VERSION, verRows[0].id]);
        console.log(
          `✅ Credentials reset: kept Super Admin + ${TEAM_ROSTER.length} team members` +
          (removed.rows.length ? `, removed ${removed.rows.length} old account(s): ${removed.rows.map(r => r.email).join(', ')}` : '')
        );
      }
      console.log(`🔐 Super Admin sign-in: ${saEmail}`);

      await client.query('DELETE FROM sessions WHERE expires_at < NOW()');
    } finally {
      client.release();
    }
    console.log('✅ PostgreSQL connected — schema ready');
  }
}

export const db = new RelationalDatabase();
