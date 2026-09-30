import { ipcMain, Notification } from 'electron'
import { execFile } from 'node:child_process'
import { z } from 'zod'
import {
  IPC,
  type AgentSessionDecideResult,
  type AgentSessionRequestResult,
  type AgentSessionsResult,
  type AgentStatusesResult,
  type AgentTokenAddResult,
  type AgentTokenRevokeResult,
  type AgentTokensResult,
  type DbResult,
  type McpDiagnoseInfo,
  type McpDiagnoseResult,
  type McpFirewallFixResult,
  type McpMachinesResult,
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
  isPrivateNetwork,
  startMcpServer,
  stopMcpServer,
} from './services/mcp/server'
import {
  agentSessions,
  agentStatuses,
  decideSession,
  endSessionByViewToken,
  requestSession,
} from './services/mcp/agents'
import { openAgentView } from './view'
import { getMainWindow } from './window'

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

const FIREWALL_RULE = 'BountyDesk MCP'

function runNetsh(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('netsh', ['advfirewall', 'firewall', ...args], { windowsHide: true, timeout: 8000 }, (err, stdout, stderr) => {
      resolve({
        code: err ? (typeof (err as { code?: unknown }).code === 'number' ? ((err as { code: number }).code) : -1) : 0,
        stdout: stdout ?? '',
        stderr: stderr ?? '',
      })
    })
  })
}

function runCli(
  cmd: string,
  args: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 8000, windowsHide: true }, (err, stdout, stderr) => {
      resolve({
        code: err ? (typeof (err as { code?: unknown }).code === 'number' ? (err as { code: number }).code : -1) : 0,
        stdout: stdout ?? '',
        stderr: stderr ?? '',
      })
    })
  })
}

/** État du pare-feu Linux (ufw / firewalld), sinon 'unmanaged'. */
async function linuxFirewallState(port: number): Promise<McpDiagnoseInfo['firewall']> {
  if (process.platform !== 'linux') return 'unmanaged'
  const ufw = await runCli('ufw', ['status']).catch(() => ({ code: -1, stdout: '', stderr: '' }))
  if (ufw.code === 0) {
    return ufw.stdout.includes(`${port}/tcp`) ? 'ok' : 'missing'
  }
  const firewalld = await runCli('firewall-cmd', ['--state']).catch(() => ({ code: -1, stdout: '', stderr: '' }))
  if (firewalld.code === 0) {
    const listed = await runCli('firewall-cmd', ['--list-ports']).catch(() => ({ code: -1, stdout: '', stderr: '' }))
    return listed.code === 0 && listed.stdout.includes(`${port}/tcp`) ? 'ok' : 'missing'
  }
  return 'unmanaged'
}

async function firewallState(): Promise<McpDiagnoseInfo['firewall']> {
  if (process.platform !== 'win32') {
    const port = getMcpStatus().port
    return port ? linuxFirewallState(port) : 'unmanaged'
  }
  try {
    const r = await runNetsh(['show', 'rule', `name=${FIREWALL_RULE}`])
    if (r.code === 0 && r.stdout.toLowerCase().includes('bountydesk')) return 'ok'
    return 'missing'
  } catch {
    return 'unmanaged'
  }
}

