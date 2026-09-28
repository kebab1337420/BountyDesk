import { isIP } from 'node:net'
import type { ScanDepth, ScopeDomain } from '../../../shared/ipc'

export const SCAN_DEPTHS: ScanDepth[] = ['low', 'med', 'high']

export interface ScanStep {
  tool: string
  args: string[]
  hint: string
}

export interface ScanPlan {
  depth: ScanDepth
  rateLimit: number
  targets: string[]
  steps: ScanStep[]
  userAgent: string
  requestHeader?: string
}

export const MAX_TARGETS = 200

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal')) return true
  if (isIP(h) === 0) return false
  if (h.includes(':')) {
    const c = h.toLowerCase()
    return c === '::1' || c.startsWith('fc') || c.startsWith('fd') || c.startsWith('fe80')
  }
  const parts = h.split('.').map((x) => Number(x))
  const a = parts[0] ?? 0
  const b = parts[1] ?? 0
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  )
}

const UA = 'BountyDesk-scan/1.0'

export interface PlanOptions {
  userAgent?: string | null
  requestHeader?: string | null
}

export function selectTargets(scope: ScopeDomain[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of scope) {
    if (!d.inScope) continue
    const raw = d.endpoint.trim()
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) continue
    let ep = raw
    if (!/^https?:\/\//i.test(ep)) ep = `https://${ep}`
    let u: URL
    try {
      u = new URL(ep)
    } catch {
      continue
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    if (isPrivateHost(u.hostname)) continue
    const norm = u.origin + u.pathname.replace(/\/+$/, '')
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(norm)
  }
  return out
}

export function buildPlan(depth: ScanDepth, targets: string[], rateLimit: number, opts?: PlanOptions): ScanPlan {
  const steps: ScanStep[] = []
  const ua = opts?.userAgent?.trim() || UA
  const hdr = opts?.requestHeader?.trim() || undefined
  const headerArgs = hdr ? ['-H', hdr] : []
  for (const t of targets) {
    if (depth === 'low' || depth === 'med' || depth === 'high') {
      steps.push({
        tool: 'curl',
        args: ['-s', '-I', '--max-time', '15', '-A', ua, ...headerArgs, t],
        hint: `en-têtes HTTP ${t}`,
      })
    }
    const severity = depth === 'low' ? 'low,medium' : depth === 'med' ? 'low,medium,high' : 'low,medium,high,critical'
    steps.push({
      tool: 'nuclei',
      args: ['-u', t, '-severity', severity, '-silent', '-rate', String(rateLimit), '-stats-json'],
      hint: `nuclei (${severity}) ${t}`,
    })
    if (depth === 'med' || depth === 'high') {
      steps.push({
        tool: 'nuclei',
        args: ['-u', t, '-tags', 'tech,exposure', '-silent', '-rate', String(rateLimit)],
        hint: `nuclei tech/exposure ${t}`,
      })
    }
    if (depth === 'high') {
      steps.push({
        tool: 'ffuf',
        args: ['-u', `${t}/FUZZ`, '-w', 'MISSING_WORDLIST', '-mc', '200,204,301,302,307,401,403', '-rate', String(rateLimit)],
        hint: `ffuf découverte de chemins ${t}`,
      })
    }
  }
  return { depth, rateLimit, targets, steps, userAgent: ua, requestHeader: hdr }
}