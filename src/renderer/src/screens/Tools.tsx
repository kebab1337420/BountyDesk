import { useEffect, useMemo, useState } from 'react'
import { Api } from '../api'
import type { ToolEntry } from '../../../shared/ipc'

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'recon', label: 'Reconnaissance' },
  { id: 'enumer', label: 'Énumération' },
  { id: 'fuzz', label: 'Fuzzing' },
  { id: 'network', label: 'Réseau' },
  { id: 'utility', label: 'Utilitaire' },
  { id: 'ai', label: 'IA & frameworks de chasse' }
]

interface InstallState {
  status: 'idle' | 'running' | 'ok' | 'error'
  output: string
  error: string
}

export function ToolsScreen() {
  const [tools, setTools] = useState<ToolEntry[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [installState, setInstallState] = useState<Record<string, InstallState>>({})
  const [installing, setInstalling] = useState<string | null>(null)

  const load = async () => {
    setError('')
    const res = await Api.tools.list()
    if (res.ok) {
      setTools(res.tools)
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.size === 0) {
          for (const t of res.tools) if (t.defaultChecked) next.add(t.id)
        }
        return next
      })
    } else {
      setError(res.error)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const pendingIds = useMemo(() => {
    if (!tools) return []
    return tools.filter((t) => selected.has(t.id) && !t.installed).map((t) => t.id)
  }, [tools, selected])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const installSelection = async () => {
    if (pendingIds.length === 0) return
    setInstalling(pendingIds[0] ?? null)
    for (const id of pendingIds) {
      setInstalling(id)
      setInstallState((prev) => ({ ...prev, [id]: { status: 'running', output: '', error: '' } }))
      const res = await Api.tools.install(id)
      setInstallState((prev) => ({
        ...prev,
        [id]:
          res.ok && res.installed
            ? { status: 'ok', output: res.output, error: '' }
            : { status: 'error', output: res.output, error: res.ok ? 'Installed ratio' : res.error }
      }))
      if (res.ok && res.installed) {
        await load()
      }
    }
    setInstalling(null)
  }

  const byCategory = useMemo(() => {
    const map = new Map<string, ToolEntry[]>()
    if (!tools) return map
    for (const cat of CATEGORIES) map.set(cat.id, [])
    for (const t of tools) {
      const list = map.get(t.category)
      if (list) list.push(t)
    }
    return map
  }, [tools])

  return (
    <div className="section">
      <div className="section-header">
        <h2>Outils ⚒</h2>
        <div className="toolbar-actions">
          <button className="btn ghost small" onClick={() => void load()} disabled={installing !== null}>
            Actualiser
          </button>
          <button
            className="btn primary"
            disabled={installing !== null || pendingIds.length === 0}
            onClick={() => void installSelection()}
          >
            {installing ? `Installation de ${installing}…` : `Installer la sélection (${pendingIds.length})`}
          </button>
        </div>
      </div>
      <p className="muted">
        Outils installés via winget ou téléchargés en portable depuis les releases GitHub officielles. Cochez puis
        installez — chaque outil est vérifié (présence du binaire) avant d’être marqué installé.
      </p>
      {error && <div className="banner-error">{error}</div>}

      {!tools ? (
        <div className="box">
          <p className="muted">Vérification des outils installés…</p>
        </div>
      ) : (
        byCategory.size > 0 &&
        CATEGORIES.filter((cat) => (byCategory.get(cat.id)?.length ?? 0) > 0).map((cat) => {
          const items = byCategory.get(cat.id) ?? []
          return (
            <div className="box" key={cat.id}>
              <h4 className="tools-cat">{cat.label}</h4>
              {items.map((tool) => {
                const st = installState[tool.id]
                const running = installing === tool.id
                return (
                  <div className="tool-row" key={tool.id}>
                    <label className="tool-main">
                      <input type="checkbox" checked={selected.has(tool.id)} onChange={() => toggle(tool.id)} />
                      <span className="tool-name">{tool.name}</span>
                      <span className="badge">{tool.source === 'winget' ? 'winget' : tool.source === 'git' ? 'framework' : 'portable'}</span>
                      {tool.docs && (
                        <button
                          className="btn ghost small"
                          onClick={() => {
                            void Api.shell.openExternal(tool.docs!)
                          }}
                        >
                          Guide
                        </button>
                      )}
                    </label>
                    <span className="tool-desc">{tool.description}</span>
                    <span className="tool-status">
                      {tool.installed ? (
                        <span className="ok">✓ installé</span>
                      ) : running ? (
                        <span className="running">… en cours</span>
                      ) : st?.status === 'error' ? (
                        <span className="err">✕ {st.error}</span>
                      ) : (
                        <span className="muted">non installé</span>
                      )}
                    </span>
                    {st && st.output && (
                      <details className="tool-output">
                        <summary>Sortie</summary>
                        <pre>{st.output.trim() || '(none)'}</pre>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}