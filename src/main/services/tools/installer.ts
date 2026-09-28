import { spawn } from 'node:child_process'
import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ToolEntry } from '../../../shared/ipc'
import { getTool, TOOL_CATALOG, type ToolDefinition, type ToolInstallationResult } from './catalog'

export function toolsDir(): string {
  const dir = join(app.getPath('userData'), 'tools')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function portableExePath(id: string): string {
  return join(toolsDir(), id, `${id}.exe`)
}

export function resolveBinary(tool: string): string | null {
  const exe = portableExePath(tool)
  return existsSync(exe) ? exe : null
}

export function resolveWordlist(tool = 'seclists'): string | null {
  const base = join(toolsDir(), tool)
  for (const rel of [
    'Discovery/Web-Content/raft-medium-words.txt',
    'Discovery/Web-Content/directory-list-2.3-medium.txt'
  ]) {
    const candidate = join(base, rel)
    if (existsSync(candidate)) return candidate
  }
  return null
}

function gitPkgPath(id: string): string {
  return join(toolsDir(), id)
}

const MARKER = '.bountydesk-installed'

function run(cmd: string, args: string[], onOutput?: (line: string) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, shell: false })
    child.stdout?.on('data', (b: Buffer) => onOutput?.(b.toString()))
    child.stderr?.on('data', (b: Buffer) => onOutput?.(b.toString()))
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? -1))
  })
}

export async function isInstalled(tool: ToolDefinition): Promise<boolean> {
  if (tool.source === 'winget' && tool.wingetId) {
    const code = await run('winget', ['list', '--exact', '--id', tool.wingetId])
    return code === 0
  }
  if (tool.source === 'github') {
    return existsSync(portableExePath(tool.id))
  }
  if (tool.source === 'git') {
    return existsSync(join(gitPkgPath(tool.id), MARKER))
  }
  return false
}

export async function currentTools(): Promise<ToolEntry[]> {
  const tools: ToolEntry[] = []
  for (const def of TOOL_CATALOG) {
    let installed = false
    try {
      installed = await isInstalled(def)
    } catch {
      installed = false
    }
    tools.push({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      source: def.source,
      installed,
      defaultChecked: def.defaultChecked,
      docs: def.githubRepo ? `https://github.com/${def.githubRepo}` : undefined,
    })
  }
  return tools
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': 'BountyDesk/0.1' } })
  if (!res.ok) throw new Error(`Téléchargement refusé (HTTP ${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
}

async function installGithub(tool: ToolDefinition, onOutput: (line: string) => void): Promise<void> {
  if (!tool.githubRepo || !tool.githubAsset) throw new Error('Référence GitHub manquante')
  const release = await fetch(`https://api.github.com/repos/${tool.githubRepo}/releases/latest`, {
    headers: { 'User-Agent': 'BountyDesk/0.1', Accept: 'application/vnd.github+json' }
  })
  if (!release.ok) throw new Error(`Impossible de lire les releases GitHub (HTTP ${release.status})`)
  const body = (await release.json()) as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] }
  const asset = body.assets?.find((a) => a.name.toLowerCase().includes(tool.githubAsset!.toLowerCase()) && a.name.match(/\.(zip|tar\.gz|tgz)$/i))
  if (!asset) throw new Error(`Aucun asset windows trouvé pour ${tool.githubRepo}`)

  const zipPath = join(toolsDir(), `${tool.id}.download`)
  onOutput(`Téléchargement de ${asset.name}…`)
  await downloadToFile(asset.browser_download_url, zipPath)
  onOutput('Extraction…')
  const workDir = join(toolsDir(), `${tool.id}.tmp`)
  rmSync(workDir, { recursive: true, force: true })
  mkdirSync(workDir, { recursive: true })
  const code = await run('tar', ['-xf', zipPath, '-C', workDir], onOutput)
  if (code !== 0) throw new Error('Extraction échouée (tar)')

  const destDir = join(toolsDir(), tool.id)
  rmSync(destDir, { recursive: true, force: true })
  mkdirSync(destDir, { recursive: true })
  const wanted = `${tool.id}.exe`
  const found = findFile(workDir, (name) => name.toLowerCase() === wanted)
  if (!found) throw new Error(`Binaire ${wanted} introuvable dans l’archive`)
  copyFileSync(found, portableExePath(tool.id))
  rmSync(zipPath, { force: true })
  rmSync(workDir, { recursive: true, force: true })
  onOutput(`Installé : ${tool.id}.exe`)
}

function findFile(dir: string, match: (name: string) => boolean): string | null {
  for (const entry of readdirRecursive(dir)) {
    if (match(entry)) return entry
  }
  return null
}

function readdirRecursive(dir: string): string[] {
  const out: string[] = []
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else out.push(full)
    }
  }
  walk(dir)
  return out
}

async function installGit(tool: ToolDefinition, onOutput: (line: string) => void): Promise<void> {
  if (!tool.githubRepo) throw new Error('Référence GitHub manquante')
  const dest = gitPkgPath(tool.id)
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  onOutput(`Clonage de https://github.com/${tool.githubRepo}…`)
  const code = await run('git', ['clone', '--depth', '1', `https://github.com/${tool.githubRepo}.git`, dest], onOutput)
  if (code !== 0) {
    rmSync(dest, { recursive: true, force: true })
    throw new Error('Clonage échoué (git)')
  }
  writeFileSync(join(dest, MARKER), JSON.stringify({ installedAt: new Date().toISOString(), repo: tool.githubRepo }, null, 2))
  onOutput(`Cloné dans ${dest}`)
  onOutput('Aucun script exécuté automatiquement : suivez le guide du framework avant usage.')
}

export async function installTool(id: string, onOutput?: (line: string) => void): Promise<ToolInstallationResult> {
  const tool = getTool(id)
  if (!tool) return { ok: false, error: `Outil inconnu : ${id}` }
  try {
    if (await isInstalled(tool)) {
      onOutput?.('Déjà installé, rien à faire.')
      return { ok: true, installed: true }
    }
    if (tool.source === 'winget' && tool.wingetId) {
      const code = await run(
        'winget',
        ['install', '--exact', '--id', tool.wingetId, '--silent', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity'],
        onOutput
      )
      if (code !== 0) return { ok: false, error: `winget a échoué (code ${code})` }
    } else if (tool.source === 'git') {
      await installGit(tool, onOutput ?? (() => {}))
    } else {
      await installGithub(tool, onOutput ?? (() => {}))
    }
    return { ok: true, installed: await isInstalled(tool) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}