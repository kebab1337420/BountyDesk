import { chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ToolDefinition } from './catalog'

export type HostPlatform = 'win32' | 'linux' | 'darwin'
export type ReleaseTarget = 'windows' | 'linux' | 'darwin'

export function hostPlatform(): HostPlatform {
  const p = process.platform
  if (p === 'win32') return 'win32'
  if (p === 'darwin') return 'darwin'
  return 'linux'
}

/** Plateforme des releases GitHub à télécharger pour la machine courante. */
export function releaseTarget(): ReleaseTarget {
  const p = hostPlatform()
  return p === 'win32' ? 'windows' : p
}

export function isWindows(): boolean {
  return hostPlatform() === 'win32'
}

/** Extension du binaire portable : ".exe" sur Windows, vide ailleurs. */
export function exeSuffix(): string {
  return isWindows() ? '.exe' : ''
}

/**
 * Noms de fichiers acceptés pour le binaire d'un outil, par ordre de préférence.
 * Les archives Linux contiennent le binaire sans extension ; certaines Windows
 * livrent un binaire sans extension dans un zip.
 */
export function exeCandidates(id: string, exeName?: string): string[] {
  const stem = exeName ?? id
  const all = [stem, `${stem}.exe`]
  const ordered = isWindows() ? [`${stem}.exe`, stem] : [stem, `${stem}.exe`]
  return [...new Set(ordered)].filter((n) => all.includes(n))
}

/** Nom de fichier du binaire portable installé par Venari. */
export function portableBinaryName(id: string, exeName?: string): string {
  const stem = exeName ?? id
  return `${stem}${exeSuffix()}`
}

const ARCH64 = /(amd64|x86_64|x64|64bit|64-bit)/i
const ARCH32 = /(i[3-6]86|386|win32|x86[^_]|32bit|32-bit)/i

type AssetPlatform = ReleaseTarget | 'unknown'

/**
 * Classe un asset par plateforme. L'ordre est capital : "darwin" contient la
 * sous-chaîne "win", il doit donc être testé avant windows.
 */
export function assetPlatform(name: string): AssetPlatform {
  if (/(darwin|macos|mac_os|osx|apple)/i.test(name)) return 'darwin'
  if (/(linux|musl|gnu)/i.test(name)) return 'linux'
  if (/(windows|win32|win64|mingw|msvc)/i.test(name)) return 'windows'
  if (/(freebsd|openbsd|netbsd|solaris|android|ios)/i.test(name)) return 'unknown'
  if (/(wasm|source)/i.test(name)) return 'unknown'
  return 'unknown'
}

/**
 * Sélectionne l'asset de release correspondant à la plateforme cible.
 * Ordre : fragment de nom -> plateforme -> arch 64 bits -> exclusion 32 bits.
 */
export function selectReleaseAsset(
  repo: string,
  want: string,
  assets: { name: string; browser_download_url: string }[] | undefined,
  target: ReleaseTarget = 'windows'
): string {
  const wantLower = want.toLowerCase()
  const extOk = /\.(zip|tar\.gz|tgz)$/i
  const label = target === 'windows' ? 'windows' : target
  let matches = (assets ?? []).filter(
    (a) => a.name.toLowerCase().includes(wantLower) && extOk.test(a.name)
  )
  if (matches.length === 0) throw new Error(`Aucun asset ${label} trouvé pour ${repo}`)

  // On ne retient que les assets de la plateforme cible, plus ceux dont le nom
  // ne mentionne aucune plateforme (findomain-linux.zip, etc.). Si tous les
  // candidats nomment explicitement une autre plateforme, installer un binaire
  // Windows sous Linux (ou l'inverse) n'a aucun sens : on échoue franchement.
  const platformed = matches.filter((a) => {
    const p = assetPlatform(a.name)
    return p === target || p === 'unknown'
  })
  if (platformed.length > 0) matches = platformed
  else throw new Error(`Aucun asset ${label} trouvé pour ${repo}`)
  if (matches.length > 1) {
    const amd64 = matches.filter((a) => ARCH64.test(a.name))
    if (amd64.length === 1) matches = amd64
  }
  if (matches.length > 1) {
    const bits64 = matches.filter((a) => !ARCH32.test(a.name))
    if (bits64.length === 1) matches = bits64
  }
  if (matches.length > 1) {
    throw new Error(
      `Asset ${label} ambigu pour ${repo} (${matches.length} candidats) — configurez githubAsset plus précisément`
    )
  }
  return matches[0]!.browser_download_url
}

/** Fragment de nom d'asset à utiliser pour la plateforme courante. */
export function assetFilterFor(tool: ToolDefinition, target: ReleaseTarget = releaseTarget()): string | undefined {
  if (target === 'linux' && tool.githubAssetLinux) return tool.githubAssetLinux
  return tool.githubAsset
}

/** Rend un binaire téléchargé exécutable (nécessaire sous Unix). */
export function makeExecutable(path: string): void {
  if (isWindows()) return
  try {
    chmodSync(path, 0o755)
  } catch {
    /* le chmod peut échouer sur un FS en lecture seule : non bloquant */
  }
}

/** Vrai si un binaire portable est présent pour cet outil. */
export function hasPortableBinary(toolsDir: string, tool: ToolDefinition): boolean {
  return exeCandidates(tool.id, tool.exeName).some((n) => existsSync(join(toolsDir, tool.id, n)))
}
