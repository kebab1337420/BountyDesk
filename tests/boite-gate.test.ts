import { describe, expect, it } from 'vitest'
import {
  GRACE_MS,
  gate,
  isWorking,
  lintContent,
  type AgentState,
  type GateAgent,
  type GateMessage
} from '../boite/src/gate.ts'

const NOW = 1_700_000_000_000

function agent(overrides: Partial<GateAgent> = {}): GateAgent {
  return { state: 'idle', lastActivity: 'complete', completedAt: NOW - 60_000, ...overrides }
}

function message(overrides: Partial<GateMessage> = {}): GateMessage {
  return {
    kind: 'send',
    ready: false,
    body: 'corrige le formulaire de login',
    refs: [],
    now: NOW,
    ...overrides
  }
}

describe('isWorking', () => {
  it('working = queued/running/waiting', () => {
    const working: AgentState[] = ['queued', 'running', 'waiting']
    const resting: AgentState[] = ['idle', 'paused', 'archived']
    expect(working.map(isWorking)).toEqual([true, true, true])
    expect(resting.map(isWorking)).toEqual([false, false, false])
  })
})

describe('lintContent', () => {
  it('refuse la courtoisie seule', () => {
    for (const body of ['merci', 'Salut !', 'ping', 'toujours là ?', 'ok', 'des news ?']) {
      expect(lintContent(body, [])?.code, body).toBe('COURTESY')
    }
  })

  it('accepte une tâche ou une ressource', () => {
    expect(lintContent('corrige le formulaire de login', [])).toBeNull()
    expect(lintContent('merci, voici le rapport demandé', [])).toBeNull()
    expect(lintContent('https://example.com/report', [])).toBeNull()
  })

  it('une ressource partagée bypass le linter', () => {
    expect(lintContent('merci', ['https://example.com/fichier'])).toBeNull()
  })

  it('corps vide', () => {
    expect(lintContent('   ', [])?.code).toBe('EMPTY')
  })
})

describe('gate', () => {
  it('archivé : refus, quel que soit le type', () => {
    const state = agent({ state: 'archived' })
    expect(gate(state, message()).verdict).toBe('refuse')
    expect(gate(state, message({ kind: 'reply' })).verdict).toBe('refuse')
    expect(gate(state, message())).toMatchObject({ code: 'ARCHIVED' })
  })

  it('pause : la livraison est retenue', () => {
    expect(gate(agent({ state: 'paused' }), message())).toMatchObject({ verdict: 'hold' })
  })

  it('working + send sans --ready : refus', () => {
    for (const state of ['queued', 'running', 'waiting'] as AgentState[]) {
      const result = gate(agent({ state }), message())
      expect(result, state).toMatchObject({ verdict: 'refuse', code: 'NEEDS_READY' })
    }
  })

  it('working + send + --ready : livré avec avertissement de disruption', () => {
    const result = gate(agent({ state: 'running' }), message({ ready: true }))
    expect(result.verdict).toBe('deliver')
    expect(result.warnings.join(' ')).toMatch(/interruption/)
  })

  it('working + reply : continuation attendue, pas une disruption', () => {
    const result = gate(agent({ state: 'running' }), message({ kind: 'reply' }))
    expect(result).toMatchObject({ verdict: 'deliver' })
    expect(result.warnings).toEqual([])
  })

  it('idle avec complétion récente : contact sans avertissement', () => {
    const result = gate(agent({ completedAt: NOW - GRACE_MS + 1 }), message())
    expect(result).toMatchObject({ verdict: 'deliver', warnings: [] })
  })

  it('idle avec complétion trop vieille : contact découragé', () => {
    const result = gate(agent({ completedAt: NOW - GRACE_MS - 1 }), message())
    expect(result.verdict).toBe('deliver')
    expect(result.warnings.join(' ')).toMatch(/découragé/)
  })

  it('une édition récente n\'ouvre jamais la grâce', () => {
    const result = gate(
      agent({ lastActivity: 'edit', completedAt: NOW - 1 }),
      message()
    )
    expect(result.verdict).toBe('deliver')
    expect(result.warnings.join(' ')).toMatch(/éditions ne comptent pas/)
  })

  it('jamais de complétion : contact découragé', () => {
    const result = gate(agent({ completedAt: null, lastActivity: null }), message())
    expect(result.warnings.join(' ')).toMatch(/aucune complétion/)
  })

  it('courtoisie battue avant tout autre verdict', () => {
    expect(gate(agent({ state: 'archived' }), message({ body: 'merci' }))).toMatchObject({
      code: 'COURTESY'
    })
  })
})
