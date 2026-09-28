import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

interface McpTokenStored {
  id: string
  label: string
  tokenEncrypted?: string
}

interface McpStored {
  enabled?: boolean
  port?: number
  lan?: boolean
  tokenEncrypted?: string
  tokens?: McpTokenStored[]
}

interface StoredConfig {
  tokenEncrypted?: string
  mcp?: McpStored
}

function configFile(): string {
  return join(app.getPath('userData'), 'config.json')
}

function readConfig(): StoredConfig {
  const file = configFile()
  if (!existsSync(file)) return {}
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as unknown
    if (parsed && typeof parsed === 'object') return parsed as StoredConfig
  } catch {
    // config corrompue : on repart de zéro sans la faire planter
  }
  return {}
}

function writeConfig(config: StoredConfig): void {
  const file = configFile()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(config), { encoding: 'utf-8', mode: 0o600 })
}

function encrypt(text: string): string {
  return safeStorage.encryptString(text).toString('base64')
}

function decrypt(base64: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(base64, 'base64'))
  } catch {
    return null
  }
}

export function loadToken(): string | null {
  const config = readConfig()
  if (typeof config.tokenEncrypted !== 'string' || config.tokenEncrypted.length === 0) {
    return null
  }
  return decrypt(config.tokenEncrypted)
}

export function saveToken(token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Chiffrement safeStorage indisponible sur ce poste.')
  }
  const config = readConfig()
  config.tokenEncrypted = encrypt(token)
  writeConfig(config)
}

export function clearToken(): void {
  const config = readConfig()
  delete config.tokenEncrypted
  if (config.mcp === undefined) {
    rmSync(configFile(), { force: true })
  } else {
    writeConfig(config)
  }
}

export interface McpToken {
  id: string
  label: string
  token: string
}

export interface McpConfig {
  enabled: boolean
  port: number | null
  lan: boolean
  tokens: McpToken[]
}

const PRIMARY_ID = 'primary'

function storedTokens(mcp: McpStored): McpToken[] {
  // Format hérité : un seul token chiffré → on le migre en token 'primary'
  if (Array.isArray(mcp.tokens) && mcp.tokens.length > 0) {
    return mcp.tokens.flatMap((t) => {
      if (typeof t.id !== 'string' || typeof t.label !== 'string') return []
      if (typeof t.tokenEncrypted !== 'string' || t.tokenEncrypted.length === 0) return []
      const token = decrypt(t.tokenEncrypted)
      return token !== null ? [{ id: t.id, label: t.label, token }] : []
    })
  }
  if (typeof mcp.tokenEncrypted === 'string' && mcp.tokenEncrypted.length > 0) {
    const token = decrypt(mcp.tokenEncrypted)
    return token !== null ? [{ id: PRIMARY_ID, label: 'PC principal', token }] : []
  }
  return []
}

export function loadMcpConfig(): McpConfig {
  const config = readConfig()
  const mcp = config.mcp
  if (!mcp || typeof mcp !== 'object') {
    return { enabled: false, port: null, lan: false, tokens: [] }
  }
  return {
    enabled: mcp.enabled === true,
    port: typeof mcp.port === 'number' ? mcp.port : null,
    lan: mcp.lan === true,
    tokens: storedTokens(mcp),
  }
}

export function saveMcpConfig(cfg: { enabled: boolean; port: number | null; lan: boolean; tokens: McpToken[] }): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Chiffrement safeStorage indisponible sur ce poste.')
  }
  const config = readConfig()
  config.mcp = {
    enabled: cfg.enabled,
    port: cfg.port ?? undefined,
    lan: cfg.lan,
    tokens: cfg.tokens.map((t) => ({ id: t.id, label: t.label, tokenEncrypted: encrypt(t.token) })),
  }
  writeConfig(config)
}