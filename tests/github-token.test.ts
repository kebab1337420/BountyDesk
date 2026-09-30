import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let mockUserData = ''

vi.mock('electron', () => ({
  app: { getPath: () => mockUserData },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from('enc:' + s),
    decryptString: (b: Buffer) => b.toString().slice(4),
  },
  ipcMain: { handle: vi.fn() },
}))

import { clearGithubToken, loadGithubToken, saveGithubToken } from '../src/main/storage'

describe('token GitHub chiffré (storage)', () => {
  it('est vide par défaut', () => {
    mockUserData = mkdtempSync(join(tmpdir(), 'bountydesk-ghtok-'))
    expect(loadGithubToken()).toBeNull()
  })

  it('suit un roundtrip sauvegarde → lecture', () => {
    mockUserData = mkdtempSync(join(tmpdir(), 'bountydesk-ghtok-'))
    saveGithubToken('ghp_test_token')
    expect(loadGithubToken()).toBe('ghp_test_token')
  })

  it('se vide avec clearGithubToken', () => {
    mockUserData = mkdtempSync(join(tmpdir(), 'bountydesk-ghtok-'))
    saveGithubToken('ghp_test_token')
    clearGithubToken()
    expect(loadGithubToken()).toBeNull()
  })
})