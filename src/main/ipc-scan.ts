import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC, type ScanDepth } from '../shared/ipc'
import { getRepository } from './db'
import { getClient } from './app-state'
import { fetchProgramDetail, getCachedProgramDetail } from './services/program-detail'
import { buildPlan, selectTargets, SCAN_DEPTHS } from './services/scan/plan'
import { requestStop, startScan } from './services/scan/runner'

const programIdSchema = z.string().min(1).max(200)
const scanIdSchema = z.number().int().positive()

const DEFAULT_RATE: Record<ScanDepth, number> = { low: 1, med: 5, high: 10 }

const dbResultError = (err: unknown): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof Error ? err.message : String(err),
})

export function registerScanIpc(): void {
  ipcMain.handle(IPC.ScanStart, async (_event, raw) => {
    const { programId, depth, roeConfirm, rateLimit } = z
      .object({
        programId: programIdSchema,
        depth: z.enum(SCAN_DEPTHS),
        roeConfirm: z.boolean(),
        rateLimit: z.number().int().min(1).max(50).optional(),
      })
      .parse(raw)

    if (!roeConfirm) return { ok: false, error: 'La confirmation des règles d’engagement est requise' } as const

    const repo = getRepository()
    const client = getClient()
    try {
      let detail
      if (client.getToken()) {
        detail = await fetchProgramDetail(client, programId)
      } else {
        detail = getCachedProgramDetail(programId)
      }
      if (!detail) return { ok: false, error: 'Détail du programme indisponible' } as const

      const targets = selectTargets(detail.scope)
      if (targets.length === 0) return { ok: false, error: 'Aucune cible in-scope exploitable (http(s))' } as const

      const rate = rateLimit ?? DEFAULT_RATE[depth]
      const scanId = repo.createScan({ programId, depth, rateLimit: rate, roeConfirm })
      const plan = buildPlan(depth, targets, rate)

      void startScan(scanId, plan)
      return { ok: true, scanId } as const
    } catch (err) {
      return dbResultError(err)
    }
  })

  ipcMain.handle(IPC.ScanList, (_event, rawId) => {
    const programId = programIdSchema.parse(rawId)
    try {
      const scans = getRepository()
        .listScans(programId)
        .map((s) => ({
          id: s.id,
          programId: s.program_id,
          depth: s.depth as ScanDepth,
          status: s.status,
          rateLimit: s.rate_limit,
          roeConfirm: s.roe_confirm === 1,
          startedAt: s.started_at,
          finishedAt: s.finished_at,
        }))
      return { ok: true, scans } as const
    } catch (err) {
      return dbResultError(err)
    }
  })

  ipcMain.handle(IPC.ScanEvents, (_event, raw) => {
    const { scanId, afterSeq } = z
      .object({ scanId: scanIdSchema, afterSeq: z.number().int().min(0).max(1_000_000) })
      .parse(raw)
    try {
      const repo = getRepository()
      const scan = repo.getScan(scanId)
      if (!scan) return { ok: false, error: `Scan introuvable (id=${scanId})` } as const
      const events = repo
        .listScanEvents(scanId, afterSeq)
        .map((r) => ({ seq: r.seq, ts: r.ts, level: r.level, message: r.message }))
      return { ok: true, events, done: scan.status !== 'running' } as const
    } catch (err) {
      return dbResultError(err)
    }
  })

  ipcMain.handle(IPC.ScanStop, (_event, rawId) => {
    const scanId = scanIdSchema.parse(rawId)
    try {
      const stopped = requestStop(scanId)
      return { ok: true, stopped } as const
    } catch (err) {
      return dbResultError(err)
    }
  })
}