import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { McpStatusInfo, ScanDepth } from '../../../shared/ipc'
import { getClient } from '../../app-state'
import { getRepository } from '../../db'
import { fetchProgramDetail, getCachedProgramDetail } from '../program-detail'
import { buildPlan, selectTargets, MAX_TARGETS } from '../scan/plan'
import { activeScanCount, activeScanForProgram, startScan } from '../scan/runner'
import { getTool, TOOL_CATALOG } from '../tools/catalog'
import { currentTools, installTool, resolveBinary, toolsDir } from '../tools/installer'
import { attachAgentsToServer, closeAgents, configureAgents, type AgentAuthEntry } from './agents'

const PROTOCOL_VERSION = '2024-11-05'
const MAX_BODY = 1024 * 1024

const DEFAULT_RATE: Record<ScanDepth, number> = { low: 1, med: 5, high: 10 }

type ToolArgs = Record<string, unknown>
type ToolResult = { text: string; isError?: boolean; details?: Record<string, unknown> }

interface McpToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: ToolArgs) => Promise<ToolResult>
}

const STR = { type: 'string' } as const
const INT = { type: 'integer' } as const
const BOOL = { type: 'boolean' } as const

function asString(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.length === 0 || v.length > max) return null
  return v
}

function asInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  return value >= min && value <= max ? value : null
}

function splitArgs(str: string): string[] {
  // Supporte les guillemets simples (convention POSIX) comme les guillemets doubles.
  const tokens = str.match(/"[^"]*"|'[^']*'|\S+/g)
  if (!tokens) return []
  return tokens.map((t) =>
    (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
      ? t.slice(1, -1)
      : t
  )
}

const DENY_TOOLS = new Set([
  'cmd', 'powershell', 'pwsh', 'mshta', 'rundll32', 'regsvr32', 'certutil',
  'bitsadmin', 'wscript', 'cscript', 'winget',
  'sh', 'bash', 'zsh', 'ksh', 'dash', 'busybox', 'env', 'eval', 'xargs',
])
const SAFE_TOOLS = new Set([
  'node', 'python', 'python3', 'pip', 'git', 'tar', 'curl', 'wget', 'jq', 'rg', 'yq', 'go',
])

function isAllowedRunTool(tool: string): boolean {
  const name = tool.toLowerCase().replace(/\.exe$/i, '')
  if (DENY_TOOLS.has(name)) return false
  if (SAFE_TOOLS.has(name)) return true
  return getTool(tool) !== undefined
}

const runToolDef: McpToolDef = {
  name: 'run_tool',
  description:
    'Exécute un binaire du catalogue BountyDesk (portable dans le dossier tools de BountyDesk, ou binaire PATH comme'
    + ' nmap/ffuf) ou un binaire système de confiance (node, python, git, tar, curl, jq, rg, yq, go). Arguments libres'
    + ' en une chaîne, cwd optionnel (doit être sous le dossier tools de BountyDesk), timeout par défaut 120 s. Toute'
    + ' invocation est journalisée (Activité des IA). À n’utiliser que sur des cibles autorisées, dans le scope et selon les ROE.',
  inputSchema: {
    type: 'object',
    properties: {
      tool: { ...STR, description: 'id du catalogue (voir list_tools) ou binaire système de confiance' },
      args: { type: 'string', description: 'arguments de ligne de commande, une seule chaîne (guillemets double pour grouper)' },
      cwd: { type: 'string', description: 'répertoire de travail absolu sous le dossier tools (optionnel)' },
      timeout: { type: 'integer', minimum: 1, maximum: 600, description: 'secondes, défaut 120' },
    },
    required: ['tool'],
  },
  handler: async (args) => {
    const tool = asString(args.tool, 60)
    if (!tool) return { text: 'tool requis (chaîne 1-60)', isError: true }
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(tool)) return { text: `Nom de binaire invalide : ${tool}`, isError: true }
    if (!isAllowedRunTool(tool)) {
      return { text: `Outil bloqué : ${tool} (hors catalogue et hors liste système de confiance)`, isError: true }
    }
    const argStr = typeof args.args === 'string' ? args.args.slice(0, 8000) : ''
    const timeout = asInt(args.timeout, 1, 600) ?? 120
    const toolsRoot = toolsDir()
    const rawCwd = asString(args.cwd, 400)
    let cwd = toolsRoot
    if (rawCwd) {
      const abs = resolve(rawCwd)
      const lower = abs.toLowerCase()
      if (lower.startsWith('\\\\') || lower.startsWith('//')) {
        return { text: 'Chemin réseau (UNC) refusé', isError: true }
      }
      try {
        if (!statSync(abs).isDirectory()) return { text: 'cwd invalide : pas un répertoire', isError: true }
      } catch {
        return { text: 'cwd invalide : n’existe pas', isError: true }
      }
      if (!lower.startsWith(toolsRoot.toLowerCase())) {
        return { text: 'cwd hors périmètre autorisé (dossier tools BountyDesk)', isError: true }
      }
      cwd = abs
    }
    const bin = resolveBinary(tool) ?? tool
    const argv = splitArgs(argStr)

    return await new Promise<ToolResult>((resolveRes) => {
      let child: ReturnType<typeof spawn>
      try {
        child = spawn(bin, argv, { windowsHide: true, shell: false, cwd })
      } catch (err) {
        resolveRes({ text: `Impossible de lancer ${tool} : ${err instanceof Error ? err.message : String(err)}`, isError: true })
        return
      }
      let stdout = ''
      let stderr = ''
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        try { child.kill() } catch { /* ignore */ }
      }, timeout * 1000)
      child.stdout?.on('data', (b: Buffer) => {
        stdout += b.toString()
        if (stdout.length > 200_000) stdout = stdout.slice(0, 200_000)
      })
      child.stderr?.on('data', (b: Buffer) => {
        stderr += b.toString()
        if (stderr.length > 100_000) stderr = stderr.slice(0, 100_000)
      })
      child.on('error', (err) => {
        clearTimeout(timer)
        resolveRes({ text: `Lancement de ${tool} échoué : ${err.message}`, isError: true })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        resolveRes({
          text: JSON.stringify(
            { tool, bin, exitCode: code, timedOut, stdout: stdout.slice(0, 100_000), stderr: stderr.slice(0, 50_000) },
            null, 2
          ),
          details: { tool, exitCode: code, timedOut },
        })
      })
    })
  },
}

