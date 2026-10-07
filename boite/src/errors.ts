// Codes d'erreur : chaque refus de la boîte a un code stable, lisible par un
// agent comme par un humain, et un code de sortie associé.
export type ErrorCode =
  | 'USAGE'
  | 'EMPTY'
  | 'COURTESY'
  | 'ARCHIVED'
  | 'NEEDS_READY'
  | 'NOT_FOUND'
  | 'ADDRESS'
  | 'REMOTE_UNSUPPORTED'
  | 'TIMEOUT'
  | 'INVALID_STATE'
  | 'DATABASE'

export const EXIT_CODES: Record<ErrorCode, number> = {
  USAGE: 2,
  EMPTY: 2,
  ADDRESS: 2,
  INVALID_STATE: 2,
  COURTESY: 3,
  ARCHIVED: 3,
  NEEDS_READY: 3,
  TIMEOUT: 4,
  NOT_FOUND: 5,
  REMOTE_UNSUPPORTED: 5,
  DATABASE: 1
}

export class BoiteError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'BoiteError'
    this.code = code
  }

  get exitCode(): number {
    return EXIT_CODES[this.code]
  }
}

// Même normalisation pour le linter de courtoisie et la colonne de recherche :
// sans cette égalité, « édition » ne retrouve jamais « edition ».
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
