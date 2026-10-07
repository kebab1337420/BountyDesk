import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DatabaseSync } from 'node:sqlite'
import { openDb } from '../boite/src/db.ts'
import * as store from '../boite/src/store.ts'

const CLI = fileURLToPath(new URL('../boite/src/cli.ts', import.meta.url))

let dir = ''

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'boite-cli-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

// Arrange côté magasin, assert côté binaire : une seule exécution de processus
// par test.
function arrange(fn: (db: DatabaseSync) => void): void {
  const db = openDb(join(dir, 'boite.db'))
  fn(db)
  db.close()
}

function cli(args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env: { ...process.env, BOITE_DIR: dir }
    })
    let out = ''
    let err = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => (out += chunk))
    child.stderr.on('data', (chunk: string) => (err += chunk))
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? -1, out, err }))
  })
}

describe('boite (binaire)', () => {
  it('affiche l\'aide', async () => {
    const result = await cli(['--help'])
    expect(result.code).toBe(0)
    expect(result.out).toMatch(/Adresses/)
    expect(result.out).toMatch(/send/)
  })

  it('commande inconnue : code 2', async () => {
    const result = await cli(['inconnu'])
    expect(result.code).toBe(2)
    expect(result.err).toMatch(/USAGE/)
  })

  it('création puis list --json', async () => {
    const created = await cli(['agents', 'create', 'Alpha', '--id', 'alpha'])
    expect(created.code).toBe(0)
    expect(created.out).toContain('alpha')

    const listed = await cli(['agents', 'list', '--json'])
    expect(listed.code).toBe(0)
    const agents = JSON.parse(listed.out) as { address: string; state: string }[]
    expect(agents[0]?.address).toContain('/alpha')
    expect(agents[0]?.state).toBe('idle')
  })

  it('refuse la courtoisie avec le code 3', async () => {
    arrange((db) => store.createAgent(db, { name: 'Alpha', threadId: 'alpha' }))
    const result = await cli(['agents', 'send', 'alpha', 'merci'])
    expect(result.code).toBe(3)
    expect(result.err).toMatch(/COURTESY/)
  })

  it('envoie une tâche et met l\'agent en file', async () => {
    arrange((db) => store.createAgent(db, { name: 'Alpha', threadId: 'alpha' }))
    const sent = await cli(['agents', 'send', 'alpha', 'corrige', 'le', 'formulaire', 'de', 'login'])
    expect(sent.code).toBe(0)
    expect(sent.out).toMatch(/livré/)

    const listed = await cli(['agents', 'list', '--json'])
    const agents = JSON.parse(listed.out) as { state: string }[]
    expect(agents[0]?.state).toBe('queued')
  })

  it('agent occupé : --ready exigé, puis accepté avec avertissement', async () => {
    arrange((db) => {
      store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
      store.sendMessage(db, { address: 'alpha', body: 'tache: premiere' })
      store.runAgent(db, 'alpha')
    })

    const refused = await cli(['agents', 'send', 'alpha', 'tache: seconde'])
    expect(refused.code).toBe(3)
    expect(refused.err).toMatch(/NEEDS_READY/)

    const accepted = await cli(['agents', 'send', 'alpha', 'tache: seconde', '--ready'])
    expect(accepted.code).toBe(0)
    expect(accepted.err).toMatch(/avertissement/)
  })

  it('find repère un agent par le corps de ses messages', async () => {
    arrange((db) => {
      store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
      store.sendMessage(db, { address: 'alpha', body: 'tache: corrige le login' })
    })
    const result = await cli(['agents', 'find', 'login'])
    expect(result.code).toBe(0)
    expect(result.out).toContain('/alpha')
  })

  it('lit un fil et répond au message', async () => {
    arrange((db) => {
      store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
      store.sendMessage(db, { address: 'alpha', body: 'tache: corrige le login' })
    })

    const read = await cli(['agents', 'read', 'alpha', '--json'])
    expect(read.code).toBe(0)
    const messages = JSON.parse(read.out) as { id: number; direction: string }[]
    expect(messages).toHaveLength(1)
    expect(messages[0]?.direction).toBe('out')

    const replied = await cli([
      'agents',
      'reply',
      String(messages[0]?.id),
      'correctif',
      'poussé',
      'sur',
      'fix/login'
    ])
    expect(replied.code).toBe(0)
    expect(replied.out).toMatch(/livré/)

    const after = await cli(['agents', 'read', 'alpha', '--json'])
    const updated = JSON.parse(after.out) as { direction: string; replyTo: number | null }[]
    expect(updated).toHaveLength(2)
    expect(updated[1]?.direction).toBe('in')
    expect(updated[1]?.replyTo).toBe(messages[0]?.id)
  })

  it('fil archivé indisponible puis rétabli', async () => {
    arrange((db) => {
      store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
      store.archiveAgent(db, 'alpha')
    })

    const refused = await cli(['agents', 'send', 'alpha', 'tache: x'])
    expect(refused.code).toBe(3)
    expect(refused.err).toMatch(/ARCHIVED/)

    expect((await cli(['agents', 'restore', 'alpha'])).code).toBe(0)
    expect((await cli(['agents', 'send', 'alpha', 'tache: x'])).code).toBe(0)
  })

  it('wait expire sur un agent en travail', async () => {
    arrange((db) => {
      store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
      store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
      store.runAgent(db, 'alpha')
    })
    const result = await cli(['agents', 'wait', 'alpha', '--timeout', '0.2'])
    expect(result.code).toBe(4)
    expect(result.err).toMatch(/TIMEOUT/)
  })

  it('wait rend la main sur un agent libre', async () => {
    arrange((db) => store.createAgent(db, { name: 'Alpha', threadId: 'alpha' }))
    const result = await cli(['agents', 'wait', 'alpha'])
    expect(result.code).toBe(0)
    expect(result.out).toMatch(/état: idle/)
  })
})
