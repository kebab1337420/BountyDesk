import { spawn } from 'node:child_process'
import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { ToolEntry } from '../../../shared/ipc'
import { getTool, TOOL_CATALOG, type ToolDefinition, type ToolInstallationResult } from './catalog'
import { loadGithubToken } from '../../storage'
import {
  assetFilterFor,
  exeCandidates,
  hasPortableBinary,
  isWindows,
  makeExecutable,
  portableBinaryName,
  releaseTarget,
  selectReleaseAsset
} from './platform'

export function toolsDir(): string {
  const dir = join(app.getPath('userData'), 'tools')
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Chemin du binaire portable pour un outil (suffixe et nom réels selon la plateforme). */
export function portableExePath(id: string, exeName?: string): string {
  const tool = getTool(id)
  return join(toolsDir(), id, portableBinaryName(id, exeName ?? tool?.exeName))
}

const GITHUB_ASSET_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'github-releases.githubusercontent.com',
])

function assertGithubAssetUrl(raw: string): void {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error(`URL d'asset invalide`)
  }
  if (u.protocol !== 'https:' || !GITHUB_ASSET_HOSTS.has(u.hostname)) {
    throw new Error(`Hôte d'asset non autorisé : ${u.hostname}`)
  }
}

export function resolveBinary(tool: string): string | null {
  if (!/^[a-z0-9][a-z0-9._-]{0,59}$/i.test(tool) || !getTool(tool)) return null
  const dir = join(toolsDir(), tool)
  for (const name of exeCandidates(tool, getTool(tool)?.exeName)) {
    const candidate = join(dir, name)
    if (existsSync(candidate)) return candidate
  }
  return null
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

async function rmRetry(dir: string, attempts = 4): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3 })
      return
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise((r) => setTimeout(r, 400))
    }
  }
}

async function isGitRepoCloned(dest: string): Promise<boolean> {
  if (!existsSync(join(dest, '.git'))) return false
  try {
    const code = await run('git', ['-C', dest, 'rev-parse', '--verify', 'HEAD'])
    return code === 0
  } catch {
    return false
  }
}

function run(cmd: string, args: string[], onOutput?: (line: string) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, shell: false, cwd: toolsDir() })
    child.stdout?.on('data', (b: Buffer) => onOutput?.(b.toString()))
    child.stderr?.on('data', (b: Buffer) => onOutput?.(b.toString()))
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? -1))
  })
}

function platformLabel(): string {
  return releaseTarget()
}

/** Un outil installé dans le PATH du système est considéré comme présent. */
async function detectedOnPath(tool: ToolDefinition): Promise<boolean> {
  if (!tool.detectCmd) return false
  try {
    return (await run(tool.detectCmd, ['--version'])) === 0
  } catch {
    return false
  }
}

export async function isInstalled(tool: ToolDefinition): Promise<boolean> {
  if (tool.source === 'winget' && tool.wingetId) {
    // Détection d'abord : fonctionne sur les deux plateformes sans privilèges.
    if (await detectedOnPath(tool)) return true
    if (!isWindows()) {
      // winget n'existe pas sous Linux. Sans paquet apt connu, on ne peut rien faire
      // de non-interactif ; l'utilisateur installe l'outil lui-même.
      return false
    }
    const code = await run('winget', ['list', '--exact', '--id', tool.wingetId])
    return code === 0
  }
  if (tool.source === 'github') {
    return hasPortableBinary(toolsDir(), tool)
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

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN ?? loadGithubToken()
  if (!token) return { 'User-Agent': 'BountyDesk/0.1' }
  return { 'User-Agent': 'BountyDesk/0.1', Authorization: `Bearer ${token}` }
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { headers: githubHeaders() })
  if (!res.ok) throw new Error(`Téléchargement refusé (HTTP ${res.status})`)
  assertGithubAssetUrl(res.url || url)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
}

