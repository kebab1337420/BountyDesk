import { describe, expect, it } from 'vitest'
import { buildPlan, selectTargets } from '../src/main/services/scan/plan'
import type { ScopeDomain } from '../src/shared/ipc'

function d(partial: Partial<ScopeDomain> & { endpoint: string }): ScopeDomain {
  return {
    id: partial.id ?? Math.random().toString(),
    type: partial.type ?? 'in-scope',
    endpoint: partial.endpoint,
    tier: partial.tier ?? 'low',
    description: partial.description ?? '',
    inScope: partial.inScope ?? true,
  }
}

describe('selectTargets', () => {
  it('garde uniquement les cibles in-scope http(s) en dédupliquant et normalisant', () => {
    const scope: ScopeDomain[] = [
      d({ endpoint: 'https://app.example.com/' }),
      d({ endpoint: 'https://app.example.com' }),
      d({ endpoint: 'example.org' }),
      d({ endpoint: 'https://out.example.com', inScope: false }),
      d({ endpoint: 'ftp://legacy.example.com' }),
      d({ endpoint: 'not a url' }),
    ]
    const targets = selectTargets(scope)
    expect(targets).toEqual(['https://app.example.com', 'https://example.org'])
  })

  it('renvoie une liste vide quand il n’y a aucune cible valide', () => {
    expect(selectTargets([d({ endpoint: 'https://x.example.com', inScope: false })])).toEqual([])
  })
})

describe('buildPlan', () => {
  const targets = ['https://a.example.com']
  it('produit des étapes pour chaque profil', () => {
    for (const depth of ['low', 'med', 'high'] as const) {
      const plan = buildPlan(depth, targets, 5)
      expect(plan.depth).toBe(depth)
      expect(plan.targets).toEqual(targets)
      expect(plan.steps.length).toBeGreaterThan(0)
      expect(plan.steps[0]!.tool).toBe('curl')
    }
  })

  it('high ajoute ffuf, low ne scanne pas high/critical', () => {
    const low = buildPlan('low', targets, 1)
    const high = buildPlan('high', targets, 1)
    expect(low.steps.some((s) => s.tool === 'ffuf')).toBe(false)
    expect(high.steps.some((s) => s.tool === 'ffuf')).toBe(true)
    expect(high.steps.some((s) => s.args.includes('low,medium,high,critical'))).toBe(true)
  })

  it('respecte le rate limit fourni', () => {
    const plan = buildPlan('med', targets, 42)
    for (const s of plan.steps.filter((x) => x.tool === 'nuclei')) {
      expect(s.args).toContain('42')
    }
  })
})