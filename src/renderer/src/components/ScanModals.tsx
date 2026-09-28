import { useEffect, useRef, useState } from 'react'
import type { ProgramDetailData, ProgramSummary, ScanDepth, ScanEvent, ScanRecord } from '../../../shared/ipc'
import { Api } from '../api'
import { Modal } from './Modal'

interface SetupProps {
  program: ProgramSummary
  detail: ProgramDetailData
  onClose: () => void
  onStarted: (scanId: number) => void
  onViewLog: (scanId: number) => void
}

const DEPTH_META: { depth: ScanDepth; label: string; desc: string }[] = [
  { depth: 'low', label: 'Bas', desc: 'En-têtes HTTP + scan de vulns. faibles' },
  { depth: 'med', label: 'Moyen', desc: '+ scan medium/high + technologies exposées' },
  { depth: 'high', label: 'Élevé', desc: '+ fuzzing de chemins (si liste de mots configurée)' },
]

export function ScanSetupModal({ program, detail, onClose, onStarted, onViewLog }: SetupProps) {
  const [depth, setDepth] = useState<ScanDepth>('low')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ScanRecord[]>([])

  useEffect(() => {
    void Api.scans.list(program.id).then((r) => {
      if (r.ok) setHistory(r.scans)
    })
  }, [program.id])

  const targets = detail.scope.filter((d) => d.inScope && /^https?:\/\//i.test(d.endpoint))

  const launch = async (): Promise<void> => {
    if (!confirm) return
    setBusy(true)
    setError(null)
    const r = await Api.scans.start(program.id, { depth, roeConfirm: true })
    setBusy(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    onStarted(r.scanId)
  }

  return (
    <Modal title={`Scan — ${program.name}`} onClose={onClose} wide>
      {error && <div className="banner-error">{error}</div>}

      <section>
        <h4>Règles d’engagement</h4>
        {detail.roe ? (
          <>
            <p className="detail-desc">{detail.roe.description || 'Aucune description fournie.'}</p>
            <div className="roe-flags">
              <span className={`roe-flag ${detail.roe.intigritiMe ? 'yes' : 'no'}`}>
                IntigritiMe {detail.roe.intigritiMe ? '✓' : '✕'}
              </span>
              <span className="roe-flag">Outils auto : {detail.roe.automatedTooling ?? 'non précisé'}</span>
              {detail.roe.userAgent && (
                <span className="roe-flag">
                  UA : <code>{detail.roe.userAgent}</code>
                </span>
              )}
              {detail.roe.requestHeader && (
                <span className="roe-flag">
                  Header : <code>{detail.roe.requestHeader}</code>
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="muted">Aucune règle d’engagement disponible pour ce programme.</p>
        )}
      </section>

      <section>
        <h4>Cibles in-scope ({targets.length})</h4>
        <div className="scope-list" style={{ maxHeight: 160 }}>
          {targets.map((d) => (
            <div key={d.id} className="scope-row in">
              <code className="scope-endpoint">{d.endpoint}</code>
            </div>
          ))}
          {targets.length === 0 && <p className="muted">Aucune cible web in-scope. Scan impossible.</p>}
        </div>
      </section>

      <section>
        <h4>Profondeur du scan</h4>
        <div className="depth-grid">
          {DEPTH_META.map((m) => (
            <button key={m.depth} className={`depth-card ${depth === m.depth ? 'active' : ''}`} onClick={() => setDepth(m.depth)}>
              <span className="depth-name">{m.label}</span>
              <span className="muted">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <h4>Historique des scans</h4>
          <div className="scan-history">
            {history.slice(0, 10).map((s) => (
              <button key={s.id} className="scan-h-item" onClick={() => onViewLog(s.id)}>
                <span className={`scan-status ${s.status}`}>{s.status}</span> #{s.id} · {s.depth} ·{' '}
                {new Date(s.startedAt).toLocaleString('fr-FR')}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="scan-confirm">
        <label className="check">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          J’ai lu le programme, ses règles d’engagement et je suis autorisé(e) à tester ces cibles.
        </label>
      </div>

      <div className="modal-footer" style={{ padding: '12px 0 0' }}>
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button className="btn primary" onClick={() => void launch()} disabled={busy || !confirm || targets.length === 0}>
          {busy ? 'Lancement…' : `Lancer le scan (${depth})`}
        </button>
      </div>
    </Modal>
  )
}

interface ProgressProps {
  program: ProgramSummary
  scanId: number
  onClose: () => void
}

const POLL_MS = 900

export function ScanProgressModal({ program, scanId, onClose }: ProgressProps) {
  const [events, setEvents] = useState<ScanEvent[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastSeq = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const box = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    const poll = async (): Promise<void> => {
      if (!alive) return
      try {
        const r = await Api.scans.events(scanId, lastSeq.current)
        if (!r.ok) {
          setError(r.error)
          if (timer.current) clearInterval(timer.current)
          return
        }
        if (r.events.length > 0) {
          lastSeq.current = r.events.at(-1)!.seq
          setEvents((prev) => [...prev, ...r.events])
        }
        if (r.done) {
          setDone(true)
          if (timer.current) clearInterval(timer.current)
        }
      } catch {
        /* transitoire */
      }
    }
    void poll()
    timer.current = setInterval(() => void poll(), POLL_MS)
    return () => {
      alive = false
      if (timer.current) clearInterval(timer.current)
    }
  }, [scanId])

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [events])

  const stop = async (): Promise<void> => {
    await Api.scans.stop(scanId)
  }

  return (
    <Modal title={`Scan en cours — ${program.name}`} onClose={onClose} wide>
      {error && <div className="banner-error">{error}</div>}
      <div className="scan-log" ref={box}>
        {events.map((e) => (
          <div key={e.seq} className={`scan-line ${e.level}`}>
            <span className="scan-ts">{new Date(e.ts).toLocaleTimeString('fr-FR')}</span>
            <span className="scan-msg">{e.message}</span>
          </div>
        ))}
        {events.length === 0 && !done && <p className="muted">Aucune activité pour l’instant…</p>}
        {done && <p className="scan-line ok">• scan terminé</p>}
      </div>
      <div className="modal-footer" style={{ padding: '12px 0 0' }}>
        {!done && (
          <button className="btn danger" onClick={() => void stop()}>
            ■ Arrêter
          </button>
        )}
        <button className="btn primary" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Modal>
  )
}