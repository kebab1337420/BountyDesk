import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { hostname } from 'node:os'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { openDb } from '../boite/src/db.ts'
import { BoiteError } from '../boite/src/errors.ts'
import * as store from '../boite/src/store.ts'

let dir = ''
let db: DatabaseSync

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'boite-'))
  db = openDb(join(dir, 'boite.db'))
})

afterEach(() => {
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

// Renvoie le code d'une erreur BoiteError ; échoue si rien n'est levé.
function codeOf(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    if (error instanceof BoiteError) return error.code
    throw error
  }
  throw new Error('une erreur BoiteError était attendue')
}

function countMessages(): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM messages').get() as { n: number }
  return row.n
}

describe('agents', () => {
  it('création, machine locale, doublon et identifiant invalide', () => {
    const agent = store.createAgent(db, { name: 'Bêta Scanner', threadId: 'beta' })
    expect(agent.thread_id).toBe('beta')
    expect(agent.state).toBe('idle')
    expect(agent.machine).toBe(hostname())
    expect(agent.name).toBe('Bêta Scanner')

    expect(codeOf(() => store.createAgent(db, { name: 'X', threadId: 'beta' }))).toBe('USAGE')
    expect(codeOf(() => store.createAgent(db, { name: 'X', threadId: 'Invalide!' }))).toBe('USAGE')
    expect(codeOf(() => store.createAgent(db, { name: '   ' }))).toBe('USAGE')
  })

  it('adresses : inconnue, malformée, machine distante', () => {
    expect(store.getAgent(db, 'zzz')).toBeNull()
    expect(codeOf(() => store.getAgent(db, 'a/b/c'))).toBe('ADDRESS')
    expect(codeOf(() => store.getAgent(db, 'machine-distante/id'))).toBe('REMOTE_UNSUPPORTED')
    expect(codeOf(() => store.getAgent(db, '/id'))).toBe('ADDRESS')

    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    expect(store.getAgent(db, 'alpha')).not.toBeNull()
    expect(codeOf(() => store.sendMessage(db, { address: 'machine-distante/id', body: 'tache: x' }))).toBe(
      'REMOTE_UNSUPPORTED'
    )
    expect(codeOf(() => store.sendMessage(db, { address: 'inconnu', body: 'tache: x' }))).toBe(
      'NOT_FOUND'
    )
  })

  it('list exclut les archivés sans --all', () => {
    store.createAgent(db, { name: 'A', threadId: 'a' })
    store.createAgent(db, { name: 'B', threadId: 'b' })
    store.archiveAgent(db, 'b')
    expect(store.listAgents(db).map((a) => a.thread_id)).toEqual(['a'])
    expect(store.listAgents(db, { all: true })).toHaveLength(2)
  })
})

