const { Pool } = require('pg');

let pool = null;
let initialized = false;

function getDatabaseUrl() {
  return process.env.DATABASE_URL || '';
}

function hasDatabase() {
  return Boolean(getDatabaseUrl().trim());
}

function getPool() {
  if (!hasDatabase()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDatabase() {
  if (initialized) return;
  const db = getPool();
  if (!db) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      auth_provider TEXT NOT NULL DEFAULT 'local',
      google_sub TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;`);
  await db.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users(google_sub) WHERE google_sub IS NOT NULL;`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      incidents_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  initialized = true;
}

module.exports = {
  hasDatabase,
  getPool,
  initDatabase
};
