import { IntigritiClient, RATE_LIMIT, Throttler, AuthError } from '../services/intigriti'
import { clearToken, loadToken, saveToken } from './storage'

const throttler = new Throttler(RATE_LIMIT)
const client = new IntigritiClient({ throttler })

export function getClient(): IntigritiClient {
  return client
}

export function restoreToken(): void {
  const token = loadToken()
  if (token) {
    client.setToken(token)
  }
}

export function hasToken(): boolean {
  return client.getToken() !== null
}

export async function validateAndStoreToken(rawToken: string): Promise<{ ok: boolean; error?: string }> {
  const probe = new IntigritiClient({ throttler, token: rawToken })
  try {
    await probe.listPrograms({ limit: 1, offset: 0 })
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: 'Token refusé par Intigriti (401/403). Vérifie le jeton côté Intigriti.' }
    }
    return { ok: false, error: 'Impossible de joindre Intigriti pour le moment. ' + (error instanceof Error ? error.message : 'erreur inconnue') }
  }
  saveToken(rawToken)
  client.setToken(rawToken)
  return { ok: true }
}

export function clearTokenFromStore(): void {
  clearToken()
  client.setToken(null)
}