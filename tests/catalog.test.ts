import { describe, expect, it } from 'vitest'
import { TOOL_CATALOG, getTool } from '../src/main/services/tools/catalog'

describe('catalogue d’outils', () => {
  it('chaque outil a un id unique et un wingetId unique', () => {
    const ids = TOOL_CATALOG.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(getTool(ids[0]!)).toBeDefined()
    const wingetIds = TOOL_CATALOG.filter((t) => t.wingetId).map((t) => t.wingetId!)
    expect(new Set(wingetIds).size, 'wingetId dupliqué : deux outils installeraient le même paquet').toBe(
      wingetIds.length
    )
  })

  it('winget ont un wingetId, github un repo + asset, git un repo, pip une distribution', () => {
    for (const t of TOOL_CATALOG) {
      if (t.source === 'winget') {
        expect(t.wingetId).toBeTruthy()
        expect(t.githubRepo).toBeUndefined()
      } else if (t.source === 'github') {
        expect(t.githubRepo).toBeTruthy()
        expect(t.githubAsset).toBeTruthy()
        expect(t.pipPackage).toBeUndefined()
      } else if (t.source === 'pip') {
        expect(t.pipPackage).toBeTruthy()
        expect(t.githubRepo).toBeUndefined()
        expect(t.githubAsset).toBeUndefined()
        expect(t.wingetId).toBeUndefined()
      } else {
        expect(t.githubRepo).toBeTruthy()
        expect(t.githubAsset).toBeUndefined()
        expect(t.pipPackage).toBeUndefined()
      }
    }
  })

  it('les outils pip installez un venv isolé et un binaire résoluble', () => {
    const pip = TOOL_CATALOG.filter((t) => t.source === 'pip')
    expect(pip.length).toBeGreaterThanOrEqual(4)
    const dists = pip.map((t) => t.pipPackage!)
    expect(new Set(dists).size, 'distribution PyPI dupliquée').toBe(dists.length)
    for (const t of pip) {
      // Le script console vit sous .venv : son nom par défaut est l'id, il doit
      // donc être un nom de fichier et un identifiant accepté par resolveBinary.
      expect(t.id, `id ${t.id} invalide pour resolveBinary`).toMatch(/^[a-z0-9][a-z0-9._-]{0,59}$/i)
      expect(t.exeName ?? t.id).toMatch(/^[A-Za-z0-9._-]+$/)
    }
    // Noms de distributions vérifiés sur pypi.org/pypi/<name>/json
    for (const t of pip) {
      expect(['waymore', 'uro', 'h8mail', 'git-dumper']).toContain(t.pipPackage)
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
    expect(TOOL_CATALOG.length).toBeGreaterThanOrEqual(140)
    // garde-fou anti-rebloat : le catalogue reste centré web bug bounty
    expect(TOOL_CATALOG.length).toBeLessThanOrEqual(160)
    for (const id of ['nmap', 'nuclei', 'subfinder', 'httpx', 'katana', 'naabu', 'dnsx', 'asnmap', 'uncover', 'alterx', 'amass', 'aquatone', 'waybackurls', 'ffuf', 'gobuster', 'dalfox', 'interactsh-client', 'jq', 'ripgrep', 'git', 'python', 'go', 'node', 'yq', 'gitleaks', 'seclists', 'ai-hunter']) {
      expect(getTool(id), `outil manquant : ${id}`).toBeDefined()
    }
  })

  it('les piliers du catalogue élargi sont présents et correctement sourcés', () => {
    for (const id of [
      'feroxbuster',
      'findomain',
      'tlsx',
      'shuffledns',
      'gau',
      'theharvester',
      'bbot',
      'ffuf',
      'commix',
      'wpscan',
      'nikto',
      'chisel',
      'bettercap',
      'rustscan',
      'mitmproxy',
      'trufflehog',
      'burpsuite',
      'zap',
      'jq',
      'syft',
      'trivy'
    ]) {
      const t = getTool(id)
      expect(t, `outil manquant : ${id}`).toBeDefined()
      expect(['winget', 'github', 'git']).toContain(t!.source)
    }
    // les outils github doivent tous pointer un asset de release vérifié
    for (const id of ['feroxbuster', 'findomain', 'tlsx', 'gau', 'trufflehog', 'chisel', 'rustscan', 'bettercap']) {
      const t = getTool(id)!
      expect(t.source, `${id} devrait être installé depuis une release`).toBe('github')
      expect(t.githubAsset, `${id} sans githubAsset`).toBeTruthy()
    }
  })

  it('les outils marqués par défaut restent une sélection raisonnable', () => {
    const prechecked = TOOL_CATALOG.filter((t) => t.defaultChecked).map((t) => t.id)
    expect(prechecked.length).toBeGreaterThan(0)
    expect(prechecked.length).toBeLessThanOrEqual(15)
    // on ne coche jamais un clone de dépôt volumineux par défaut
    for (const t of TOOL_CATALOG.filter((x) => x.defaultChecked)) {
      expect(['seclists', 'payloads-all-things', 'assetnote-wordlists', 'fuzzdb']).not.toContain(t.id)
    }
  })
})