const TOOL_DEFS: McpToolDef[] = [
  {
    name: 'list_programs',
    description: "Liste les programmes bug bounty du catalogue local (BountyDesk). Recherche par nom/handle et filtre favoris."
      + ' Retourne les enregistrements de programmes (prime min/max, statut, tags, groupes, favori).',
    inputSchema: {
      type: 'object',
      properties: { search: { ...STR, description: 'filtre texte sur nom, handle ou industrie' }, favoriteOnly: BOOL },
    },
    handler: async (args) => {
      const repo = getRepository()
      const search = typeof args.search === 'string' ? args.search.slice(0, 500) : undefined
      const favoriteOnly = args.favoriteOnly === true
      const { records } = repo.listPrograms({ search, favoriteOnly, limit: 200, offset: 0 })
      const out = records.map((r) => ({
        id: r.id, handle: r.handle, name: r.name, status: r.status, type: r.type,
        confidentiality: r.confidentiality, industry: r.industry, webLink: r.webLink,
        following: r.following, favorite: r.favorite, note: r.note || null,
        minBounty: r.minBounty, maxBounty: r.maxBounty, tags: r.tags, groups: r.groups,
      }))
      return { text: JSON.stringify(out, null, 2), details: { count: out.length } }
    },
  },
  {
    name: 'get_program_detail',
    description: "Récupère le détail d'un programme : scope (cibles in-scope/out-of-scope), règles d'engagement (ROE),"
      + ' primes, statut. Nécessite un programme préalablement listé.',
    inputSchema: {
      type: 'object',
      properties: { programId: { ...STR, description: 'identifiant du programme (champ id de list_programs)' } },
      required: ['programId'],
    },
    handler: async (args) => {
      const programId = asString(args.programId)
      if (!programId) return { text: 'programId requis (chaîne 1-200)', isError: true }
      let detail: ReturnType<typeof getCachedProgramDetail>
      if (getClient().getToken()) {
        try {
          detail = await fetchProgramDetail(getClient(), programId)
        } catch {
          detail = getCachedProgramDetail(programId)
        }
      } else {
        detail = getCachedProgramDetail(programId)
      }
      if (!detail) return { text: `Programme introuvable ou détail indisponible : ${programId}`, isError: true }
      return { text: JSON.stringify(detail, null, 2) }
    },
  },
  {
    name: 'list_credentials',
    description: 'Liste les identifiants stockés localement pour un programme (labels et usernames uniquement — jamais les secrets).',
    inputSchema: {
      type: 'object',
      properties: { programId: STR },
      required: ['programId'],
    },
    handler: async (args) => {
      const programId = asString(args.programId)
      if (!programId) return { text: 'programId requis', isError: true }
      const rows = getRepository().listCredentials(programId)
      const out = rows.map((r) => ({ id: r.id, label: r.label, username: r.username, note: r.note, updatedAt: r.updated_at }))
      return { text: JSON.stringify(out, null, 2), details: { count: out.length } }
    },
  },
  {
    name: 'list_tools',
    description: "État d'installation des outils bug bounty du catalogue BountyDesk (nmap, nuclei, ffuf, gobuster, etc.)."
      + ' Retourne pour chaque outil si le binaire est installé.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const tools = await currentTools()
      return { text: JSON.stringify(tools, null, 2), details: { count: tools.length } }
    },
  },
  {
    name: 'install_tool',
    description: "Lance l'installation d'un outil du catalogue (winget ou binaire portable GitHub). Long : attendre la fin"
      + " avant de relancer. Voir list_tools pour les identifiants valides.",
    inputSchema: {
      type: 'object',
      properties: { id: { ...STR, enum: TOOL_CATALOG.map((t) => t.id) } },
      required: ['id'],
    },
    handler: async (args) => {
      const id = asString(args.id, 100)
      if (!id || !getTool(id)) return { text: `Outil inconnu : ${String(args.id)}`, isError: true }
      const chunks: string[] = []
      const res = await installTool(id, (line) => chunks.push(line))
      const output = chunks.join('')
      if (!res.ok) return { text: `${res.error}\n${output}`, isError: true }
      return { text: `${id} installé : ${res.installed ? 'oui' : 'non (déjà présent)'}\n${output}` }
    },
  },
  runToolDef,
  {
    name: 'start_scan',
    description: "Lance un scan automatisé d'un programme selon les règles d'engagement : profils low/med/high"
      + ' (curl puis nuclei, voire ffuf). Ne cible que des cibles in-scope http(s) et respecte un rate limit.'
      + " roeConfirm DOIT être true (l'utilisateur confirme avoir lu les ROE). Ne soumet jamais de rapport.",
    inputSchema: {
      type: 'object',
      properties: {
        programId: STR,
        depth: { type: 'string', enum: ['low', 'med', 'high'] },
        roeConfirm: BOOL,
        rateLimit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['programId', 'depth', 'roeConfirm'],
    },
    handler: async (args) => {
      const programId = asString(args.programId)
      const depth = args.depth === 'low' || args.depth === 'med' || args.depth === 'high' ? args.depth : null
      const roeConfirm = args.roeConfirm === true
      const rateLimit = asInt(args.rateLimit, 1, 50)
      if (!programId) return { text: 'programId requis', isError: true }
      if (!depth) return { text: 'depth doit être low, med ou high', isError: true }
      if (!roeConfirm) return { text: 'Confirmation des règles d’engagement requise (roeConfirm=true)', isError: true }

      const repo = getRepository()
      try {
        let detail
        if (getClient().getToken()) {
          detail = await fetchProgramDetail(getClient(), programId)
        } else {
          detail = getCachedProgramDetail(programId)
        }
        if (!detail) return { text: 'Détail du programme indisponible', isError: true }
        const MAX_SCOPE_AGE_MS = 24 * 3600 * 1000
        if (Date.now() - detail.fetchedAt > MAX_SCOPE_AGE_MS) {
          return { text: 'Scope expiré : resynchronisez le programme (jeton requis) avant tout scan', isError: true }
        }
        if (detail.roe && detail.roe.automatedTooling === 0) {
          return { text: 'Les règles d’engagement interdisent les outils automatisés pour ce programme', isError: true }
        }
        if (activeScanForProgram(programId)) {
          return { text: 'Un scan est déjà en cours pour ce programme', isError: true }
        }
        if (activeScanCount() >= 2) {
          return { text: 'Trop de scans simultanés (max 2)', isError: true }
        }
        const targets = selectTargets(detail.scope)
        if (targets.length === 0) return { text: 'Aucune cible in-scope exploitable (http(s))', isError: true }
        if (targets.length > MAX_TARGETS) {
          return { text: `Scope trop large (${targets.length} cibles, max ${MAX_TARGETS}) — affinez le programme`, isError: true }
        }
        const rate = rateLimit ?? DEFAULT_RATE[depth]
        const scanId = repo.createScan({ programId, depth, rateLimit: rate, roeConfirm })
        const plan = buildPlan(depth, targets, rate, {
          userAgent: detail.roe?.userAgent,
          requestHeader: detail.roe?.requestHeader,
        })
        void startScan(scanId, plan)
        return { text: JSON.stringify({ ok: true, scanId, targets: targets.length, depth, rateLimit: rate }, null, 2) }
      } catch (err) {
        return { text: err instanceof Error ? err.message : String(err), isError: true }
      }
    },
  },
  {
    name: 'get_scan',
    description: 'État courant dun scan lancé par start_scan : statut (running/done/stopped/error), profondeur, rate limit.',
    inputSchema: { type: 'object', properties: { scanId: INT }, required: ['scanId'] },
    handler: async (args) => {
      const scanId = asInt(args.scanId, 1, Number.MAX_SAFE_INTEGER)
      if (!scanId) return { text: 'scanId entier requis', isError: true }
      const scan = getRepository().getScan(scanId)
      if (!scan) return { text: `Scan introuvable (id=${scanId})`, isError: true }
      return {
        text: JSON.stringify(
          {
            id: scan.id, programId: scan.program_id, depth: scan.depth, status: scan.status,
            rateLimit: scan.rate_limit, roeConfirm: scan.roe_confirm === 1,
            startedAt: scan.started_at, finishedAt: scan.finished_at,
          },
          null, 2
        ),
      }
    },
  },
  {
    name: 'scan_events',
    description: 'Logs événements d’un scan (curl/nuclei/ffuf exécutés). Reprendre avec afterSeq = dernier seq reçu'
      + ' pour ne recevoir que les nouveaux événements. done=true quand le scan est terminé.',
    inputSchema: {
      type: 'object',
      properties: { scanId: INT, afterSeq: { type: 'integer', minimum: 0 } },
      required: ['scanId'],
    },
    handler: async (args) => {
      const scanId = asInt(args.scanId, 1, Number.MAX_SAFE_INTEGER)
      if (!scanId) return { text: 'scanId entier requis', isError: true }
      const repo = getRepository()
      const scan = repo.getScan(scanId)
      if (!scan) return { text: `Scan introuvable (id=${scanId})`, isError: true }
      const afterSeq = asInt(args.afterSeq, 0, 1_000_000) ?? 0
      const events = repo.listScanEvents(scanId, afterSeq).map((r) => ({ seq: r.seq, ts: r.ts, level: r.level, message: r.message }))
      return { text: JSON.stringify({ events, done: scan.status !== 'running' }, null, 2) }
    },
  },
]