describe('admission et livraison', () => {
  it('send au repos : livré, agent mis en file, rien suspendu', () => {
    const agent = store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    const outcome = store.sendMessage(db, {
      address: 'alpha',
      body: 'corrige le formulaire de login',
      ready: false
    })
    expect(outcome.held).toBe(false)
    expect(outcome.message.status).toBe('delivered')
    const after = store.getAgent(db, 'alpha')
    expect(after?.state).toBe('queued')
    expect(after?.projects_suspended).toBe(0)
    expect(after?.updated_at).toBeGreaterThanOrEqual(agent.updated_at)
  })

  it('pause retient la livraison, resume livre et réactive les projets', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    store.pauseAgent(db, 'alpha')

    const outcome = store.sendMessage(db, {
      address: 'alpha',
      body: 'tache: ajoute le test de regression',
      projects: ['auth']
    })
    expect(outcome.held).toBe(true)
    expect(outcome.message.status).toBe('held')
    let agent = store.getAgent(db, 'alpha')
    expect(agent?.state).toBe('paused')
    expect(agent?.projects_suspended).toBe(1)
    expect(agent?.projects).toContain('auth')

    agent = store.resumeAgent(db, 'alpha')
    expect(agent?.state).toBe('queued')
    expect(agent?.projects_suspended).toBe(0)
    expect(store.allMessages(db, 'alpha').map((m) => m.status)).toEqual(['delivered'])
  })

  it('archivé : indisponible, le fil n\'est pas touché', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    store.archiveAgent(db, 'alpha')
    const before = countMessages()
    expect(codeOf(() => store.sendMessage(db, { address: 'alpha', body: 'tache: x' }))).toBe(
      'ARCHIVED'
    )
    expect(countMessages()).toBe(before)

    store.restoreAgent(db, 'alpha')
    expect(store.sendMessage(db, { address: 'alpha', body: 'tache: x' }).held).toBe(false)
  })

  it('occupé : --ready exigé, disruption avertie', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    store.sendMessage(db, { address: 'alpha', body: 'tache: premiere' })
    store.runAgent(db, 'alpha')

    expect(codeOf(() => store.sendMessage(db, { address: 'alpha', body: 'tache: seconde' }))).toBe(
      'NEEDS_READY'
    )

    const outcome = store.sendMessage(db, {
      address: 'alpha',
      body: 'tache: seconde',
      ready: true
    })
    expect(outcome.warnings.join(' ')).toMatch(/interruption/)
    expect(store.getAgent(db, 'alpha')?.state).toBe('running')
  })

  it('courtoisie refusée avant tout verdict', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    expect(codeOf(() => store.sendMessage(db, { address: 'alpha', body: 'merci' }))).toBe('COURTESY')
    expect(countMessages()).toBe(0)
    expect(codeOf(() => store.sendMessage(db, { address: 'alpha', body: '   ' }))).toBe('EMPTY')
  })

  it('une réponse passe pendant que l\'agent travaille', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    const sent = store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
    store.runAgent(db, 'alpha')
    const outcome = store.replyMessage(db, {
      messageId: sent.message.id,
      body: 'correctif livré dans la branche fix/login'
    })
    expect(outcome.message.status).toBe('delivered')
    expect(outcome.warnings).toEqual([])
  })
})

describe('réponses', () => {
  it('la réponse prend le sens inverse et référence le message', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    const sent = store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
    expect(sent.message.direction).toBe('out')

    const agentReply = store.replyMessage(db, {
      messageId: sent.message.id,
      body: 'correctif livré, prêt à relancer le scan'
    })
    expect(agentReply.message.direction).toBe('in')
    expect(agentReply.message.reply_to).toBe(sent.message.id)

    const ourReply = store.replyMessage(db, {
      messageId: agentReply.message.id,
      body: 'validé, passe au module suivant'
    })
    expect(ourReply.message.direction).toBe('out')
    expect(ourReply.message.reply_to).toBe(agentReply.message.id)
  })

  it('réponse à un message introuvable', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    expect(codeOf(() => store.replyMessage(db, { messageId: 999, body: 'x' }))).toBe('NOT_FOUND')
  })
})

describe('lecture, journal, recherche', () => {
  it('read marque les entrées comme lues', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    const sent = store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
    store.replyMessage(db, { messageId: sent.message.id, body: 'correction envoyée' })

    const first = store.readThread(db, 'alpha')
    expect(first.map((m) => m.status)).toEqual(['delivered', 'read'])
    const second = store.readThread(db, 'alpha')
    expect(second.map((m) => m.status)).toEqual(['delivered', 'read'])
  })

  it('log limite aux derniers messages, dans l\'ordre chronologique', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    for (let i = 1; i <= 3; i++) {
      store.sendMessage(db, { address: 'alpha', body: `tache: numero ${i}`, ready: true })
    }
    const log = store.logThread(db, 'alpha', 2)
    expect(log).toHaveLength(2)
    expect(log.map((m) => m.body)).toEqual(['tache: numero 2', 'tache: numero 3'])
  })

  it('find cherche dans le nom, l\'identifiant et les corps, sans accent', () => {
    store.createAgent(db, { name: 'Bêta Scanner', threadId: 'beta' })
    store.createAgent(db, { name: 'Gamma', threadId: 'gamma' })
    store.sendMessage(db, { address: 'gamma', body: "Édition du rapport d'audit" })

    expect(store.findAgents(db, ['bêta']).map((r) => r.agent.thread_id)).toEqual(['beta'])
    expect(store.findAgents(db, ['edition']).map((r) => r.agent.thread_id)).toEqual(['gamma'])
    expect(store.findAgents(db, ['audit'])[0]?.snippet).toMatch(/Édition/)
    expect(store.findAgents(db, ['gamma', 'audit']).map((r) => r.agent.thread_id)).toEqual(['gamma'])
    expect(store.findAgents(db, ['beta', 'zzz'])).toEqual([])
  })
})

