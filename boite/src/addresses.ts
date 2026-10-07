import { hostname } from 'node:os'
import { BoiteError } from './errors.ts'

// Une adresse est `thread-id` (machine locale) ou `machine/thread-id`.
export interface ParsedAddress {
  machine: string | null
  threadId: string
}

export function localMachine(): string {
  return hostname()
}

export function parseAddress(raw: string): ParsedAddress {
  const value = raw.trim()
  if (value.length === 0) {
    throw new BoiteError('ADDRESS', "adresse vide : attendu 'thread-id' ou 'machine/thread-id'")
  }
  const parts = value.split('/')
  if (parts.length === 1) {
    return { machine: null, threadId: parts[0] as string }
  }
  if (parts.length !== 2) {
    throw new BoiteError('ADDRESS', `adresse invalide '${value}' : un seul '/' attendu`)
  }
  const [machine, threadId] = parts as [string, string]
  if (machine.length === 0 || threadId.length === 0) {
    throw new BoiteError('ADDRESS', `adresse invalide '${value}' : machine ou thread vide`)
  }
  return { machine, threadId }
}

// `machine` null = locale ; sinon la machine doit être la locale tant qu'aucun
// transport n'existe — erreur explicite plutôt que silencieusement local.
export function resolveMachine(machine: string | null): string {
  const local = localMachine()
  if (machine === null) return local
  if (machine.toLowerCase() === local.toLowerCase()) return local
  throw new BoiteError(
    'REMOTE_UNSUPPORTED',
    `machine '${machine}' : ce transport n'existe pas encore (locale = '${local}')`
  )
}