const TOOLS = TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))

let server: ReturnType<typeof createServer> | null = null
let currentPort: number | null = null
let currentLan = false
let currentTokens: string[] = []
let tokenLabels = new Map<string, string>()

function labelFor(token: string): string {
  const known = tokenLabels.get(token)
  if (known) return known
  const guessed = currentTokens.indexOf(token)
  if (guessed !== -1) return `PC ${guessed + 1}`
  return ''
}

function localHosts(): string[] {
  const out: string[] = []
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address)
    }
  }
  return [...new Set(out)].sort()
}

export function isPrivateNetwork(): boolean {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue
      const parts = a.address.split('.')
      const first = Number(parts[0] ?? 0)
      const second = Number(parts[1] ?? 0)
      if (first === 10) return true
      if (first === 172 && second >= 16 && second <= 31) return true
      if (first === 192 && second === 168) return true
    }
  }
  return false
}

export function generateMcpToken(): string {
  return randomBytes(24).toString('base64url')
}

export function generateMcpTokenId(): string {
  return randomBytes(6).toString('hex')
}

export function getMcpStatus(): McpStatusInfo {
  return {
    enabled: false,
    running: server !== null,
    port: currentPort,
    lan: currentLan,
    hosts: localHosts(),
    token: currentTokens[0] ?? null,
    tokens: currentTokens.map((t) => ({ id: labelFor(t) || '?', label: labelFor(t) || 'PC', token: t })),
  }
}