describe('transitions', () => {
  it('run / done / --waiting / edit', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    expect(codeOf(() => store.runAgent(db, 'alpha'))).toBe('INVALID_STATE')

    store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
    expect(store.runAgent(db, 'alpha').state).toBe('running')

    const done = store.doneAgent(db, 'alpha')
    expect(done.state).toBe('idle')
    expect(done.last_activity).toBe('complete')
    expect(done.completed_at).toBeGreaterThan(0)

    store.sendMessage(db, { address: 'alpha', body: 'tache: suite' })
    store.runAgent(db, 'alpha')
    const waiting = store.doneAgent(db, 'alpha', { waiting: true })
    expect(waiting.state).toBe('waiting')

    const completedAt = store.getAgent(db, 'alpha')?.completed_at ?? 0
    const edited = store.editAgent(db, 'alpha')
    expect(edited.last_activity).toBe('edit')
    expect(edited.completed_at).toBe(completedAt)
    expect(codeOf(() => store.doneAgent(db, 'alpha'))).toBe('INVALID_STATE')
  })

  it('pause / resume / archive / restore et leurs préconditions', () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    expect(codeOf(() => store.resumeAgent(db, 'alpha'))).toBe('INVALID_STATE')
    expect(store.pauseAgent(db, 'alpha').state).toBe('paused')
    expect(codeOf(() => store.pauseAgent(db, 'alpha'))).toBe('INVALID_STATE')

    expect(store.archiveAgent(db, 'alpha').state).toBe('archived')
    expect(codeOf(() => store.pauseAgent(db, 'alpha'))).toBe('INVALID_STATE')
    expect(codeOf(() => store.runAgent(db, 'alpha'))).toBe('INVALID_STATE')

    const restored = store.restoreAgent(db, 'alpha')
    expect(restored.state).toBe('idle')
    expect(restored.projects_suspended).toBe(0)
  })
})

describe('attente', () => {
  it('wait sur un agent déjà libre ne bloque pas', async () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    const outcome = await store.waitForState(db, 'alpha', { timeoutMs: 500 })
    expect(outcome).toEqual({ state: 'idle', reason: 'state' })
  })

  it('wait expire sur un agent occupé', async () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
    store.runAgent(db, 'alpha')
    await expect(store.waitForState(db, 'alpha', { timeoutMs: 150 })).rejects.toMatchObject({
      code: 'TIMEOUT'
    })
  })

  it('waitForReply détecte la réponse de l\'agent', async () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    const sent = store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
    store.replyMessage(db, { messageId: sent.message.id, body: 'correction livrée' })
    const outcome = await store.waitForReply(db, 'alpha', {
      afterId: sent.message.id,
      timeoutMs: 1000
    })
    expect(outcome.reason).toBe('reply')
  })

  it('waitForReply expire sans réponse', async () => {
    store.createAgent(db, { name: 'Alpha', threadId: 'alpha' })
    const sent = store.sendMessage(db, { address: 'alpha', body: 'tache: corrige login' })
    await expect(
      store.waitForReply(db, 'alpha', { afterId: sent.message.id, timeoutMs: 150 })
    ).rejects.toMatchObject({ code: 'TIMEOUT' })
  })
})
