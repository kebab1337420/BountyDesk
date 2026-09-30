import { mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assetFilterFor,
  assetPlatform,
  exeCandidates,
  exeSuffix,
  hasPortableBinary,
  hostPlatform,
  isWindows,
  makeExecutable,
  portableBinaryName,
  releaseTarget,
  selectReleaseAsset
} from '../src/main/services/tools/platform'
import type { ToolDefinition } from '../src/main/services/tools/catalog'

const assets = (names: string[]) =>
  names.map((n) => ({ name: n, browser_download_url: `https://x/${n}` }))

describe('platform', () => {
  it('déduit la plateforme de l’hôte et la cible de release', () => {
    const host = hostPlatform()
    expect(['win32', 'linux', 'darwin']).toContain(host)
    expect(isWindows()).toBe(host === 'win32')
    expect(releaseTarget()).toBe(host === 'win32' ? 'windows' : host)
    expect(exeSuffix()).toBe(host === 'win32' ? '.exe' : '')
  })

  it('classe un asset par plateforme, darwin avant windows', () => {
    // piège : "darwin" contient la sous-chaîne "win", l'ordre de test est capital
    expect(assetPlatform('interactsh-client_1.4.0_darwin_amd64.zip')).toBe('darwin')
    expect(assetPlatform('interactsh-client_1.4.0_windows_amd64.zip')).toBe('windows')
    expect(assetPlatform('nuclei_3.11.1_linux_amd64.zip')).toBe('linux')
    expect(assetPlatform('rustscan_x86_64-linux-rustscan.tar.gz.zip')).toBe('linux')
    expect(assetPlatform('tool_1.0_linux_musl.zip')).toBe('linux')
    expect(assetPlatform('tool_1.0_mingw64.zip')).toBe('windows')
    expect(assetPlatform('tool_1.0_msvc.zip')).toBe('windows')
    // plateformes non cibles : classées "unknown" pour ne jamais être retenues
    expect(assetPlatform('tool_1.0_freebsd_amd64.zip')).toBe('unknown')
    expect(assetPlatform('tool_1.0_checkouts')).toBe('unknown')
  })
})

describe('selectReleaseAsset', () => {
  it('retient le build linux quand le filtre matche plusieurs plateformes', () => {
    const url = selectReleaseAsset('projectdiscovery/interactsh', 'client', assets([
      'interactsh-client_1.4.0_darwin_amd64.zip',
      'interactsh-client_1.4.0_darwin_arm64.zip',
      'interactsh-client_1.4.0_linux_386.zip',
      'interactsh-client_1.4.0_linux_amd64.zip',
      'interactsh-client_1.4.0_linux_arm64.zip',
      'interactsh-client_1.4.0_windows_386.zip',
      'interactsh-client_1.4.0_windows_amd64.zip',
      'interactsh-client_1.4.0_windows_arm64.zip'
    ]), 'linux')
    expect(url).toBe('https://x/interactsh-client_1.4.0_linux_amd64.zip')
  })

  it('garde l’asset windows pour la cible windows', () => {
    const url = selectReleaseAsset('projectdiscovery/interactsh', 'client', assets([
      'interactsh-client_1.4.0_linux_amd64.zip',
      'interactsh-client_1.4.0_darwin_amd64.zip',
      'interactsh-client_1.4.0_windows_amd64.zip'
    ]), 'windows')
    expect(url).toBe('https://x/interactsh-client_1.4.0_windows_amd64.zip')
  })

  it('écarte le build musl quand le filtre retain la variante gnu (dalfox)', () => {
    const url = selectReleaseAsset('hawhul/dalfox', 'linux-x86_64.tar.gz', assets([
      'dalfox-v3.2.3-linux-x86_64.tar.gz',
      'dalfox-v3.2.3-linux-x86_64-musl.tar.gz'
    ]), 'linux')
    expect(url).toBe('https://x/dalfox-v3.2.3-linux-x86_64.tar.gz')
  })

  it('écarte le 32 bits quand le nom ne dit pas amd64 (findomain)', () => {
    const url = selectReleaseAsset('findomain/findomain', 'findomain-linux', assets([
      'findomain-linux-i386.zip',
      'findomain-linux.zip',
      'findomain-osx-x86_64.zip'
    ]), 'linux')
    expect(url).toBe('https://x/findomain-linux.zip')
  })

  it('ne retient que les extensions d’archive', () => {
    const url = selectReleaseAsset('x/y', 'linux_amd64', assets([
      'tool_1.0_linux_amd64.zip',
      'tool_1.0_linux_amd64.zip.sha256',
      'tool_1.0_checksums_linux_amd64.txt',
      'tool_1.0_linux_amd64.deb'
    ]), 'linux')
    expect(url).toBe('https://x/tool_1.0_linux_amd64.zip')
  })

  it('lève une erreur explicite quand rien ne correspond', () => {
    expect(() => selectReleaseAsset('x/y', 'linux_amd64', assets(['tool_1.0_windows_amd64.zip']), 'linux'))
      .toThrow(/Aucun asset linux/)
    expect(() => selectReleaseAsset('x/y', 'linux_amd64', undefined, 'linux'))
      .toThrow(/Aucun asset linux/)
  })

  it('lève une erreur quand plusieurs candidats subsistent', () => {
    // deux assets qui contiennent tous deux le fragment, même plateforme, même arch :
    // ni la préférence 64 bits ni l'exclusion 32 bits ne peuvent départager
    expect(() => selectReleaseAsset('p/i', 'client', assets([
      'interactsh-client_1.4.0_linux_amd64.zip',
      'interactsh-client-dev_1.4.0_linux_amd64.zip'
    ]), 'linux')).toThrow(/ambigu/)
  })
})