export function setMcpTokens(tokens: string[], labels?: Map<string, string>): void {
  currentTokens = [...tokens]
  tokenLabels = labels ? new Map(labels) : new Map()
}

export function setMcpToken(token: string | null): void {
  currentTokens = token ? [token] : []
  tokenLabels = new Map()
}

function audit(tokenLabel: string, tool: string, args: unknown, status: string, ms: number, remoteIp = ''): void {
  try {
    getRepository().appendMcpRequest({
      ts: Date.now(),
      tokenLabel,
      tool,
      argsJson: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
      status,
      ms,
      remoteIp,
    })
  } catch {
    // l'audit ne doit jamais faire planter une requête
  }
}

export async function callTool(name: string, args: ToolArgs): Promise<ToolResult> {
  const def = TOOL_DEFS.find((t) => t.name === name)
  if (!def) return { text: `Outil inconnu : ${name}`, isError: true }
  return def.handler(args)
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = body !== undefined ? JSON.stringify(body) : ''
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

function sendRpcResult(res: ServerResponse, id: unknown, result: unknown): void {
  sendJson(res, 200, { jsonrpc: '2.0', id: id ?? null, result })
}

function sendRpcError(res: ServerResponse, id: unknown, code: number, message: string): void {
  sendJson(res, 200, { jsonrpc: '2.0', id: id ?? null, error: { code, message } })
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('payload trop gros'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function constantTimeEqual(header: string, expected: string): boolean {
  if (header.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

function authedToken(req: IncomingMessage): string | null {
  if (currentTokens.length === 0) return null
  const header = req.headers.authorization
  if (typeof header !== 'string') return null
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return null
  const provided = header.slice(prefix.length)
  for (const token of currentTokens) {
    if (constantTimeEqual(provided, token)) return token
  }
  return null
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (url.pathname !== '/mcp') {
    sendJson(res, 404, { error: 'not found' })
    return
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' })
    res.end()
    return
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    sendJson(res, 415, { error: 'content-type application/json requis' })
    return
  }
  const authed = authedToken(req)
  const remoteIp = req.socket.remoteAddress ?? ''
  if (!authed) {
    audit('', '_unauthorized', {}, '401', 0, remoteIp)
    sendJson(res, 401, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } })
    return
  }
  const clientLabel = labelFor(authed)

  let parsed: { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown }
  try {
    parsed = JSON.parse(await readBody(req)) as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown }
  } catch {
    sendJson(res, 400, { error: 'JSON invalide' })
    return
  }
  if (typeof parsed.method !== 'string') {
    sendJson(res, 400, { error: 'méthode JSON-RPC manquante' })
    return
  }

  const id = 'id' in parsed ? parsed.id : undefined
  const isNotification = id === undefined
  if (parsed.method === 'notifications/initialized') {
    res.writeHead(202, { 'Content-Length': '0' })
    res.end()
    return
  }
  if (isNotification) {
    res.writeHead(202, { 'Content-Length': '0' })
    res.end()
    return
  }

  switch (parsed.method) {
    case 'initialize': {
      sendRpcResult(res, id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'BountyDesk', version: '0.1.0' },
      })
      return
    }
    case 'ping': {
      sendRpcResult(res, id, {})
      return
    }
    case 'tools/list': {
      sendRpcResult(res, id, { tools: TOOLS })
      return
    }
    case 'tools/call': {
      const params = (parsed.params ?? {}) as { name?: unknown; arguments?: unknown }
      const name = typeof params.name === 'string' ? params.name : ''
      const toolArgs = params.arguments && typeof params.arguments === 'object' ? (params.arguments as ToolArgs) : {}
      const start = Date.now()
      const result = await callTool(name, toolArgs)
      const ms = Date.now() - start
      audit(clientLabel, name || '«tool manquant»', toolArgs, result.isError === true ? 'error' : 'ok', ms, remoteIp)
      sendRpcResult(res, id, { content: [{ type: 'text', text: result.text }], isError: result.isError === true })
      return
    }
    default:
      sendRpcError(res, id, -32601, `Méthode inconnue : ${parsed.method}`)
  }
}

