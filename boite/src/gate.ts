import { normalizeText, type ErrorCode } from './errors.ts'

export type AgentState = 'idle' | 'queued' | 'running' | 'waiting' | 'paused' | 'archived'
export type Activity = 'complete' | 'edit' | null

// Working = queued/running/waiting : l'agent est occupé, le contacter est une
// interruption et non une conversation neutre.
export const WORKING_STATES: readonly AgentState[] = ['queued', 'running', 'waiting']

// Une complétion ouvre 15 minutes de grâce pour recontacter l'agent au repos.
export const GRACE_MS = 15 * 60_000

export interface GateAgent {
  state: AgentState
  lastActivity: Activity
  completedAt: number | null
}

export interface GateMessage {
  kind: 'send' | 'reply'
  ready: boolean
  body: string
  refs: readonly string[]
  now: number
}

export type GateRefusalCode = Extract<ErrorCode, 'EMPTY' | 'COURTESY' | 'ARCHIVED' | 'NEEDS_READY'>

export type GateResult =
  | { verdict: 'deliver'; warnings: string[] }
  | { verdict: 'hold'; warnings: string[] }
  | { verdict: 'refuse'; code: GateRefusalCode; message: string; warnings: string[] }

export function isWorking(state: AgentState): boolean {
  return WORKING_STATES.includes(state)
}

// Courtoisie/sondage uniquement : la boîte porte des tâches et des ressources
// partagées. Ancré sur tout le corps, normalisé (sans accents ni apostrophes) :
// « merci beaucoup, regarde le rapport » passe, « merci » seul non.
const COURTESY_PATTERNS: readonly RegExp[] = [
  /^(salut|salut a tous|bonjour|bonsoir|hello|hi|hey|yo|coucou|bonne journee|bonne nuit)[!.? ]*$/,
  /^(merci( beaucoup| bien)?|thanks|thx|ty|super|parfait|nickel|cool|genial|bien joue|top)[!.? ]*$/,
  /^(ok|okay|noted|bien recu|recu|cu|compris|entendu|affirmatif)[!.? ]*$/,
  /^(ping|coucou tu es la|toujours la|des news|any news|any update|still there|status|ca avance|tu as avance|tu en es ou|tu as fini|quoi de neuf)[?!. ]*$/
]

export function lintContent(
  body: string,
  refs: readonly string[]
): { code: GateRefusalCode; message: string } | null {
  if (body.trim().length === 0) {
    return { code: 'EMPTY', message: 'corps vide : une tâche ou une ressource est attendue' }
  }
  if (refs.length > 0) return null
  const normalized = normalizeText(body)
  for (const pattern of COURTESY_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        code: 'COURTESY',
        message: `message de courtoisie ou de sondage refusé ('${body.trim()}') : la boîte ne porte que des tâches et des ressources partagées`
      }
    }
  }
  return null
}

export function gate(agent: GateAgent, msg: GateMessage): GateResult {
  const content = lintContent(msg.body, msg.refs)
  if (content) return { verdict: 'refuse', code: content.code, message: content.message, warnings: [] }

  // Un fil archivé reste indisponible : on n'y écrit même pas.
  if (agent.state === 'archived') {
    return {
      verdict: 'refuse',
      code: 'ARCHIVED',
      message: 'fil archivé : indisponible (boite agents restore pour le rouvrir)',
      warnings: []
    }
  }

  // Une pause retient la livraison ; la livraison suivante réactivera les projets.
  if (agent.state === 'paused') {
    return { verdict: 'hold', warnings: ["pause en cours : message retenu jusqu'au resume"] }
  }

  if (isWorking(agent.state)) {
    // Une réponse continue un échange en cours : ce n'est pas une interruption.
    if (msg.kind === 'reply') return { verdict: 'deliver', warnings: [] }
    if (!msg.ready) {
      return {
        verdict: 'refuse',
        code: 'NEEDS_READY',
        message: `agent ${agent.state} : l'interruption demande une disponibilité explicite (--ready)`,
        warnings: []
      }
    }
    return {
      verdict: 'deliver',
      warnings: [`interruption : l'agent était ${agent.state}, --ready a rendu la disruption explicite`]
    }
  }

  // Idle : contact permis mais découragé, sauf complétion dans les 15 dernières
  // minutes. Les éditions ne réparent jamais cette grâce.
  const freshCompletion =
    agent.lastActivity === 'complete' &&
    agent.completedAt !== null &&
    msg.now >= agent.completedAt &&
    msg.now - agent.completedAt <= GRACE_MS

  if (freshCompletion) return { verdict: 'deliver', warnings: [] }
  return { verdict: 'deliver', warnings: [idleWarning(agent)] }
}

function idleWarning(agent: GateAgent): string {
  if (agent.lastActivity === 'edit') {
    return 'contact découragé : dernière activité = édition, et les éditions ne comptent pas (une complétion de moins de 15 min ouvre la grâce)'
  }
  if (agent.completedAt === null) {
    return 'contact découragé : aucune complétion enregistrée pour cet agent'
  }
  return 'contact découragé : dernière complétion de plus de 15 minutes'
}
