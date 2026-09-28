import { safeStorage } from 'electron'
import { getRepository } from '../db'
import type { CredentialInput, CredentialRecord } from '../../shared/ipc'

function encrypt(secret: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return 'enc:' + safeStorage.encryptString(secret).toString('base64')
  }
  return 'b64:' + Buffer.from(secret, 'utf8').toString('base64')
}

function decrypt(enc: string): string {
  if (!enc) return ''
  if (enc.startsWith('enc:')) {
    if (!safeStorage.isEncryptionAvailable()) return ''
    try {
      return safeStorage.decryptString(Buffer.from(enc.slice(4), 'base64'))
    } catch {
      return ''
    }
  }
  if (enc.startsWith('b64:')) {
    return Buffer.from(enc.slice(4), 'base64').toString('utf8')
  }
  return ''
}

export function listCredentials(programId: string): CredentialRecord[] {
  return getRepository().listCredentials(programId).map((c) => ({
    id: c.id,
    programId: c.program_id,
    label: c.label,
    username: c.username,
    secret: decrypt(c.secret_enc),
    note: c.note,
    updatedAt: c.updated_at,
  }))
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