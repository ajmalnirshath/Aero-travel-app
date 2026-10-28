/**
 * AERO database — Neon serverless Postgres.
 * Uses postgres.js with Neon's pooled connection (serverless-friendly,
 * survives cold starts better than direct connections).
 */
import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Add it to .env (Neon pooled connection string).')
}

// sslmode=require is already in the Neon URL; this makes postgres.js happy on Windows too.
export const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 10, // pooled connection → keep this small
  idle_timeout: 20,
  connect_timeout: 10,
})

/** Create tables on first run. Safe to call every server start. */
export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id            TEXT PRIMARY KEY,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      status        TEXT NOT NULL DEFAULT 'live',
      vehicle       TEXT NOT NULL,
      fare          INTEGER NOT NULL,
      distance_km   REAL NOT NULL,
      eta_min       INTEGER NOT NULL,
      pickup_label  TEXT NOT NULL,
      pickup_addr   TEXT,
      pickup_lat    REAL NOT NULL,
      pickup_lng    REAL NOT NULL,
      dest_label    TEXT NOT NULL,
      dest_addr     TEXT,
      dest_lat      REAL NOT NULL,
      dest_lng      REAL NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS saved_places (
      id         TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      address    TEXT,
      lat        REAL NOT NULL,
      lng        REAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS profile (
      id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      name       TEXT NOT NULL DEFAULT 'AERO Rider',
      phone      TEXT,
      language   TEXT NOT NULL DEFAULT 'en-IN',
      text_scale TEXT NOT NULL DEFAULT 'md',
      contrast   TEXT NOT NULL DEFAULT 'normal'
    )
  `
  // Ensure the single profile row exists
  await sql`INSERT INTO profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING`
  console.log('Neon database ready ✓')
}