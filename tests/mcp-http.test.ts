import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const userData = mkdtempSync(join(tmpdir(), 'bountydesk-mcp-http-test-'))

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
  ipcMain: { handle: vi.fn() },
}))

vi.mock('../src/main/services/tools/installer', () => ({
  currentTools: async () => [],
  installTool: async (id: string) => ({ ok: true as const, installed: true }),
  resolveBinary: () => null,
  resolveWordlist: () => null,
}))

import { closeDb, getRepository } from '../src/main/db'
import { startMcpServer, stopMcpServer } from '../src/main/services/mcp/server'
import type { ProgramInput } from '../src/main/db/repo'

const TOKEN = 'test-token-http-1234567890'
let port = 0

async function rpc(
  body: unknown,
  headers: Record<string, string> = {},
  token: string | null = TOKEN
): Promise<Response> {
  const auth = token === null ? {} : { authorization: `Bearer ${token}` }
  return fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close', ...auth, ...headers },
    body: JSON.stringify(body),
  })
}

describe('serveur MCP (HTTP réel)', () => {
  beforeEach(async () => {
    closeDb()
    rmSync(join(userData, 'bountydesk.db'), { force: true })
    rmSync(join(userData, 'bountydesk.db-wal'), { force: true })
    rmSync(join(userData, 'bountydesk.db-shm'), { force: true })
    const repo = getRepository()
    repo.upsertPrograms([
      {
        id: 'prog-1', handle: 'acme', name: 'Acme', type: 'bug_bounty', status: 'active',
        confidentiality: 'public', minBounty: null, maxBounty: null, industry: null,
        webLink: null, following: false, rawJson: null,
      } as ProgramInput,
    ])
    const r = await startMcpServer(0, TOKEN)
    if (!r.ok) throw new Error(r.error)
    port = r.port
  })

  afterEach(() => {
    stopMcpServer()
  })

  it('accepte initialize sur un vrai socket et rapporte un port réel', async () => {
    expect(port).toBeGreaterThan(0)
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize' })
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      result: { protocolVersion: string; capabilities: { tools: object }; serverInfo: { name: string } }
    }
    expect(json.result.protocolVersion).toBe('2024-11-05')
    expect(json.result.capabilities.tools).toBeTruthy()
    expect(json.result.serverInfo.name).toBe('BountyDesk')
  })

  it('refuse sans token ou avec un mauvais token (401)', async () => {
    const noAuth = await rpc({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}, null)
    expect(noAuth.status).toBe(401)
    const bad = await rpc({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}, 'mauvais-token')
    expect(bad.status).toBe(401)
  })

  it('répond 404 hors /mcp et 405 hors POST', async () => {
    const other = await fetch(`http://127.0.0.1:${port}/autre`)
    expect(other.status).toBe(404)
    const get = await fetch(`http://127.0.0.1:${port}/mcp`)
    expect(get.status).toBe(405)
  })

  it('répond 415 sans content-type JSON et 400 sur JSON invalide', async () => {
    const plain = await rpc({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'content-type': 'text/plain' })
    expect(plain.status).toBe(415)
    const bad = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: '{pas du json',
    })
    expect(bad.status).toBe(400)
  })

  it('tools/list expose les 9 outils attendus', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    const json = (await res.json()) as { result: { tools: { name: string }[] } }
    const names = json.result.tools.map((t) => t.name)
    expect(names).toEqual([
      'list_programs', 'get_program_detail', 'list_credentials', 'list_tools',
      'install_tool', 'run_tool', 'start_scan', 'get_scan', 'scan_events',
    ])
  })

  it('run_tool exécute un binaire PATH et retourne la sortie', async () => {
    const res = await rpc({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'run_tool', arguments: { tool: 'node', args: '-e "console.log(42)"' } },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { result: { content: { text: string }[]; isError?: boolean } }
    expect(json.result.isError).toBeFalsy()
    const out = JSON.parse(json.result.content[0]!.text) as { exitCode: number; stdout: string; tool: string }
    expect(out.tool).toBe('node')
    expect(out.exitCode).toBe(0)
    expect(out.stdout.trim()).toBe('42')
  })

  it('run_tool refuse un nom de binaire invalide', async () => {
    const res = await rpc({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'run_tool', arguments: { tool: '../../etc/passwd' } },
    })
    const json = (await res.json()) as { result: { content: { text: string }[]; isError: boolean } }
    expect(json.result.isError).toBe(true)
  })

  it('tools/call list_programs passe sur le vrai HTTP et lit la base réelle', async () => {
    const res = await rpc({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'list_programs', arguments: {} },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { result: { content: { text: string }[]; isError?: boolean } }
    expect(json.result.isError).toBeFalsy()
    const programs = JSON.parse(json.result.content[0]!.text) as { id: string }[]
    expect(programs).toHaveLength(1)
    expect(programs[0]!.id).toBe('prog-1')
  })

  it('tools/call d’un outil inconnu renvoie une erreur JSON-RPC propre', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'inexistant', arguments: {} } })
    const json = (await res.json()) as { result: { content: { text: string }[]; isError: boolean } }
    expect(json.result.isError).toBe(true)
    expect(json.result.content[0]!.text).toContain('Outil inconnu')
  })

  it('méthode inconnue répond -32601 et les notifications répondent 202', async () => {
    const unknown = await rpc({ jsonrpc: '2.0', id: 1, method: 'pouet' })
    const uk = (await unknown.json()) as { error: { code: number } }
    expect(uk.error.code).toBe(-32601)
    const notif = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })
    expect(notif.status).toBe(202)
  })

  it('accepte plusieurs jetons nommés et révoque un jeton immédiatement', async () => {
    const second = 'token-second-pc-abcdef'
    const r = await startMcpServer(0, TOKEN, {
      tokens: [TOKEN, second],
      tokenLabels: new Map([
        [TOKEN, 'PC-bureau'],
        [second, 'Labo'],
      ]),
    })
    if (!r.ok) throw new Error(r.error)
    port = r.port

    const ok = await rpc({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}, second)
    expect(ok.status).toBe(200)

    const call = await rpc({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'list_programs', arguments: {} },
    }, {}, second)
    expect(call.status).toBe(200)

    const restart = await startMcpServer(0, TOKEN)
    if (!restart.ok) throw new Error(restart.error)
    port = restart.port
    const revoked = await rpc({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}, second)
    expect(revoked.status).toBe(401)
  })

  it('fonctionne en mode LAN (bind 0.0.0.0) et reste joignable', async () => {
    const r = await startMcpServer(0, TOKEN, { lan: true })
    if (!r.ok) throw new Error(r.error)
    port = r.port
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'ping' })
    expect(res.status).toBe(200)
  })

  it('audite chaque tools/call (poste, outil, statut) et les échecs 401', async () => {
    await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_programs', arguments: {} } }, {}, TOKEN)
    await rpc({ jsonrpc: '2.0', id: 2, method: 'ping' }, {}, 'mauvais-token')
    const rows = getRepository().listMcpRequests()
    expect(rows.length).toBeGreaterThanOrEqual(2)
    const okRow = rows.find((x) => x.tool === 'list_programs')
    expect(okRow).toBeTruthy()
    expect(okRow!.status).toBe('ok')
    expect(rows.find((x) => x.status === '401')).toBeTruthy()
  })
})