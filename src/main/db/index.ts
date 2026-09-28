import { app } from 'electron'
import { join } from 'node:path'
import { openDatabase, type Db } from './db'
import { createRepository, type Repository } from './repo'

let db: Db | null = null
let repo: Repository | null = null

export function dbPath(): string {
  return join(app.getPath('userData'), 'bountydesk.db')
}

export function getDb(): Db {
  if (!db) db = openDatabase(dbPath())
  return db
}

export function getRepository(): Repository {
  if (!repo) repo = createRepository(getDb())
  return repo
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
    repo = null
  }
}