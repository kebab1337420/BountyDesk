import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { getRepository } from '../../db'
import { resolveBinary, resolveWordlist } from '../tools/installer'
import type { ScanPlan } from './plan'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export type ScanEventLevel = 'info' | 'ok' | 'warn' | 'err'

const runners = new Map<number, ScanRunner>()

export function getRunner(scanId: number): ScanRunner | undefined {
  return runners.get(scanId)
}

export function activeScanCount(): number {
  let n = 0
  for (const r of runners.values()) if (!r.isStopped()) n += 1
  return n
}

export function activeScanForProgram(programId: string): ScanRunner | undefined {
  const repo = getRepository()
  for (const [scanId, r] of runners) {
    if (r.isStopped()) continue
    const scan = repo.getScan(scanId)
    if (scan && scan.program_id === programId) return r
  }
  return undefined
}

export function requestStop(scanId: number): boolean {
  const r = runners.get(scanId)
  if (!r) return false
  r.stop()
  return true
}

function binary(tool: string): string {
  return resolveBinary(tool) ?? tool
}

function toolExists(tool: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const child = spawn(binary(tool), ['--version'], { windowsHide: true, stdio: 'ignore', shell: false })
      child.on('error', () => resolve(false))
      child.on('spawn', () => {
        child.kill()
        resolve(true)
      })
    } catch {
      resolve(false)
    }
  })
}

export class ScanRunner {
  private current: ChildProcessWithoutNullStreams | null = null
  private stopped = false
  private seq = 0

  constructor(private readonly scanId: number) {
    runners.set(scanId, this)
  }

  isStopped(): boolean {
    return this.stopped
  }

  stop(): void {
    this.stopped = true
    if (this.current && !this.current.killed) {
      try {
        this.current.kill()
      } catch {
        /* ignore */
      }
    }
  }

  private log(level: ScanEventLevel, message: string): void {
    this.seq += 1
    getRepository().appendScanEvent(this.scanId, this.seq, level, message, Date.now())
  }

  async run(plan: ScanPlan): Promise<void> {
    const repo = getRepository()
    try {
      this.log('info', `Scan démarré (${plan.depth}, ${plan.rateLimit} req/s) — ${plan.targets.length} cibles`)
      for (const t of plan.targets) this.log('info', `cible: ${t}`)

      const intervalMs = Math.max(50, Math.round(1000 / Math.max(1, plan.rateLimit)))

      const missingTools = new Set<string>()
      let ranTools = 0
      for (const step of plan.steps) {
        if (this.stopped) break
        if (step.args.includes('MISSING_WORDLIST')) {
          const wl = resolveWordlist()
          if (wl) {
            const args = step.args.map((a) => (a === 'MISSING_WORDLIST' ? wl : a))
            this.log('info', `${step.tool} ${step.hint} (wordlist ${wl})`)
            if (this.stopped) break
            await this.runStep(step.tool, args)
            if (this.stopped) break
            await sleep(intervalMs)
            continue
          }
          this.log('warn', `${step.tool}: liste de mots non configurée, étape ignorée (${step.hint})`)
          continue
        }
        this.log('info', `${step.tool} ${step.hint}`)
        if (this.stopped) break
        const ok = await this.runStep(step.tool, step.args)
        if (!ok) {
          this.log('warn', `${step.tool}: binaire introuvable, étape ignorée`)
          missingTools.add(step.tool)
        } else {
          ranTools += 1
        }
        if (this.stopped) break
        await sleep(intervalMs)
      }

      if (this.stopped) {
        this.log('warn', 'Scan interrompu par l’utilisateur')
        repo.updateScan(this.scanId, { status: 'stopped', finishedAt: Date.now() })
      } else if (ranTools === 0 && missingTools.size > 0) {
        // Ne jamais annoncer « terminé » quand aucun binaire n'a pu être lancé :
        // l'utilisateur croirait avoir scanné alors que rien n'a tourné.
        this.log(
          'err',
          `Aucun outil n’a pu être lancé (${[...missingTools].join(', ')}). Installez-les depuis l’écran Outils, puis relancez le scan.`
        )
        repo.updateScan(this.scanId, { status: 'error', finishedAt: Date.now() })
      } else if (missingTools.size > 0) {
        this.log('warn', `Scan terminé, mais ${missingTools.size} outil(s) absent(s) : ${[...missingTools].join(', ')}`)
        repo.updateScan(this.scanId, { status: 'done', finishedAt: Date.now() })
      } else {
        this.log('ok', 'Scan terminé')
        repo.updateScan(this.scanId, { status: 'done', finishedAt: Date.now() })
      }
    } catch (err) {
      this.log('err', `Erreur du moteur: ${err instanceof Error ? err.message : String(err)}`)
      repo.updateScan(this.scanId, { status: 'error', finishedAt: Date.now() })
    } finally {
      runners.delete(this.scanId)
    }
  }

  private runStep(tool: string, args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      let child: ChildProcessWithoutNullStreams
      try {
        child = spawn(binary(tool), args, { windowsHide: true, shell: false })
      } catch {
        resolve(false)
        return
      }
      this.current = child
      let existed = false
      child.on('spawn', () => {
        existed = true
      })
      child.stderr.on('data', (d: Buffer) => {
        const line = d.toString().trim()
        if (line) this.log('info', line.slice(0, 2000))
      })
      child.stdout.on('data', (d: Buffer) => {
        const line = d.toString().trim()
        if (line) this.log('info', line.slice(0, 2000))
      })
      child.on('error', () => {
        this.current = null
        resolve(existed || false)
      })
      child.on('exit', (code, signal) => {
        this.current = null
        if (code !== null) this.log('info', `(${tool} exit ${code})`)
        else if (signal) this.log('warn', `(${tool} interrompu: ${signal})`)
        resolve(true)
      })
    })
  }
}

export async function startScan(scanId: number, plan: ScanPlan): Promise<void> {
  let runner = getRunner(scanId)
  if (!runner) runner = new ScanRunner(scanId)
  await runner.run(plan)
}