/** @deprecated Utiliser selectReleaseAsset de ./platform. Conservé pour les tests existants. */
export function selectWindowsAsset(
  repo: string,
  want: string,
  assets: { name: string; browser_download_url: string }[] | undefined
): string {
  return selectReleaseAsset(repo, want, assets, 'windows')
}

/** Extrait une archive en routant sur l'outil adapté à son format réel. */
async function extractArchive(archive: string, dest: string, onOutput: (line: string) => void): Promise<void> {
  const isZip = /\.zip$/i.test(archive)
  // tar de GNU (Linux) ne gère pas le zip ; bsdtar (Windows 10+) le gère.
  const attempts: { cmd: string; args: string[] }[] = isZip
    ? [
        { cmd: 'tar', args: ['-xf', archive, '-C', dest] },
        { cmd: 'unzip', args: ['-o', '-q', archive, '-d', dest] }
      ]
    : [{ cmd: 'tar', args: ['-xf', archive, '-C', dest] }]

  for (const attempt of attempts) {
    let code: number
    try {
      code = await run(attempt.cmd, attempt.args, onOutput)
    } catch {
      continue // binaire absent sur cette plateforme
    }
    if (code === 0) return
  }
  throw new Error('Extraction échouée')
}

/**
 * Certaines releases Github n'imbriquent qu'une archive (ex rustscan :
 * x86_64-linux-rustscan.tar.gz.zip contient un .tar.gz). On extracte récursivement
 * tant qu'on ne voit pas le binaire attendu.
 */
async function extractUntilBinary(
  archive: string,
  dest: string,
  wanted: string[],
  onOutput: (line: string) => void,
  depth = 0
): Promise<void> {
  await extractArchive(archive, dest, onOutput)
  if (findFile(dest, (n) => wanted.includes(n.toLowerCase()))) return
  if (depth >= 2) return
  for (const entry of readdirRecursive(dest)) {
    if (/\.(zip|tar\.gz|tgz)$/i.test(entry)) {
      onOutput(`Archive imbriquée détectée (${basename(entry)})…`)
      await extractArchive(entry, dest, onOutput)
      if (findFile(dest, (n) => wanted.includes(n.toLowerCase()))) return
    }
  }
}

async function installGithub(tool: ToolDefinition, onOutput: (line: string) => void): Promise<void> {
  if (!tool.githubRepo) throw new Error('Référence GitHub manquante')
  const target = releaseTarget()
  const want = assetFilterFor(tool, target)
  if (!want) {
    throw new Error(
      tool.windowsOnly === true || isWindows() === false
        ? `${tool.name} n’est pas disponible sur ${platformLabel()} (asset absent).`
        : 'Référence GitHub manquante'
    )
  }
  const release = await fetch(`https://api.github.com/repos/${tool.githubRepo}/releases/latest`, {
    headers: { ...githubHeaders(), Accept: 'application/vnd.github+json' }
  })
  if (!release.ok) throw new Error(`Impossible de lire les releases GitHub (HTTP ${release.status})`)
  const body = (await release.json()) as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] }
  const assetUrl = selectReleaseAsset(tool.githubRepo, want, body.assets, target)
  assertGithubAssetUrl(assetUrl)

  // On nomme le fichier temporaire avec sa vraie extension : tar de GNU dispatche dessus.
  const assetName = new URL(assetUrl).pathname.split('/').pop() ?? `${tool.id}.zip`
  const archivePath = join(toolsDir(), `${tool.id}.download.${/\.zip$/i.test(assetName) ? 'zip' : 'tar.gz'}`)
  onOutput(`Téléchargement de ${tool.id} (${target})…`)
  await downloadToFile(assetUrl, archivePath)
  onOutput('Extraction…')
  const workDir = join(toolsDir(), `${tool.id}.tmp`)
  rmSync(workDir, { recursive: true, force: true })
  mkdirSync(workDir, { recursive: true })
  const wanted = exeCandidates(tool.id, tool.exeName).map((n) => n.toLowerCase())
  await extractUntilBinary(archivePath, workDir, wanted, onOutput)

  const found = findFile(workDir, (name) => wanted.includes(name.toLowerCase()))
  if (!found) throw new Error(`Binaire ${tool.exeName ?? tool.id} introuvable dans l’archive`)

  const destDir = join(toolsDir(), tool.id)
  rmSync(destDir, { recursive: true, force: true })
  mkdirSync(destDir, { recursive: true })
  const dest = join(destDir, portableBinaryName(tool.id, tool.exeName))
  copyFileSync(found, dest)
  makeExecutable(dest)
  rmSync(archivePath, { force: true })
  rmSync(workDir, { recursive: true, force: true })
  onOutput(`Installé : ${basename(dest)}`)
}