function closeServer(): Promise<void> {
  const s = server
  server = null
  currentPort = null
  currentLan = false
  currentTokens = []
  tokenLabels = new Map()
  closeAgents()
  if (!s) return Promise.resolve()
  return new Promise((resolve) => {
    s.close(() => resolve())
    s.closeAllConnections?.()
  })
}

export async function startMcpServer(
  port: number,
  token: string,
  opts?: { lan?: boolean; tokens?: string[]; tokenLabels?: Map<string, string>; agentTokens?: string[] | AgentAuthEntry[] }
): Promise<{ ok: true; port: number } | { ok: false; error: string }> {
  await closeServer()
  return new Promise((resolve, reject) => {
    const tokens = opts?.tokens && opts.tokens.length > 0 ? [...opts.tokens] : [token]
    currentTokens = tokens
    tokenLabels = opts?.tokenLabels ? new Map(opts.tokenLabels) : new Map()
    currentLan = opts?.lan === true
    const host = currentLan ? '0.0.0.0' : '127.0.0.1'
    const rawAgents = opts?.agentTokens
    const agentEntries: AgentAuthEntry[] = Array.isArray(rawAgents)
      ? (rawAgents as AgentAuthEntry[]).every((a) => typeof a === 'object' && a && 'token' in a)
        ? (rawAgents as AgentAuthEntry[])
        : (rawAgents as string[]).map((t, i) => ({ id: `agent-${i + 1}`, label: `Agent ${i + 1}`, token: t }))
      : []
    const srv = createServer((req: IncomingMessage, res: ServerResponse) => {
      void route(req, res).catch(() => {
        sendJson(res, 500, { error: 'internal error' })
      })
    })
    attachAgentsToServer(srv)
    srv.once('error', (err: Error & { code?: string }) => {
      currentTokens = []
      tokenLabels = new Map()
      currentLan = false
      reject({ ok: false, error: err.code === 'EADDRINUSE' ? `Port ${port} déjà utilisé` : err.message })
    })
    srv.listen(port, host, () => {
      server = srv
      currentLan = host === '0.0.0.0'
      const addr = srv.address()
      const actualPort = typeof addr === 'object' && addr !== null ? addr.port : port
      currentPort = actualPort
      configureAgents(agentEntries)
      resolve({ ok: true, port: actualPort })
    })
  })
}

export function stopMcpServer(): void {
  void closeServer()
}