export const IPC = {
  AuthStatus: 'auth:status',
  AuthValidate: 'auth:validate',
  AuthClear: 'auth:clear',
  ProgramsList: 'programs:list',
  ProgramsSync: 'programs:sync',
  FavoriteSet: 'favorite:set',
  NoteSet: 'note:set',
  GroupsList: 'groups:list',
  GroupsCreate: 'groups:create',
  GroupsRename: 'groups:rename',
  GroupsRemove: 'groups:remove',
  GroupsAddMember: 'groups:addMember',
  GroupsRemoveMember: 'groups:removeMember',
  TagsList: 'tags:list',
  TagsCreate: 'tags:create',
  TagsRemove: 'tags:remove',
  TagsAddToProgram: 'tags:addToProgram',
  TagsRemoveFromProgram: 'tags:removeFromProgram',
  ProgramDetailGet: 'programs:detail',
  CredentialsList: 'credentials:list',
  CredentialsAdd: 'credentials:add',
  CredentialsUpdate: 'credentials:update',
  CredentialsRemove: 'credentials:remove',
  OpenExternal: 'shell:openExternal',
  ScanStart: 'scan:start',
  ScanList: 'scan:list',
  ScanEvents: 'scan:events',
  ScanStop: 'scan:stop',
  ToolsList: 'tools:list',
  ToolsInstall: 'tools:install',
  McpStatus: 'mcp:status',
  McpSetEnabled: 'mcp:setEnabled',
  McpRegenerateToken: 'mcp:regenerateToken',
  McpTokenAdd: 'mcp:tokenAdd',
  McpTokenRevoke: 'mcp:tokenRevoke',
  McpRequests: 'mcp:requests'
} as const

export interface AuthStatus {
  configured: boolean
}

export interface AuthValidateResult {
  ok: boolean
  error?: string
}

export interface ProgramSummary {
  id: string
  handle: string
  name: string
  type: string | null
  status: string | null
  confidentiality: string | null
  minBounty: { value: number; currency: string } | null
  maxBounty: { value: number; currency: string } | null
  industry: string | null
  webLink: string | null
  following: boolean
  favorite: boolean
  note: string
  tags: string[]
  groups: string[]
  updatedAt: number
}

