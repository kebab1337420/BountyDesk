import { safeStorage } from 'electron'
import { getRepository } from '../db'
import type { CredentialInput, CredentialRecord } from '../../shared/ipc'

function encrypt(secret: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Chiffrement safeStorage indisponible : refus d’enregistrer le secret en clair')
  }
  return 'enc:' + safeStorage.encryptString(secret).toString('base64')
}

function decrypt(enc: string): string {
  if (!enc || !enc.startsWith('enc:')) return ''
  if (!safeStorage.isEncryptionAvailable()) return ''
  try {
    return safeStorage.decryptString(Buffer.from(enc.slice(4), 'base64'))
  } catch {
    return ''
  }
}

export function listCredentials(programId: string): CredentialRecord[] {
  return getRepository().listCredentials(programId).map((c) => ({
    id: c.id,
    programId: c.program_id,
    label: c.label,
    username: c.username,
    hasSecret: c.secret_enc !== '',
    note: c.note,
    updatedAt: c.updated_at,
  }))
}

/** Dechiffre un secret a la demande, pour la seule ligne que l'utilisateur a choisi de reveler. */
export function revealCredentialSecret(id: number): string {
  const row = getRepository().getCredential(id)
  return row ? decrypt(row.secret_enc) : ''
}

export function addCredential(input: CredentialInput): number {
  return getRepository().createCredential({
    programId: input.programId,
    label: input.label,
    username: input.username,
    secretEnc: encrypt(input.secret),
    note: input.note,
  })
}

export function updateCredentialPatch(id: number, patch: Partial<CredentialInput>): void {
  getRepository().updateCredential(id, {
    label: patch.label,
    username: patch.username,
    secretEnc: patch.secret !== undefined ? encrypt(patch.secret) : undefined,
    note: patch.note,
  })
}

export function removeCredential(id: number): void {
  getRepository().removeCredential(id)
}