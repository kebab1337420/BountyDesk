import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('electron', () => ({
  app: { getPath: () => mkdtempSync(join(tmpdir(), 'bountydesk-app-')) },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
  ipcMain: { handle: vi.fn() },
}))

import { findFile, selectWindowsAsset } from '../src/main/services/tools/installer'

describe('findFile (extraction d’archives GitHub)', () => {
  it('trouve un binaire à la racine par basename', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bountydesk-findfile-'))
    const zip = join(dir, 'nuclei.zip')
    const nope = join(dir, 'nope')
    mkdirSync(nope)
    writeFileSync(join(nope, 'x.exe'), 'x')
    writeFileSync(zip, 'zip')
    const found = findFile(dir, (name) => name.toLowerCase() === 'nuclei.zip')
    expect(found).toBe(zip)
    rmSync(dir, { recursive: true, force: true })
  })

  it('trouve un exe imbriqué dans un sous-dossier (ex: amass_windows_amd64/amass.exe)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bountydesk-findfile-'))
    const inner = join(dir, 'amass_windows_amd64')
    mkdirSync(inner)
    writeFileSync(join(dir, 'README.md'), 'r')
    writeFileSync(join(inner, 'amass.exe'), 'bin')
    const found = findFile(dir, (name) => name.toLowerCase() === 'amass.exe')
    expect(found).toBe(join(inner, 'amass.exe'))
    rmSync(dir, { recursive: true, force: true })
  })

  it('retourne null quand aucun fichier ne correspond', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bountydesk-findfile-'))
    writeFileSync(join(dir, 'LICENSE'), 'l')
    const found = findFile(dir, (name) => name.toLowerCase() === 'nuclei.exe')
    expect(found).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('selectWindowsAsset (sélection d’asset Windows)', () => {
  const assets = (names: string[]) => names.map((name) => ({ name, browser_download_url: `https://x/${name}` }))

  it('match unique direct (interactsh-client)', () => {
    const url = selectWindowsAsset('projectdiscovery/interactsh', 'client', assets([
      'interactsh-server_1.4.0_windows_386.zip',
      'interactsh-client_1.4.0_windows_386.zip',
      'interactsh-client_1.4.0_windows_amd64.zip',
      'interactsh-server_1.4.0_windows_amd64.zip'
    ]))
    expect(url).toBe('https://x/interactsh-client_1.4.0_windows_amd64.zip')
  })

  it('préfère amd64 quand 386 et amd64 matchent', () => {
    const url = selectWindowsAsset('projectdiscovery/tlsx', 'windows_amd64', assets([
      'tlsx_1.4.0_windows_386.zip',
      'tlsx_1.4.0_windows_amd64.zip'
    ]))
    expect(url).toBe('https://x/tlsx_1.4.0_windows_amd64.zip')
  })

  it('jette une erreur sur plusieurs candidats amd64 (client + serveur)', () => {
    expect(() => selectWindowsAsset('projectdiscovery/interactsh', 'windows_amd64', assets([
      'interactsh-client_1.4.0_windows_amd64.zip',
      'interactsh-server_1.4.0_windows_amd64.zip'
    ]))).toThrow(/ambigu/)
  })

  it('jette une erreur quand aucun asset ne matche', () => {
    expect(() => selectWindowsAsset('x/y', 'windows', assets(['tool_1.0_linux_amd64.zip']))).toThrow(/Aucun asset/)
  })

  it('écarte le 32 bits quand le nom ne dit pas amd64 (findomain)', () => {
    const url = selectWindowsAsset('findomain/findomain', 'findomain-windows', assets([
      'findomain-windows-i686.exe.zip',
      'findomain-windows.exe.zip'
    ]))
    expect(url).toBe('https://x/findomain-windows.exe.zip')
  })

  it('restreint aux assets windows même si le filtre matche plusieurs plateformes', () => {
    // liste réelle de la release interactsh v1.4.0 : le filtre "client" matche
    // aussi les builds linux et darwin, seuls les windows doivent être retenus
    // (piège : "darwin" contient la sous-chaîne "win")
    const url = selectWindowsAsset('projectdiscovery/interactsh', 'client', assets([
      'interactsh-client_1.4.0_darwin_amd64.zip',
      'interactsh-client_1.4.0_darwin_arm64.zip',
      'interactsh-client_1.4.0_linux_386.zip',
      'interactsh-client_1.4.0_linux_amd64.zip',
      'interactsh-client_1.4.0_linux_arm64.zip',
      'interactsh-client_1.4.0_windows_386.zip',
      'interactsh-client_1.4.0_windows_amd64.zip',
      'interactsh-client_1.4.0_windows_arm64.zip'
    ]))
    expect(url).toBe('https://x/interactsh-client_1.4.0_windows_amd64.zip')
  })

  it('ignore les fichiers de checksum (seules les archives zip/tgz sont retenues)', () => {
    const url = selectWindowsAsset('x/y', 'windows_amd64', assets([
      'tool_1.0_windows_amd64.zip',
      'tool_1.0_windows_amd64.zip.sha256',
      'tool_1.0_checksums_windows_amd64.txt'
    ]))
    expect(url).toBe('https://x/tool_1.0_windows_amd64.zip')
  })
})