export interface ProgramsQuery {
  search?: string
  favoriteOnly?: boolean
  groupId?: number
  tagId?: number
  sort?: 'name' | 'bounty' | 'recent'
  dir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface ProgramsPage {
  records: ProgramSummary[]
  total: number
}

export type DbFail = { ok: false; error: string }

export type DbResult = { ok: true } | DbFail

export type SyncResult = { ok: true; synced: number; at: number } | DbFail

export type CreateGroupResult = { ok: true; group: { id: number } } | DbFail

export type CreateTagResult = { ok: true; tag: { id: number } } | DbFail

export interface GroupInfo {
  id: number
  name: string
  color: string | null
  memberCount: number
}

export interface TagInfo {
  id: number
  name: string
  count: number
}

export interface MoneyInfo {
  value: number
  currency: string
}

export interface ScopeDomain {
  id: string
  type: string
  endpoint: string
  tier: string
  description: string
  inScope: boolean
}

export interface RoeInfo {
  description: string
  intigritiMe: boolean
  automatedTooling: number | null
  userAgent: string | null
  requestHeader: string | null
  safeHarbour: boolean
  attachments: { url: string; code: number }[]
}

export interface ProgramDetailData {
  programId: string
  handle: string
  name: string
  status: string | null
  type: string | null
  confidentiality: string | null
  industry: string | null
  webLink: string | null
  minBounty: MoneyInfo | null
  maxBounty: MoneyInfo | null
  scope: ScopeDomain[]
  roe: RoeInfo | null
  fetchedAt: number
}

export interface CredentialRecord {
  id: number
  programId: string
  label: string
  username: string
  secret: string
  note: string
  updatedAt: number
}

export interface CredentialInput {
  programId: string
  label: string
  username: string
  secret: string
  note: string
}

export type DetailResult = { ok: true; detail: ProgramDetailData } | DbFail

export type CredentialsListResult = { ok: true; credentials: CredentialRecord[] } | DbFail

export type CredentialSaveResult = { ok: true; id: number } | DbFail

export type OpenExternalResult = { ok: boolean; error?: string }

export type ScanDepth = 'low' | 'med' | 'high'

export interface ScanRecord {
  id: number
  programId: string
  depth: ScanDepth
  status: string
  rateLimit: number
  roeConfirm: boolean
  startedAt: number
  finishedAt: number | null
}

export interface ScanEvent {
  seq: number
  ts: number
  level: string
  message: string
}

export type ScanStartResult = { ok: true; scanId: number } | DbFail

export type ScanListResult = { ok: true; scans: ScanRecord[] } | DbFail

export type ScanEventsResult = { ok: true; events: ScanEvent[]; done: boolean } | DbFail

export interface ToolEntry {
  id: string
  name: string
  description: string
  category: string
  source: 'winget' | 'github' | 'git'
  installed: boolean
  defaultChecked: boolean
  docs?: string
}

export type ToolsListResult = { ok: true; tools: ToolEntry[] } | DbFail

export type ToolInstallResult = { ok: true; installed: boolean; output: string } | { ok: false; error: string; output: string }

export interface McpTokenInfo {
  id: string
  label: string
  token: string
}

export interface McpStatusInfo {
  enabled: boolean
  running: boolean
  port: number | null
  lan: boolean
  hosts: string[]
  token: string | null
  tokens: McpTokenInfo[]
}

export type McpSetEnabledResult = { ok: true; status: McpStatusInfo } | DbFail

export type McpRegenerateResult = { ok: true; token: string; status: McpStatusInfo } | DbFail

export type McpTokenAddResult = { ok: true; token: string; status: McpStatusInfo } | DbFail

export type McpTokenRevokeResult = { ok: true; status: McpStatusInfo } | DbFail

export interface McpRequestRow {
  id: number
  ts: number
  tokenLabel: string
  tool: string
  args: string
  status: string
  ms: number
}

export type McpRequestsResult = { ok: true; rows: McpRequestRow[] } | DbFail

export interface BountyDeskBridge {
  auth: {
    getStatus(): Promise<AuthStatus>
    validate(token: string): Promise<AuthValidateResult>
    clear(): Promise<void>
  }
  programs: {
    list(query: ProgramsQuery): Promise<ProgramsPage>
    sync(): Promise<SyncResult>
    detail(programId: string): Promise<DetailResult>
  }
  credentials: {
    list(programId: string): Promise<CredentialsListResult>
    add(input: CredentialInput): Promise<CredentialSaveResult>
    update(id: number, patch: Partial<CredentialInput>): Promise<DbResult>
    remove(id: number): Promise<DbResult>
  }
  shell: {
    openExternal(url: string): Promise<OpenExternalResult>
  }
  scans: {
    start(programId: string, opts: { depth: ScanDepth; roeConfirm: boolean; rateLimit?: number }): Promise<ScanStartResult>
    list(programId: string): Promise<ScanListResult>
    events(scanId: number, afterSeq: number): Promise<ScanEventsResult>
    stop(scanId: number): Promise<DbResult>
  }
  tools: {
    list(): Promise<ToolsListResult>
    install(id: string): Promise<ToolInstallResult>
  }
  mcp: {
    status(): Promise<McpStatusInfo>
    setEnabled(enabled: boolean, opts?: { port?: number | null; lan?: boolean }): Promise<McpSetEnabledResult>
    regenerateToken(): Promise<McpRegenerateResult>
    addToken(label: string): Promise<McpTokenAddResult>
    revokeToken(id: string): Promise<McpTokenRevokeResult>
    requests(limit?: number): Promise<McpRequestsResult>
  }
  favorites: {
    set(programId: string, favorite: boolean): Promise<DbResult>
  }
  notes: {
    set(programId: string, note: string): Promise<DbResult>
  }
  groups: {
    list(): Promise<GroupInfo[]>
    create(name: string): Promise<CreateGroupResult>
    rename(id: number, name: string): Promise<DbResult>
    remove(id: number): Promise<DbResult>
    addMember(groupId: number, programId: string): Promise<DbResult>
    removeMember(groupId: number, programId: string): Promise<DbResult>
  }
  tags: {
    list(): Promise<TagInfo[]>
    create(name: string): Promise<CreateTagResult>
    remove(id: number): Promise<DbResult>
    addToProgram(programId: string, tagId: number): Promise<DbResult>
    removeFromProgram(programId: string, tagId: number): Promise<DbResult>
  }
}