export function findFile(dir: string, match: (name: string) => boolean): string | null {
  for (const entry of readdirRecursive(dir)) {
    if (match(basename(entry))) return entry
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

  if (await isGitRepoCloned(dest)) {
    writeFileSync(join(dest, MARKER), JSON.stringify({ installedAt: new Date().toISOString(), repo: tool.githubRepo }, null, 2))
    onOutput(`Clone déjà présent dans ${dest}, rien à re-cloner.`)
    onOutput('Aucun script exécuté automatiquement : suivez le guide du framework avant usage.')
    return
  }

  await rmRetry(dest)
  mkdirSync(dest, { recursive: true })
  onOutput(`Clonage de https://github.com/${tool.githubRepo}…`)
  const code = await run('git', ['clone', '--depth', '1', `https://github.com/${tool.githubRepo}.git`, dest], onOutput)
  if (code !== 0) {
    await rmRetry(dest)
    throw new Error('Clonage échoué (git)')
  }
  writeFileSync(join(dest, MARKER), JSON.stringify({ installedAt: new Date().toISOString(), repo: tool.githubRepo }, null, 2))
  onOutput(`Cloné dans ${dest}`)
  onOutput('Aucun script exécuté automatiquement : suivez le guide du framework avant usage.')
}

/**
 * apt exige les privilèges root. On tente pkexec (polkit, invite graphique
 * standard sur les desktops Linux) ; en son absence on renvoie un message
 * actionnable au lieu d'un échec opaque. Retourne null si l'installation a réussi.
 */
async function installViaApt(tool: ToolDefinition, onOutput: (line: string) => void): Promise<string | null> {
  const pkg = tool.aptPackage!
  const args = ['apt-get', 'install', '-y', '--no-install-recommends', pkg]
  onOutput(`Installation de ${pkg} via apt (privilèges administrateur requis)…`)
  const code = await run('pkexec', args, onOutput).catch(() => -1)
  if (code === 0) return null
  const sudoCode = await run('sudo', ['-n', ...args], onOutput).catch(() => -1)
  if (sudoCode === 0) return null
  if (code === -1 && sudoCode === -1) {
    return `Installation impossible : ni pkexec ni sudo disponibles pour ${pkg}.`
  }
  return `apt a échoué (pkexec ${code}, sudo ${sudoCode}) pour ${pkg}.`
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
      if (tool.windowsOnly === true) {
        return { ok: false, error: `${tool.name} est un outil Windows uniquement.` }
      }
      if (tool.guiOnly === true) {
        return {
          ok: false,
          error: `${tool.name} est une application graphique : installez-la depuis son site ou votre store Linux.`
        }
      }
      if (isWindows()) {
        const code = await run(
          'winget',
          ['install', '--exact', '--id', tool.wingetId, '--silent', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity'],
          onOutput
        )
        if (code !== 0) return { ok: false, error: `winget a échoué (code ${code})` }
      } else if (tool.aptPackage) {
        const aptError = await installViaApt(tool, onOutput ?? (() => {}))
        if (aptError !== null) return { ok: false, error: aptError }
      } else {
        return {
          ok: false,
          error: `${tool.name} n’a pas de paquet Linux non-root. Installez-le avec votre gestionnaire de paquets, puis relancez.`
        }
      }
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