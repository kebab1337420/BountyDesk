import { ipcMain } from 'electron'
import { z } from 'zod'
import {
  IPC,
  type McpRegenerateResult,
  type McpRequestsResult,
  type McpSetEnabledResult,
  type McpStatusInfo,
  type McpTokenAddResult,
  type McpTokenInfo,
  type McpTokenRevokeResult,
} from '../shared/ipc'
import {
  loadMcpConfig,
  saveMcpConfig,
  type McpToken,
} from './storage'
import { getRepository } from './db'
import {
  generateMcpToken,
  generateMcpTokenId,
  getMcpStatus,
  startMcpServer,
  stopMcpServer,
} from './services/mcp/server'

const DEFAULT_PORT = 8787

function joinStatus(info: McpStatusInfo): McpStatusInfo {
  const cfg = loadMcpConfig()
  return {
    enabled: cfg.enabled,
    running: info.running,
    port: info.port ?? cfg.port,
    lan: cfg.lan,
    hosts: info.hosts,
    token: cfg.tokens[0]?.token ?? null,
    tokens: cfg.tokens.map(toTokenInfo),
  }
}

function toTokenInfo(t: McpToken): McpTokenInfo {
  return { id: t.id, label: t.label, token: t.token }
}

function withLabels(tokens: McpToken[]): Map<string, string> {
  return new Map(tokens.map((t) => [t.token, t.label]))
}

function handleError(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : String(err) }
}

async function restartIfRunning(cfg: { enabled: boolean; port: number | null; lan: boolean; tokens: McpToken[] }): Promise<void> {
  const info = getMcpStatus()
  if (!info.running) return
  const primary = cfg.tokens[0]?.token
  if (!primary) return
  const target = info.port ?? cfg.port ?? DEFAULT_PORT
  await startMcpServer(target, primary, { lan: cfg.lan, tokens: cfg.tokens.map((t) => t.token), tokenLabels: withLabels(cfg.tokens) })
}

export function registerMcpIpc(): void {
  ipcMain.handle(IPC.McpStatus, (): McpStatusInfo => {
    return joinStatus(getMcpStatus())
  })

  ipcMain.handle(IPC.McpRegenerateToken, async (): Promise<McpRegenerateResult> => {
    try {
      const cfg = loadMcpConfig()
      const token = generateMcpToken()
      const tokens = cfg.tokens.length > 0 ? [...cfg.tokens] : [{ id: 'primary', label: 'PC principal', token }]
      tokens[0] = { ...tokens[0]!, token }
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens })
      const info = getMcpStatus()
      return { ok: true, token, status: joinStatus(info) }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.McpTokenAdd, async (_event, raw: unknown): Promise<McpTokenAddResult> => {
    const { label } = z.object({ label: z.string().trim().min(1).max(60) }).parse(raw)
    try {
      const cfg = loadMcpConfig()
      const token = generateMcpToken()
      const tokens = [...cfg.tokens, { id: generateMcpTokenId(), label, token }]
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens })
      return { ok: true, token, status: joinStatus(getMcpStatus()) }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.McpTokenRevoke, async (_event, raw: unknown): Promise<McpTokenRevokeResult> => {
    const { id } = z.object({ id: z.string().min(1).max(100) }).parse(raw)
    try {
      const cfg = loadMcpConfig()
      if (cfg.tokens.length <= 1) {
        return { ok: false as const, error: 'Au moins un jeton est requis : révoquer ce jeton couperait tous les clients.' }
      }
      const tokens = cfg.tokens.filter((t) => t.id !== id)
      if (tokens.length === cfg.tokens.length) {
        return { ok: false as const, error: 'Jeton inconnu.' }
      }
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens })
      return { ok: true, status: joinStatus(getMcpStatus()) }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.McpSetEnabled, async (_event, raw: unknown): Promise<McpSetEnabledResult> => {
    const { enabled, port, lan } = z
      .object({
        enabled: z.boolean(),
        port: z.number().int().min(1024).max(65535).nullable().optional(),
        lan: z.boolean().optional(),
      })
      .parse(raw)
    try {
      const cfg = loadMcpConfig()
      if (enabled) {
        if (cfg.tokens.length === 0) {
          cfg.tokens = [{ id: 'primary', label: 'PC principal', token: generateMcpToken() }]
        }
        const lanOpt = lan ?? cfg.lan
        const targetPort = port ?? cfg.port ?? DEFAULT_PORT
        const primary = cfg.tokens[0]!.token
        const started = await startMcpServer(targetPort, primary, {
          lan: lanOpt,
          tokens: cfg.tokens.map((t) => t.token),
          tokenLabels: withLabels(cfg.tokens),
        })
        if (!started.ok) return { ok: false, error: started.error }
        saveMcpConfig({ enabled: true, port: started.port, lan: lanOpt, tokens: cfg.tokens })
        return { ok: true, status: joinStatus(getMcpStatus()) }
      }
      stopMcpServer()
      saveMcpConfig({ enabled: false, port: cfg.port, lan: cfg.lan, tokens: cfg.tokens })
      return { ok: true, status: joinStatus(getMcpStatus()) }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.McpRequests, (_event, raw: unknown): McpRequestsResult => {
    const { limit } = z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(raw)
    try {
      const rows = getRepository()
        .listMcpRequests(limit ?? 100)
        .map((r) => ({
          id: r.id,
          ts: r.ts,
          tokenLabel: r.token_label,
          tool: r.tool,
          args: r.args_json,
          status: r.status,
          ms: r.ms,
        }))
      return { ok: true, rows }
    } catch (err) {
      return handleError(err)
    }
  })
}

export function restoreAutostartMcp(): void {
  const cfg = loadMcpConfig()
  if (cfg.enabled && cfg.tokens.length > 0 && cfg.port) {
    const primary = cfg.tokens[0]!.token
    // Ne jamais re-brancher 0.0.0.0 silencieusement au démarrage (réseau public/hotspot) :
    // redémarrer en local uniquement, l'utilisateur réactivera le LAN explicitement.
    void startMcpServer(cfg.port, primary, {
      lan: false,
      tokens: cfg.tokens.map((t) => t.token),
      tokenLabels: withLabels(cfg.tokens),
    })
  }
}