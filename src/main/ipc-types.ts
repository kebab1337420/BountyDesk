import type { AuthStatus, AuthValidateResult } from '../shared/ipc'

export interface AuthRemoteHandlers {
  status: AuthStatus
  validate: AuthValidateResult
}

export interface MainRemote {
  auth: {
    getStatus(): Promise<AuthStatus>
    validate(token: string): Promise<AuthValidateResult>
  }
}