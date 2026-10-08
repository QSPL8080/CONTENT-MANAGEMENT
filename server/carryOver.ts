import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { pgConnectionConfig } from './pgConfig';
import { DATA_DIR } from './paths';

/**
 * Carry the latest data over when the app is pointed at a NEW, EMPTY database, so nobody
 * falls back to the default password and nothing has to be copied by hand.
 *
 *  1. PREVIOUS_DATABASE_URL (in .env) — the database you used before. On the first start
 *     against an empty database, EVERYTHING is copied from it: accounts with their current
 *     passwords, content, activity, issues, notifications and settings.
 *  2. data/accounts-backup.json — written automatically by the app every time an account is
 *     added or changed (password, name, role, Active/Deactivated). If there is no
 *     PREVIOUS_DATABASE_URL, an empty database gets the accounts back from this file.
 *  3. Only if neither exists is the built-in team list created with the default password.
 */

// Parents before children, so foreign keys are satisfied while copying.
const TABLES_IN_ORDER = ['workspaces', 'users', 'settings', 'content_items', 'activity_logs', 'issues', 'notifications'];

export const ACCOUNTS_BACKUP_FILE = path.join(DATA_DIR, 'accounts-backup.json');

const ACCOUNT_COLUMNS = ['id', 'name', 'email', 'password_hash', 'password_enc', 'avatar', 'role', 'status', 'workspace_id', 'created_at', 'updated_at'];

type Queryable = { query: (text: string, values?: any[]) => Promise<pg.QueryResult<any>> };

async function columnsOf(db: Queryable, table: string): Promise<string[]> {
  const { rows } = await db.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1`,
    [table]
  );
  return rows.map(r => r.column_name);
}

function quoteList(cols: string[]) {
  return cols.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');
}

/** Copies everything from the previous database into the (empty) target. Returns rows copied per table. */
export async function copyFromPreviousDatabase(target: pg.PoolClient, previousUrl: string): Promise<Record<string, number> | null> {
  const source = new pg.Client(pgConnectionConfig(previousUrl));
  await source.connect();
  try {
    const sourceUsers = await source.query('SELECT COUNT(*)::int AS n FROM users').catch(() => null);
    if (!sourceUsers || !sourceUsers.rows[0].n) return null; // nothing to carry over

    const copied: Record<string, number> = {};
    await target.query('BEGIN');
    try {
      // A fresh database already has a default workspace + settings row; replace them.
      await target.query('DELETE FROM settings');
      await target.query('DELETE FROM workspaces');
      for (const table of TABLES_IN_ORDER) {
        const srcCols = await columnsOf(source, table);
        if (srcCols.length === 0) continue;
        const tgtCols = await columnsOf(target, table);
        const cols = srcCols.filter(c => tgtCols.includes(c));
        const { rows } = await source.query(`SELECT COALESCE(json_agg(t), '[]'::json) AS data FROM ${table} t`);
        const data = rows[0].data as any[];
        copied[table] = data.length;
        if (data.length === 0) continue;
        const list = quoteList(cols);
        await target.query(
          `INSERT INTO ${table} (${list}) SELECT ${list} FROM json_populate_recordset(NULL::${table}, $1::json)`,
          [JSON.stringify(data)]
        );
      }
      await target.query(
        `SELECT setval(pg_get_serial_sequence('settings', 'id'), COALESCE((SELECT MAX(id) FROM settings), 1))`
      );
      await target.query('COMMIT');
      return copied;
    } catch (err) {
      await target.query('ROLLBACK').catch(() => {});
      throw err;
    }
  } finally {
    await source.end().catch(() => {});
  }
}

/** Writes every account (with its current password hash) to data/accounts-backup.json. */
export async function saveAccountsBackup(db: Queryable): Promise<void> {
  try {
    const have = await columnsOf(db, 'users');
    const cols = ACCOUNT_COLUMNS.filter(c => have.includes(c));
    const { rows } = await db.query(`SELECT ${quoteList(cols)} FROM users ORDER BY created_at`);
    if (rows.length === 0) return; // never overwrite a good backup with an empty one
    fs.mkdirSync(path.dirname(ACCOUNTS_BACKUP_FILE), { recursive: true });
    const tmp = `${ACCOUNTS_BACKUP_FILE}.tmp`;
    fs.writeFileSync(
      tmp,
      JSON.stringify({ saved_at: new Date().toISOString(), accounts: rows }, null, 2),
      { mode: 0o600 }
    );
    fs.renameSync(tmp, ACCOUNTS_BACKUP_FILE);
  } catch (err: any) {
    console.warn(`⚠️  Could not save accounts backup: ${err.message}`);
  }
}

/** Restores accounts from data/accounts-backup.json into an empty users table. Returns how many. */
export async function restoreAccountsBackup(target: pg.PoolClient): Promise<number> {
  if (!fs.existsSync(ACCOUNTS_BACKUP_FILE)) return 0;
  let accounts: any[] = [];
  try {
    accounts = JSON.parse(fs.readFileSync(ACCOUNTS_BACKUP_FILE, 'utf8')).accounts || [];
  } catch (err: any) {
    console.warn(`⚠️  Accounts backup is unreadable, ignoring it: ${err.message}`);
    return 0;
  }
  if (accounts.length === 0) return 0;
  const have = await columnsOf(target, 'users');
  const cols = ACCOUNT_COLUMNS.filter(c => have.includes(c) && c !== 'workspace_id');
  const list = quoteList(cols);
  const res = await target.query(
    `INSERT INTO users (${list}) SELECT ${list} FROM json_populate_recordset(NULL::users, $1::json)
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(accounts)]
  );
  return res.rowCount || 0;
}
