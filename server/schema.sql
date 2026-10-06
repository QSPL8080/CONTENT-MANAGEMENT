-- ContentFlow PostgreSQL schema (reference copy).
-- You do NOT need to run this by hand: on start the server creates the database
-- (default name: content_management) if it is missing, applies this schema, creates the
-- Super Admin and the team list (server/team.ts). See README.md.

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
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin','admin','manager','graphic_designer','editor','poster'));

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