describe('résolution du binaire portable', () => {
  it('liste les candidats dans l’ordre de la plateforme', () => {
    const names = exeCandidates('nuclei')
    expect(names).toContain('nuclei')
    expect(names).toContain('nuclei.exe')
    expect(names[0]).toBe(isWindows() ? 'nuclei.exe' : 'nuclei')
  })

  it('respecte exeName quand le binaire ne porte pas l’id (chaos)', () => {
    expect(exeCandidates('chaos', 'chaos-client')).toEqual(
      isWindows() ? ['chaos-client.exe', 'chaos-client'] : ['chaos-client', 'chaos-client.exe']
    )
    expect(portableBinaryName('chaos', 'chaos-client')).toBe(
      isWindows() ? 'chaos-client.exe' : 'chaos-client'
    )
  })

  it('déduit le fichier portable du suffixe de la plateforme', () => {
    expect(portableBinaryName('ffuf')).toBe(`ffuf${exeSuffix()}`)
  })

  it('détecte un binaire portable présent dans l’un des dossiers candidats', () => {
    const root = mkdtempSync(join(tmpdir(), 'bd-platform-'))
    const tool: ToolDefinition = { id: 'tlsx', name: 'tlsx', description: '', category: 'recon', source: 'github', githubRepo: 'p/t', githubAsset: 'windows_amd64', defaultChecked: false }
    expect(hasPortableBinary(root, tool)).toBe(false)
    mkdirSync(join(root, 'tlsx'), { recursive: true })
    writeFileSync(join(root, 'tlsx', portableBinaryName('tlsx')), 'x')
    expect(hasPortableBinary(root, tool)).toBe(true)
  })

  it('ne confond pas un binaire d’un autre outil', () => {
    const root = mkdtempSync(join(tmpdir(), 'bd-platform-'))
    const tool: ToolDefinition = { id: 'tlsx', name: 'tlsx', description: '', category: 'recon', source: 'github', githubRepo: 'p/t', githubAsset: 'windows_amd64', defaultChecked: false }
    mkdirSync(join(root, 'naabu'), { recursive: true })
    writeFileSync(join(root, 'naabu', portableBinaryName('naabu')), 'x')
    expect(hasPortableBinary(root, tool)).toBe(false)
  })
})

describe('assetFilterFor', () => {
  const tool: ToolDefinition = {
    id: 'nuclei',
    name: 'nuclei',
    description: '',
    category: 'recon',
    source: 'github',
    githubRepo: 'projectdiscovery/nuclei',
    githubAsset: 'windows_amd64',
    githubAssetLinux: 'linux_amd64',
    defaultChecked: false
  }

  it('utilise l’asset linux pour la cible linux', () => {
    expect(assetFilterFor(tool, 'linux')).toBe('linux_amd64')
  })

  it('retombe sur l’asset windows pour les autres cibles', () => {
    expect(assetFilterFor(tool, 'windows')).toBe('windows_amd64')
    expect(assetFilterFor(tool, 'darwin')).toBe('windows_amd64')
  })

  it('retombe sur l’asset windows si aucun asset linux n’est déclaré', () => {
    const noLinux: ToolDefinition = { ...tool, githubAssetLinux: undefined }
    expect(assetFilterFor(noLinux, 'linux')).toBe('windows_amd64')
  })
})

describe('makeExecutable', () => {
  it('rend un binaire exécutable (no-op sur Windows)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bd-exec-'))
    const bin = join(dir, 'tool')
    writeFileSync(bin, 'x')
    expect(() => makeExecutable(bin)).not.toThrow()
    if (!isWindows()) {
      // eslint-disable-next-line no-bitwise
      expect(statSync(bin).mode & 0o111).toBeGreaterThan(0)
    }
  })

  it('n’échoue pas sur un fichier absent (système de fichiers en lecture seule)', () => {
    expect(() => makeExecutable(join(tmpdir(), 'bd-does-not-exist-xyz'))).not.toThrow()
  })
})
