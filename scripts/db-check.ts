/**
 * npm run db:check — shows what ContentFlow has stored in PostgreSQL.
 * Read-only. Never prints passwords.
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:8080@localhost:5432/content_management';

const TABLES = ['workspaces', 'users', 'content_items', 'activity_logs', 'issues', 'notifications', 'settings', 'sessions'];

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  const { rows: [db] } = await client.query('SELECT current_database() AS name');
  console.log(`\nDatabase: ${db.name}\n`);

  console.log('Tables (rows):');
  for (const t of TABLES) {
    try {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      console.log(`  ${t.padEnd(16)} ${rows[0].n}`);
    } catch {
      console.log(`  ${t.padEnd(16)} MISSING — start the app once to create it`);
    }
  }

  try {
    const { rows } = await client.query(
      `SELECT name, email, role, status,
              (password_hash <> '') AS has_password,
              must_change_password
         FROM users
        ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'manager' THEN 1
                           WHEN 'graphic_designer' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END, name`
    );
    const label: Record<string, string> = {
      admin: 'Admin', manager: 'Manager',
      graphic_designer: 'Graphic Designer', editor: 'Video Editor', poster: 'Intern',
    };
    console.log('\nTeam accounts:');
    for (const u of rows) {
      const pw = !u.has_password ? 'no password' : u.must_change_password ? 'temporary password' : 'own password';
      console.log(`  ${(label[u.role] || u.role).padEnd(17)} ${u.email.padEnd(36)} ${u.status.padEnd(8)} ${pw}`);
    }
  } catch {
    // users table missing — already reported above
  }
  console.log('');
  await client.end();
}

main().catch((err) => {
  console.error(`\nCould not connect to ${DATABASE_URL.replace(/:[^:@/]+@/, ':****@')}\n${err.message}\n`);
  process.exit(1);
});
