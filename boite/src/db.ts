import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

// La boîte vit dans son propre dossier : indépendante d'Electron, utilisable
// depuis un terminal et accessible en parallèle par plusieurs processus.
export function boiteDir(): string {
  return process.env.BOITE_DIR ?? join(homedir(), '.boite')
}

export function dbPath(): string {
  return join(boiteDir(), 'boite.db')
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agents (
  thread_id          TEXT PRIMARY KEY,
  machine            TEXT NOT NULL,
  name               TEXT NOT NULL,
  name_norm          TEXT NOT NULL,
  state              TEXT NOT NULL DEFAULT 'idle'
                     CHECK (state IN ('idle','queued','running','waiting','paused','archived')),
  projects           TEXT NOT NULL DEFAULT '[]',
  projects_suspended INTEGER NOT NULL DEFAULT 0,
  last_activity      TEXT
                     CHECK (last_activity IS NULL OR last_activity IN ('complete','edit')),
  completed_at       INTEGER,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id  TEXT NOT NULL REFERENCES agents(thread_id) ON DELETE CASCADE,
  direction  TEXT NOT NULL CHECK (direction IN ('in','out')),
  body       TEXT NOT NULL,
  body_norm  TEXT NOT NULL,
  refs       TEXT NOT NULL DEFAULT '[]',
  status     TEXT NOT NULL CHECK (status IN ('held','delivered','read')),
  reply_to   INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, id);
CREATE INDEX IF NOT EXISTS idx_messages_body ON messages(body_norm);
`

// WAL : un CLI `wait` peut relire pendant qu'un autre processus écrit.
export function openDb(path = dbPath()): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}
