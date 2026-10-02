import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { basename } from 'node:path'

/**
 * Noms de fichiers de somme de controle publies par les projets dans leurs
 * releases (projectdiscovery, etc.). Comparaison insensible a la casse.
 */
const CHECKSUM_ASSETS = new Set([
  'checksums.txt',
  'checksums.sha256',
  'checksum.txt',
  'checksums',
  'sha256sums.txt',
  'sha256sums',
  'sha256sum',
])

/** L'asset porte-t-il les sommes de controle de tous les binaires de la release ? */
export function isChecksumAsset(name: string): boolean {
  return CHECKSUM_ASSETS.has(basename(name).toLowerCase())
}

/**
 * Extrait les sommes d'un fichier de checksums classique. Gere les trois
 * formats que produisent sha256sum, shasum et les scripts maison :
 *   "<hex>  <fichier>", "<hex> *<fichier>", "SHA256 (<fichier>) = <hex>".
 * La cle est le nom de fichier seul, en minuscules.
 */
export function parseChecksums(text: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    let m = /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line)
    if (m) {
      out.set(basename(m[2]!.trim()).toLowerCase(), m[1]!.toLowerCase())
      continue
    }
    m = /^SHA256\s*\((.+)\)\s*=\s*([0-9a-f]{64})$/i.exec(line)
    if (m) out.set(basename(m[1]!.trim()).toLowerCase(), m[2]!.toLowerCase())
  }
  return out
}

/** SHA-256 d'un fichier, calcule en flux pour ne jamais charger l'archive en RAM. */
export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/** Ordre constant pour ne pas dependre du details des algorithmes du systeme. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
