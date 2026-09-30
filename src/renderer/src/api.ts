import type {
  AgentSessionDecideResult,
  AgentSessionRequestResult,
  AgentSessionsResult,
  AgentStatusesResult,
  AgentTokenAddResult,
  AgentTokenRevokeResult,
  AgentTokensResult,
  AuthStatus,
  AuthValidateResult,
  CredentialInput,
  CredentialSaveResult,
  CredentialsListResult,
  CreateGroupResult,
  CreateTagResult,
  DbResult,
  DetailResult,
  GroupInfo,
  McpDiagnoseResult,
  McpFirewallFixResult,
  McpMachinesResult,
  McpRegenerateResult,
  McpRequestsResult,
  McpSetEnabledResult,
  McpStatusInfo,
  McpTokenAddResult,
  McpTokenRevokeResult,
  OpenExternalResult,
  ProgramsPage,
  ProgramsQuery,
  ScanDepth,
  ScanEventsResult,
  ScanListResult,
  ScanStartResult,
  SyncResult,
  TagInfo,
  ToolInstallResult,
  ToolsListResult,
  GitHubTokenStatusResult,
  GitHubTokenSetResult
} from '../../shared/ipc'

export const Api = {
  auth: {
    status: (): Promise<AuthStatus> => window.bountydesk.auth.getStatus(),
    validate: (token: string): Promise<AuthValidateResult> => window.bountydesk.auth.validate(token),
    logout: (): Promise<void> => window.bountydesk.auth.clear()
  },
  programs: {
    list: (query: ProgramsQuery): Promise<ProgramsPage> => window.bountydesk.programs.list(query),
    sync: (): Promise<SyncResult> => window.bountydesk.programs.sync(),
    detail: (programId: string): Promise<DetailResult> => window.bountydesk.programs.detail(programId)
  },
  credentials: {
    list: (programId: string): Promise<CredentialsListResult> => window.bountydesk.credentials.list(programId),
    add: (input: CredentialInput): Promise<CredentialSaveResult> => window.bountydesk.credentials.add(input),
    update: (id: number, patch: Partial<CredentialInput>): Promise<DbResult> =>
      window.bountydesk.credentials.update(id, patch),
    remove: (id: number): Promise<DbResult> => window.bountydesk.credentials.remove(id)
  },
  shell: {
    openExternal: (url: string): Promise<OpenExternalResult> => window.bountydesk.shell.openExternal(url)
  },
  scans: {
    start: (programId: string, opts: { depth: ScanDepth; roeConfirm: boolean; rateLimit?: number }): Promise<ScanStartResult> =>
      window.bountydesk.scans.start(programId, opts),
    list: (programId: string): Promise<ScanListResult> => window.bountydesk.scans.list(programId),
    events: (scanId: number, afterSeq: number): Promise<ScanEventsResult> =>
      window.bountydesk.scans.events(scanId, afterSeq),
    stop: (scanId: number): Promise<DbResult> => window.bountydesk.scans.stop(scanId)
  },
  tools: {
    list: (): Promise<ToolsListResult> => window.bountydesk.tools.list(),
    install: (id: string): Promise<ToolInstallResult> => window.bountydesk.tools.install(id),
    githubTokenStatus: (): Promise<GitHubTokenStatusResult> => window.bountydesk.tools.githubTokenStatus(),
    githubTokenSet: (token: string): Promise<GitHubTokenSetResult> => window.bountydesk.tools.githubTokenSet(token),
    githubTokenClear: (): Promise<DbResult> => window.bountydesk.tools.githubTokenClear()
  },
  mcp: {
    status: (): Promise<McpStatusInfo> => window.bountydesk.mcp.status(),
    setEnabled: (enabled: boolean, opts?: { port?: number | null; lan?: boolean }): Promise<McpSetEnabledResult> =>
      window.bountydesk.mcp.setEnabled(enabled, opts),
    regenerateToken: (): Promise<McpRegenerateResult> => window.bountydesk.mcp.regenerateToken(),
    addToken: (label: string): Promise<McpTokenAddResult> => window.bountydesk.mcp.addToken(label),
    revokeToken: (id: string): Promise<McpTokenRevokeResult> => window.bountydesk.mcp.revokeToken(id),
    requests: (limit?: number): Promise<McpRequestsResult> => window.bountydesk.mcp.requests(limit),
    diagnose: (): Promise<McpDiagnoseResult> => window.bountydesk.mcp.diagnose(),
    firewallFix: (): Promise<McpFirewallFixResult> => window.bountydesk.mcp.firewallFix(),
    machines: (limit?: number): Promise<McpMachinesResult> => window.bountydesk.mcp.machines(limit)
  },
  agent: {
    tokens: (): Promise<AgentTokensResult> => window.bountydesk.agent.tokens(),
    addToken: (label: string): Promise<AgentTokenAddResult> => window.bountydesk.agent.addToken(label),
    revokeToken: (id: string): Promise<AgentTokenRevokeResult> => window.bountydesk.agent.revokeToken(id),
    statuses: (): Promise<AgentStatusesResult> => window.bountydesk.agent.statuses(),
    sessions: (): Promise<AgentSessionsResult> => window.bountydesk.agent.sessions(),
    sessionRequest: (tokenId: string): Promise<AgentSessionRequestResult> =>
      window.bountydesk.agent.sessionRequest(tokenId),
    sessionDecide: (sessionId: number, approve: boolean): Promise<AgentSessionDecideResult> =>
      window.bountydesk.agent.sessionDecide(sessionId, approve),
    sessionEnd: (viewToken: string): Promise<DbResult> => window.bountydesk.agent.sessionEnd(viewToken),
    getViewToken: (): string => window.bountydesk.agent.getViewToken()
  },
  favorites: {
    set: (programId: string, favorite: boolean): Promise<DbResult> =>
      window.bountydesk.favorites.set(programId, favorite)
  },
  notes: {
    set: (programId: string, note: string): Promise<DbResult> => window.bountydesk.notes.set(programId, note)
  },
  groups: {
    list: (): Promise<GroupInfo[]> => window.bountydesk.groups.list(),
    create: (name: string): Promise<CreateGroupResult> => window.bountydesk.groups.create(name),
    rename: (id: number, name: string): Promise<DbResult> => window.bountydesk.groups.rename(id, name),
    remove: (id: number): Promise<DbResult> => window.bountydesk.groups.remove(id),
    addMember: (groupId: number, programId: string): Promise<DbResult> =>
      window.bountydesk.groups.addMember(groupId, programId),
    removeMember: (groupId: number, programId: string): Promise<DbResult> =>
      window.bountydesk.groups.removeMember(groupId, programId)
  },
  tags: {
    list: (): Promise<TagInfo[]> => window.bountydesk.tags.list(),
    create: (name: string): Promise<CreateTagResult> => window.bountydesk.tags.create(name),
    remove: (id: number): Promise<DbResult> => window.bountydesk.tags.remove(id),
    addToProgram: (programId: string, tagId: number): Promise<DbResult> =>
      window.bountydesk.tags.addToProgram(programId, tagId),
    removeFromProgram: (programId: string, tagId: number): Promise<DbResult> =>
      window.bountydesk.tags.removeFromProgram(programId, tagId)
  }
}