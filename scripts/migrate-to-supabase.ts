import pg from 'pg';
import dotenv from 'dotenv';
import { pgConnectionConfig } from '../server/pgConfig';

dotenv.config();

const LOCAL_URL = process.env.DATABASE_URL || 'postgresql://postgres:8080@localhost:5432/content_management';
// Target database link — set it in .env (never write passwords into the code):
//   MIGRATE_TARGET_URL=postgresql://user:password@host:5432/postgres
const SUPABASE_URL = process.env.MIGRATE_TARGET_URL || '';
if (!SUPABASE_URL) {
  console.error('❌ Set MIGRATE_TARGET_URL in .env to the database you want to copy into, then run again.');
  process.exit(1);
}

const ROLE_CHECK = `CHECK (role IN ('admin','manager','graphic_designer','editor','poster'))`;

const SCHEMA_SQL = `
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

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_enc TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS credentials_version INT NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_cleanup_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS retention_days INT NOT NULL DEFAULT 90;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS editor_notes TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_content_date    ON content_items (scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_content_editor  ON content_items (editor_id);
CREATE INDEX IF NOT EXISTS idx_content_poster  ON content_items (poster_id);
CREATE INDEX IF NOT EXISTS idx_logs_content    ON activity_logs (content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_content  ON issues (content_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions (user_id);
`;

async function migrate() {
  console.log('🔄 Connecting to Local PostgreSQL...');
  const local = new pg.Client(pgConnectionConfig(LOCAL_URL));
  await local.connect();
  console.log('✅ Local PostgreSQL connected.');

  console.log('🔄 Connecting to Supabase PostgreSQL...');
  const remote = new pg.Client(pgConnectionConfig(SUPABASE_URL));
  await remote.connect();
  console.log('✅ Supabase PostgreSQL connected.');

  console.log('🛠 Recreating tables clean on Supabase...');
  await remote.query(`
    DROP TABLE IF EXISTS sessions CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS issues CASCADE;
    DROP TABLE IF EXISTS activity_logs CASCADE;
    DROP TABLE IF EXISTS content_items CASCADE;
    DROP TABLE IF EXISTS settings CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS workspaces CASCADE;
  `);
  await remote.query(SCHEMA_SQL);
  console.log('✅ Schema ready.');

  const TABLES = ['workspaces', 'users', 'settings', 'content_items', 'activity_logs', 'issues', 'notifications', 'sessions'];

  for (const table of TABLES) {
    console.log(`\n📦 Migrating table: ${table}...`);
    const { rows } = await local.query(`SELECT * FROM ${table}`);
    console.log(`   Found ${rows.length} rows in local ${table}.`);

    if (rows.length === 0) continue;

    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

      const conflictCol = (table === 'settings') ? 'id' : (table === 'sessions' ? 'token_hash' : 'id');

      const updateSet = keys
        .filter(k => k !== conflictCol)
        .map(k => `"${k}" = EXCLUDED."${k}"`)
        .join(', ');

      const query = updateSet
        ? `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateSet}`
        : `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO NOTHING`;

      await remote.query(query, values);
    }
    console.log(`   ✅ Migrated ${rows.length} rows into Supabase ${table}.`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL LOCAL DATA SUCCESSFULLY MIGRATED TO SUPABASE!');
  console.log('=============================================\n');

  // Verify in Supabase
  console.log('🔍 Verifying Supabase users:');
  const { rows: verifyUsers } = await remote.query('SELECT name, email, role, status FROM users ORDER BY name');
  for (const u of verifyUsers) {
    console.log(`   - ${u.name} (${u.email}) [${u.role}] - ${u.status}`);
  }

  await local.end();
  await remote.end();
}

migrate().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