async function selfTest(): Promise<McpDiagnoseInfo['selfTest']> {
  const info = getMcpStatus()
  const port = info.port
  const token = info.token
  if (!info.running || !port || !token) return null
  const start = Date.now()
  try {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    })
    const body = await res.text()
    const ok = res.status === 200 && body.includes('jsonrpc')
    return { ok, ms: Date.now() - start, error: ok ? undefined : `HTTP ${res.status} : ${body.slice(0, 120)}` }
  } catch (err) {
    return { ok: false, ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Ouvre le port MCP via ufw (polkit) ou firewalld, avec invite d'authentification. */
async function runLinuxFirewallFix(port: number): Promise<{ ok: boolean; error?: string }> {
  const ufw = await runCli('pkexec', ['ufw', 'allow', `${port}/tcp`, 'comment', FIREWALL_RULE])
  if (ufw.code === 0) return { ok: true }
  const fd = await runCli('pkexec', ['firewall-cmd', '--permanent', `--add-port=${port}/tcp`])
  if (fd.code !== 0) {
    return { ok: false, error: `Impossible d’ouvrir le port ${port} (ufw ${ufw.code}, firewall-cmd ${fd.code}).` }
  }
  await runCli('pkexec', ['firewall-cmd', '--reload'])
  return { ok: true }
}

async function runFirewallFix(): Promise<{ ok: boolean; firewall: McpDiagnoseInfo['firewall']; error?: string }> {
  if (process.platform !== 'win32') {
    const port = getMcpStatus().port
    if (process.platform !== 'linux' || !port) {
      return { ok: false, firewall: 'unmanaged', error: 'Gestion du pare-feu non applicable sur cette plateforme' }
    }
    const fixed = await runLinuxFirewallFix(port)
    const state = await linuxFirewallState(port)
    return { ok: fixed.ok && state === 'ok', firewall: state, error: fixed.ok ? undefined : fixed.error }
  }
  const bin = process.execPath
  const script =
    `netsh advfirewall firewall delete rule name="${FIREWALL_RULE}" ; ` +
    `netsh advfirewall firewall add rule name="${FIREWALL_RULE}" dir=in action=allow program="${bin}" enable=yes profile=any`
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const ps =
    'Start-Process -FilePath powershell.exe ' +
    `-ArgumentList "-NoProfile","-NonInteractive","-WindowStyle","Hidden","-ExecutionPolicy","Bypass","-EncodedCommand","${encoded}" ` +
    '-Verb RunAs -Wait'
  try {
    await new Promise<void>((resolve, reject) => {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, timeout: 30000 }, (err) => (err ? reject(err) : resolve()))
    })
  } catch (err) {
    return { ok: false, firewall: 'missing', error: err instanceof Error ? err.message : String(err) }
  }
  const state = await firewallState()
  return { ok: state === 'ok', firewall: state, error: state === 'ok' ? undefined : 'La règle n’a pas été créée (UAC refusé ?)' }
}

