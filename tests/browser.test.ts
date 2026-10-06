import { describe, expect, it, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}))

import { isTrustedShellUrl } from '../src/main/ipc-browser'

// Même chemin que ipc-browser.ts le calcule (ce fichier vit dans src/main).
const shell = pathToFileURL(join(__dirname, '..', 'src', 'renderer', 'browser.html')).href
const savedDevUrl = process.env['ELECTRON_RENDERER_URL']

afterEach(() => {
  if (savedDevUrl === undefined) delete process.env['ELECTRON_RENDERER_URL']
  else process.env['ELECTRON_RENDERER_URL'] = savedDevUrl
})

describe('isTrustedShellUrl (garde de navigation de la fenêtre Assistant)', () => {
  it('accepte uniquement la page de confiance et sa variante ?url=', () => {
    delete process.env['ELECTRON_RENDERER_URL']
    expect(isTrustedShellUrl(shell)).toBe(true)
    expect(isTrustedShellUrl(`${shell}?url=https%3A%2F%2Fexample.test`)).toBe(true)
  })

  it('refuse tout autre fichier local', () => {
    delete process.env['ELECTRON_RENDERER_URL']
    expect(isTrustedShellUrl('file:///C:/Windows/win.ini')).toBe(false)
    expect(isTrustedShellUrl('file:///etc/passwd')).toBe(false)
    expect(isTrustedShellUrl('file:///tmp/evil.html')).toBe(false)
    expect(isTrustedShellUrl(pathToFileURL(join(__dirname, '..', 'src', 'renderer', 'index.html')).href)).toBe(false)
  })

  it('refuse les sites distants quand aucun serveur de dev ne tourne', () => {
    delete process.env['ELECTRON_RENDERER_URL']
    expect(isTrustedShellUrl('https://evil.test/')).toBe(false)
    expect(isTrustedShellUrl('http://localhost:5173/browser.html')).toBe(false)
  })

  it('accepte le serveur de dev, mais rien d’autre sur ce port', () => {
    process.env['ELECTRON_RENDERER_URL'] = 'http://localhost:5173'
    expect(isTrustedShellUrl('http://localhost:5173/browser.html?url=https%3A%2F%2Fx.test')).toBe(true)
    expect(isTrustedShellUrl('http://localhost:5173')).toBe(true)
    expect(isTrustedShellUrl('http://localhost:5173x/browser.html')).toBe(false)
    expect(isTrustedShellUrl('http://evil.test/')).toBe(false)
  })
})
