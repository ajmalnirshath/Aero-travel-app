import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

fs.mkdirSync(path.resolve('data'), { recursive: true })
export const db = new Database(path.resolve('data/aero.db'))
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'requested',
  vehicle TEXT NOT NULL,
  pickup_label TEXT NOT NULL,
  pickup_lat REAL NOT NULL,
  pickup_lng REAL NOT NULL,
  dest_label TEXT NOT NULL,
  dest_lat REAL NOT NULL,
  dest_lng REAL NOT NULL,
  distance_km REAL NOT NULL,
  duration_min INTEGER NOT NULL,
  fare REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Guest',
  phone TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en-IN'
);
INSERT OR IGNORE INTO profile (id) VALUES (1);
`)