async function restartIfRunning(cfg: {
  enabled: boolean
  port: number | null
  lan: boolean
  tokens: McpToken[]
  agents?: McpToken[]
}): Promise<void> {
  const info = getMcpStatus()
  if (!info.running) return
  const primary = cfg.tokens[0]?.token
  if (!primary) return
  const target = info.port ?? cfg.port ?? DEFAULT_PORT
  await startMcpServer(target, primary, {
    lan: cfg.lan,
    tokens: cfg.tokens.map((t) => t.token),
    tokenLabels: withLabels(cfg.tokens),
    agentTokens: cfg.agents ?? [],
  })
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
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens, agents: cfg.agents })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens, agents: cfg.agents })
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
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens, agents: cfg.agents })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens, agents: cfg.agents })
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
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens, agents: cfg.agents })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens, agents: cfg.agents })
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
          agentTokens: cfg.agents ?? [],
        })
        if (!started.ok) return { ok: false, error: started.error }
        saveMcpConfig({ enabled: true, port: started.port, lan: lanOpt, tokens: cfg.tokens, agents: cfg.agents })
        return { ok: true, status: joinStatus(getMcpStatus()) }
      }
      stopMcpServer()
      saveMcpConfig({ enabled: false, port: cfg.port, lan: cfg.lan, tokens: cfg.tokens, agents: cfg.agents })
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
          remoteIp: r.remote_ip ?? '',
        }))
      return { ok: true, rows }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.McpDiagnose, async (): Promise<McpDiagnoseResult> => {
    try {
      const info = getMcpStatus()
      const [firewall, self] = await Promise.all([firewallState(), selfTest()])
      const recentErrors = info.running
        ? getRepository()
            .listMcpRequests(50)
            .filter((r) => r.status === '401' || r.status === 'error')
            .map((r) => ({
              id: r.id,
              ts: r.ts,
              tokenLabel: r.token_label,
              tool: r.tool,
              args: r.args_json,
              status: r.status,
              ms: r.ms,
              remoteIp: r.remote_ip ?? '',
            }))
        : []
      const diag: McpDiagnoseInfo = {
        running: info.running,
        port: info.port,
        lan: info.lan,
        firewall,
        selfTest: self,
        recentErrors,
      }
      return { ok: true, diag }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.McpFirewallFix, async (): Promise<McpFirewallFixResult> => {
    try {
      const r = await runFirewallFix()
      if (r.ok) return { ok: true, firewall: r.firewall }
      return { ok: false, error: r.error ?? 'Échec de création de la règle pare-feu' }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.McpMachines, (_event, raw: unknown): McpMachinesResult => {
    const { limit } = z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(raw)
    try {
      const machines = getRepository()
        .mcpMachines(limit ?? 50)
        .map((m) => ({
          tokenLabel: m.tokenLabel,
          lastSeen: m.lastSeen,
          calls: m.calls,
          errors: m.errors,
          ips: (m.ip ?? '').split(',').filter(Boolean),
        }))
      return { ok: true, machines }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentTokens, (): AgentTokensResult => {
    try {
      const cfg = loadMcpConfig()
      const info = getMcpStatus()
      return {
        ok: true,
        port: info.port ?? cfg.port,
        hosts: info.hosts,
        tokens: cfg.agents.map((t) => ({ id: t.id, label: t.label, token: t.token })),
      }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentTokenAdd, async (_event, raw: unknown): Promise<AgentTokenAddResult> => {
    const { label } = z.object({ label: z.string().trim().min(1).max(60) }).parse(raw)
    try {
      const cfg = loadMcpConfig()
      const token = generateMcpToken()
      const agents = [...cfg.agents, { id: generateMcpTokenId(), label, token }]
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens: cfg.tokens, agents })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens: cfg.tokens, agents })
      const info = getMcpStatus()
      return {
        ok: true,
        token,
        port: info.port ?? cfg.port,
        hosts: info.hosts,
        tokens: agents.map((t) => ({ id: t.id, label: t.label, token: t.token })),
      }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentTokenRevoke, async (_event, raw: unknown): Promise<AgentTokenRevokeResult> => {
    const { id } = z.object({ id: z.string().min(1).max(100) }).parse(raw)
    try {
      const cfg = loadMcpConfig()
      const agents = cfg.agents.filter((t) => t.id !== id)
      if (agents.length === cfg.agents.length) {
        return { ok: false as const, error: 'Jeton d’agent inconnu.' }
      }
      saveMcpConfig({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens: cfg.tokens, agents })
      await restartIfRunning({ enabled: cfg.enabled, port: cfg.port, lan: cfg.lan, tokens: cfg.tokens, agents })
      const info = getMcpStatus()
      return {
        ok: true,
        port: info.port ?? cfg.port,
        hosts: info.hosts,
        tokens: agents.map((t) => ({ id: t.id, label: t.label, token: t.token })),
      }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentStatuses, (): AgentStatusesResult => {
    try {
      return { ok: true, agents: agentStatuses() }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentSessions, (): AgentSessionsResult => {
    try {
      return { ok: true, sessions: agentSessions() }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentSessionRequest, (_event, raw: unknown): AgentSessionRequestResult => {
    const { tokenId } = z.object({ tokenId: z.string().min(1).max(100) }).parse(raw)
    try {
      const r = requestSession(tokenId)
      if ('row' in r) {
        const row = r.row
        const main = getMainWindow()
        const n = new Notification({
          title: 'BountyDesk · Demande de session',
          body: `${row.agentLabel || 'Machine distante'} · ${row.remoteIp || '—'} demande à s'afficher`,
        })
        n.on('click', () => {
          main?.show()
          main?.focus()
        })
        n.show()
        main?.flashFrame(true)
        return { ok: true, session: row }
      }
      return { ok: true, session: null }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentSessionDecide, async (_event, raw: unknown): Promise<AgentSessionDecideResult> => {
    const { sessionId, approve } = z.object({ sessionId: z.number().int().min(1), approve: z.boolean() }).parse(raw)
    try {
      const r = decideSession(sessionId, approve)
      if (!r.ok) return r
      if (approve && r.viewToken) {
        const cfg = loadMcpConfig()
        const agentToken = r.session.agentToken
        const label = cfg.agents.find((a) => a.token === agentToken)?.label ?? r.session.agentLabel
        openAgentView(r.viewToken, label || 'PC distant')
      }
      return { ok: true, session: r.session }
    } catch (err) {
      return handleError(err)
    }
  })

  ipcMain.handle(IPC.AgentSessionEnd, (_event, raw: unknown): DbResult => {
    const { viewToken } = z.object({ viewToken: z.string().min(1).max(200) }).parse(raw)
    try {
      endSessionByViewToken(viewToken)
      return { ok: true }
    } catch (err) {
      return handleError(err)
    }
  })
}

export function restoreAutostartMcp(): void {
  const cfg = loadMcpConfig()
  if (cfg.enabled && cfg.tokens.length > 0 && cfg.port) {
    const primary = cfg.tokens[0]!.token
    // Sécurité : ne jamais re-brancher 0.0.0.0 sur un réseau public/hotspot.
    // Si le réseau actif est privé (10/8, 172.16/12, 192.168/16), on honore cfg.lan.
    const lan = cfg.lan && isPrivateNetwork()
    void startMcpServer(cfg.port, primary, {
      lan,
      tokens: cfg.tokens.map((t) => t.token),
      tokenLabels: withLabels(cfg.tokens),
      agentTokens: cfg.agents ?? [],
    })
  }
}