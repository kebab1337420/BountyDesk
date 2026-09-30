import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let mockUserData = ''

vi.mock('electron', () => ({
  app: { getPath: () => mockUserData },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
  ipcMain: { handle: vi.fn() },
}))

const spawnMock = vi.fn()
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

import { installTool } from '../src/main/services/tools/installer'

function childMock(code: number) {
  return {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event: string, cb: (arg?: unknown) => void) => {
      if (event === 'close') cb(code)
      return childMock(code)
    }),
    error: null,
  }
}

describe('installTool — reprise d’un clone git complet sans marqueur', () => {
  it('réécrit le marqueur et ne re-clone pas quand le repo .git est déjà valide (cas seclists)', async () => {
    mockUserData = mkdtempSync(join(tmpdir(), 'bountydesk-gitrepo-'))
    const dest = join(mockUserData, 'tools', 'seclists')
    mkdirSync(join(dest, '.git'), { recursive: true })
    writeFileSync(join(dest, '.git', 'HEAD'), 'ref: refs/heads/master')
    writeFileSync(join(dest, 'README.md'), 'r')

    spawnMock.mockImplementation((cmd: string, args: string[], _opts: unknown) => {
      if (cmd === 'git' && args[0] === '-C') return childMock(0)
      return childMock(1)
    })

    const res = await installTool('seclists')
    expect(res.ok).toBe(true)
    expect(spawnMock).toHaveBeenCalledWith(
      'git',
      ['-C', dest, 'rev-parse', '--verify', 'HEAD'],
      expect.anything()
    )
    const cloneCalls = spawnMock.mock.calls.filter(
      (c) => c[0] === 'git' && Array.isArray(c[1]) && c[1][0] === 'clone'
    )
    expect(cloneCalls).toHaveLength(0)
  })

  it('clone proprement quand le dossier n’est pas un clone git (repart de zéro)', async () => {
    mockUserData = mkdtempSync(join(tmpdir(), 'bountydesk-gitfresh-'))
    const dest = join(mockUserData, 'tools', 'seclists')
    mkdirSync(dest, { recursive: true })
    writeFileSync(join(dest, 'README.md'), 'r')

    spawnMock.mockImplementation((_cmd: string, args: string[], _opts: unknown) => {
      if (Array.isArray(args) && args[0] === 'clone') return childMock(0)
      return childMock(1)
    })

    const res = await installTool('seclists')
    expect(res.ok).toBe(true)
    const cloneCalls = spawnMock.mock.calls.filter(
      (c) => c[0] === 'git' && Array.isArray(c[1]) && c[1][0] === 'clone'
    )
    expect(cloneCalls).toHaveLength(1)
  })
})