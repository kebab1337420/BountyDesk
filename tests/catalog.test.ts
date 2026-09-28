import { describe, expect, it } from 'vitest'
import { TOOL_CATALOG, getTool } from '../src/main/services/tools/catalog'

describe('catalogue d’outils', () => {
  it('chaque outil a un id unique', () => {
    const ids = TOOL_CATALOG.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(getTool(ids[0]!)).toBeDefined()
  })

  it('winget ont un wingetId, github un repo + asset, git un repo', () => {
    for (const t of TOOL_CATALOG) {
      if (t.source === 'winget') {
        expect(t.wingetId).toBeTruthy()
      } else if (t.source === 'github') {
        expect(t.githubRepo).toBeTruthy()
        expect(t.githubAsset).toBeTruthy()
      } else {
        expect(t.githubRepo).toBeTruthy()
        expect(t.githubAsset).toBeUndefined()
      }
    }
  })

  it('les catégories sont toutes connues', () => {
    const known = ['recon', 'enumer', 'fuzz', 'network', 'utility', 'ai']
    for (const t of TOOL_CATALOG) {
      expect(known).toContain(t.category)
    }
  })

  it('le framework AI de chasse est présent et non cochable par défaut', () => {
    const ai = getTool('ai-hunter')
    expect(ai).toBeDefined()
    expect(ai!.source).toBe('git')
    expect(ai!.category).toBe('ai')
    expect(ai!.defaultChecked).toBe(false)
    expect(ai!.githubRepo).toMatch(/^[\w.-]+\/[\w.-]+$/)
  })

  it('les ids des outils github sont des noms d’exe valides (kebab-case)', () => {
    for (const t of TOOL_CATALOG) {
      expect(t.id, `id invalide pour ${t.id}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      if (t.source === 'github') {
        expect(t.id, `${t.id} doit correspondre au binaire <id>.exe recherché`).not.toBe('ffuf-recursive')
      }
    }
  })

  it('le catalogue étendu couvre la panoplie recon/fuzz/utility', () => {
    expect(TOOL_CATALOG.length).toBeGreaterThanOrEqual(28)
    for (const id of ['nmap', 'nuclei', 'subfinder', 'httpx', 'katana', 'naabu', 'dnsx', 'asnmap', 'uncover', 'alterx', 'amass', 'aquatone', 'waybackurls', 'ffuf', 'gobuster', 'dalfox', 'interactsh-client', 'jq', 'ripgrep', 'git', 'python', 'go', 'node', 'yq', 'gitleaks', 'seclists', 'ai-hunter']) {
      expect(getTool(id), `outil manquant : ${id}`).toBeDefined()
    }
  })
})