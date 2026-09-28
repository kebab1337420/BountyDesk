import { useEffect, useState } from 'react'
import { Api } from '../api'
import type { McpRequestRow, McpStatusInfo } from '../../../shared/ipc'

interface Props {
  onLogout: () => void
}

export function SettingsScreen({ onLogout }: Props) {
  const [mcp, setMcp] = useState<McpStatusInfo | null>(null)
  const [port, setPort] = useState('8787')
  const [lanLocal, setLanLocal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [requests, setRequests] = useState<McpRequestRow[]>([])

  const loadRequests = async () => {
    const res = await Api.mcp.requests(50)
    if (res.ok) setRequests(res.rows)
  }

  const refresh = async () => {
    const status = await Api.mcp.status()
    setMcp(status)
    setLanLocal(status.lan)
    if (status.port) setPort(String(status.port))
    await loadRequests()
  }

  useEffect(() => {
    void refresh()
  }, [])

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const setEnabled = (enabled: boolean, lan = lanLocal) =>
    run(async () => {
      if (enabled && lan && !window.confirm('Exposer le serveur MCP sur le réseau local (LAN) ?\n\nTous les appareils du réseau pourront se connecter avec un jeton valide. Chaque appareil a un jeton dédié.')) {
        return
      }
      const res = await Api.mcp.setEnabled(enabled, { lan })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMcp(res.status)
      setLanLocal(res.status.lan)
      setPort(String(res.status.port ?? port))
      await loadRequests()
    })

  const toggleLan = () => {
    if (!mcp) return
    void setEnabled(mcp.enabled, !lanLocal)
  }

  const applyPort = () => {
    if (!mcp?.enabled) return
    void run(async () => {
      const res = await Api.mcp.setEnabled(true, { port: Number(port) || null, lan: lanLocal })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMcp(res.status)
    })
  }

  const regenerate = () =>
    run(async () => {
      const res = await Api.mcp.regenerateToken()
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMcp(res.status)
    })

  const addToken = () =>
    run(async () => {
      const res = await Api.mcp.addToken(newLabel.trim())
      if (!res.ok) {
        setError(res.error)
        return
      }
      setNewLabel('')
      setMcp(res.status)
    })

  const revoke = (id: string, label: string) =>
    run(async () => {
      if (!mcp || mcp.tokens.length <= 1) {
        setError('Au moins un jeton doit rester actif.')
        return
      }
      if (!window.confirm(`Révoquer le jeton « ${label} » ? L'IA de ce poste ne pourra plus se connecter.`)) return
      const res = await Api.mcp.revokeToken(id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMcp(res.status)
    })

  const baseUrl = (host: string) => `http://${host}:${mcp?.port ?? '8787'}/mcp`

  const configSnippet = () => {
    const host = mcp?.lan && mcp.hosts.length > 0 ? mcp.hosts[0]! : '127.0.0.1'
    const token = mcp?.tokens[0]?.token ?? '<TOKEN>'
    return `{
  "bountydesk": {
    "type": "remote",
    "url": "${baseUrl(host)}",
    "headers": {
      "Authorization": "Bearer ${token}",
      "Content-Type": "application/json"
    }
  }
}`
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>Réglages</h2>
      </div>

      <div className="box">
        <h3>Assistant IA (protocole MCP)</h3>
        <p className="muted-text">
          Expose BountyDesk à des IA (Claude Desktop, opencode, Cursor…) via un serveur MCP. Chaque poste/IA a son jeton
          dédié. L'IA peut lister les programmes, lire le scope et les ROE, installer les outils et lancer des scans
          low/med/high (toujours filtrés in-scope + confirmation ROE). <strong>Jamais de soumission de rapport
          automatique.</strong>
        </p>

        {error && <div className="banner-error">{error}</div>}

        {mcp && (
          <div className="mcp-box">
            <div className="mcp-row">
              <label>
                <input type="checkbox" checked={mcp.enabled} onChange={() => void setEnabled(!mcp.enabled)} disabled={busy} />{' '}
                Activer le serveur MCP
              </label>
              <span className={mcp.enabled ? 'mcp-dot on' : 'mcp-dot'}>
                {mcp.running ? `Actif — port ${mcp.port ?? '?'}` : 'Arrêté'}
              </span>
            </div>

            {mcp.enabled && (
              <>
                <div className="mcp-row">
                  <label>
                    Port{' '}
                    <input
                      type="number"
                      min={1024}
                      max={65535}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      style={{ width: 90 }}
                    />
                    <button className="btn ghost small" disabled={busy} onClick={() => void applyPort()}>
                      Appliquer
                    </button>
                  </label>
                </div>

                <div className="mcp-row">
                  <label>Adresse du serveur MCP</label>
                  <div className="mcp-token">
                    <code>{baseUrl('127.0.0.1')}</code>
                    <button
                      className="btn ghost small"
                      onClick={() => void copy(baseUrl('127.0.0.1'), 'url-local')}
                    >
                      {copied === 'url-local' ? 'Copié ✓' : 'Copier l’URL'}
                    </button>
                  </div>
                </div>

                {lanLocal && mcp.hosts.length > 0 && (
                  <div className="mcp-row">
                    <label>Adresses LAN (autres PC)</label>
                    <div className="mcp-token">
                      {mcp.hosts.map((h) => (
                        <span key={h} className="mcp-chip">
                          <code>{baseUrl(h)}</code>
                          <button
                            className="btn ghost small"
                            onClick={() => void copy(baseUrl(h), `url-${h}`)}
                          >
                            {copied === `url-${h}` ? 'Copié ✓' : 'Copier'}
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mcp-row">
                  <label>
                    <input type="checkbox" checked={lanLocal} onChange={() => void toggleLan()} disabled={busy} />{' '}
                    Exposer sur le réseau local (LAN)
                  </label>
                  {lanLocal && mcp.hosts.length > 0 && (
                    <div className="mcp-token">
                      {mcp.hosts.map((h) => (
                        <button
                          key={h}
                          className="btn ghost small"
                          onClick={() => void copy(baseUrl(h), `url-${h}`)}
                        >
                          {h} · copier
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mcp-box">
                  <h4>Jetons (un par PC / IA)</h4>
                  <p className="muted-text">
                    Donnez un jeton au bouton « Copier » à chaque machine qui doit se connecter. Révoquez-le pour couper
                    l'accès immédiatement.
                  </p>
                  {mcp.tokens.map((t) => (
                    <div className="cred-row" key={t.id}>
                      <div className="cred-main">
                        <span className="cred-label">{t.label}</span>
                        <code className="mcp-token-value">{t.token}</code>
                      </div>
                      <div className="cred-actions">
                        <button className="icon-btn" title="Copier le jeton" onClick={() => void copy(t.token, `tok-${t.id}`)}>
                          {copied === `tok-${t.id}` ? '✓' : '⧉'}
                        </button>
                        <button className="icon-btn danger" title="Révoquer le jeton" onClick={() => void revoke(t.id, t.label)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {mcp.tokens[0] && (
                    <div className="mcp-row" style={{ marginTop: 8 }}>
                      <button className="btn ghost small" disabled={busy} onClick={() => void regenerate()}>
                        Régénérer le jeton principal
                      </button>
                    </div>
                  )}
                  <div className="mcp-row">
                    <input
                      type="text"
                      placeholder="Nom du poste / IA (ex : PC-bureau, Labo, Philéas)"
                      value={newLabel}
                      maxLength={60}
                      onChange={(e) => setNewLabel(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn primary small" disabled={busy || !newLabel.trim()} onClick={() => void addToken()}>
                      + Ajouter un jeton
                    </button>
                  </div>
                </div>

                <details className="mcp-config">
                  <summary>Configuration Claude Desktop / opencode</summary>
                  <p className="muted-text">
                    Clé à placer dans <code>claude_desktop_config.json</code> (propriété <code>mcpServers</code>) ou{' '}
                    <code>opencode.json</code> (propriété <code>mcp</code>).
                    {mcp.lan && mcp.hosts.length > 0 && <> Pour un autre PC, remplacez l'URL par <code>{baseUrl(mcp.hosts[0]!)}</code>.</>}
                  </p>
                  <div className="mcp-row">
                    <pre>{configSnippet()}</pre>
                    <button className="btn ghost small" onClick={() => void copy(configSnippet(), 'cfg')}>
                      {copied === 'cfg' ? 'Copié ✓' : 'Copier la config'}
                    </button>
                  </div>
                </details>

                <p className="muted-text">
                  Tools disponibles : <code>list_programs</code>, <code>get_program_detail</code>,{' '}
                  <code>list_credentials</code> (sans secrets), <code>list_tools</code>, <code>install_tool</code>,{' '}
                  <code>start_scan</code>, <code>get_scan</code>, <code>scan_events</code>.
                </p>

                <div className="mcp-box">
                  <h4>Activité des IA ({requests.length})</h4>
                  <p className="muted-text">
                    Derniers appels MCP reçus, peu importe le poste qui les a envoyés.
                  </p>
                  {requests.length === 0 ? (
                    <p className="muted-text">Aucun appel pour l'instant.</p>
                  ) : (
                    <table className="mcp-table">
                      <thead>
                        <tr>
                          <th>Heure</th>
                          <th>Poste</th>
                          <th>Outil</th>
                          <th>Statut</th>
                          <th>Durée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((r) => (
                          <tr key={r.id}>
                            <td>{new Date(r.ts).toLocaleTimeString('fr-FR')}</td>
                            <td>{r.tokenLabel || '—'}</td>
                            <td><code>{r.tool}</code></td>
                            <td className={r.status === 'ok' ? 'mcp-status-ok' : 'mcp-status-err'}>{r.status}</td>
                            <td>{r.ms} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <button className="btn ghost small" onClick={() => void loadRequests()} disabled={busy}>
                    Actualiser
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn danger" onClick={onLogout}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}