import { useEffect, useState } from 'react'
import type { CredentialRecord, ProgramSummary } from '../../../shared/ipc'
import { Api } from '../api'
import { Modal } from './Modal'

interface Props {
  program: ProgramSummary
  onClose: () => void
}

interface Draft {
  label: string
  username: string
  secret: string
  note: string
}

const empty: Draft = { label: '', username: '', secret: '', note: '' }

export function CredentialsModal({ program, onClose }: Props) {
  const [creds, setCreds] = useState<CredentialRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft>(empty)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  const load = async (): Promise<void> => {
    try {
      const r = await Api.credentials.list(program.id)
      if (r.ok) setCreds(r.credentials)
      else setError(r.error)
    } catch {
      setError('Impossible de charger les identifiants.')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program.id])

  const startEdit = (c: CredentialRecord): void => {
    setEditing(c.id)
    setDraft({ label: c.label, username: c.username, secret: '', note: c.note })
  }

  const save = async (): Promise<void> => {
    if (!draft.label.trim()) return
    setBusy(true)
    setError(null)
    try {
      if (editing === null) {
        const r = await Api.credentials.add({
          programId: program.id,
          label: draft.label.trim(),
          username: draft.username,
          secret: draft.secret,
          note: draft.note,
        })
        if (!r.ok) throw new Error(r.error)
      } else {
        const r = await Api.credentials.update(editing, {
          label: draft.label.trim(),
          username: draft.username,
          secret: draft.secret,
          note: draft.note,
        })
        if (!r.ok) throw new Error(r.error)
      }
      setEditing(null)
      setDraft(empty)
      await load()
    } catch {
      setError('Échec de l’enregistrement.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number): Promise<void> => {
    setError(null)
    const r = await Api.credentials.remove(id)
    if (!r.ok) setError(r.error)
    await load()
  }

  const copy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* silent */
    }
  }

  const toggleReveal = (id: number): void => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <Modal title={`Identifiants — ${program.name}`} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}

      <div className="creds-list">
        {creds.map((c) => (
          <div key={c.id} className="cred-row">
            <div className="cred-main">
              <span className="cred-label">{c.label}</span>
              {c.username && <code className="cred-user">{c.username}</code>}
              <code className="cred-secret">{revealed.has(c.id) || !c.secret ? '••••••••' : ''}</code>
              {revealed.has(c.id) && c.secret && <code className="cred-secret">{c.secret}</code>}
              {c.note && <span className="muted">{c.note}</span>}
            </div>
            <div className="cred-actions">
              {c.username && (
                <button className="icon-btn" title="Copier le login" onClick={() => void copy(c.username)}>
                  ⧉
                </button>
              )}
              {c.secret && (
                <button
                  className="icon-btn"
                  title={revealed.has(c.id) ? 'Masquer' : 'Afficher'}
                  onClick={() => toggleReveal(c.id)}
                >
                  👁
                </button>
              )}
              {c.secret && (
                <button className="icon-btn" title="Copier le secret" onClick={() => void copy(c.secret)}>
                  🔑
                </button>
              )}
              <button className="icon-btn" title="Modifier" onClick={() => startEdit(c)}>
                ✎
              </button>
              <button className="icon-btn danger" title="Supprimer" onClick={() => void remove(c.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
        {creds.length === 0 && (
          <p className="muted">Aucun identifiant enregistré pour ce programme. Ajoutez-en un ci-dessous.</p>
        )}
      </div>

      <div className="cred-form">
        <h4>{editing === null ? 'Ajouter un identifiant' : 'Modifier l’identifiant'}</h4>
        <div className="cred-form-grid">
          <input
            placeholder="Libellé (ex : compte test API)"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          <input
            placeholder="Login / email"
            value={draft.username}
            onChange={(e) => setDraft({ ...draft, username: e.target.value })}
          />
          <input
            type="password"
            placeholder={editing === null ? 'Mot de passe / clé' : 'Nouveau secret (laisser vide pour garder)'}
            value={draft.secret}
            onChange={(e) => setDraft({ ...draft, secret: e.target.value })}
          />
          <input
            placeholder="Note"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </div>
        <div className="modal-footer" style={{ padding: '12px 0 0' }}>
          {editing !== null && (
            <button
              className="btn"
              onClick={() => {
                setEditing(null)
                setDraft(empty)
              }}
            >
              Annuler
            </button>
          )}
          <button className="btn primary" onClick={() => void save()} disabled={busy || !draft.label.trim()}>
            Enregistrer
          </button>
        </div>
      </div>

      {program.webLink && (
        <button className="btn small" onClick={() => void Api.shell.openExternal(program.webLink!)}>
          Ouvrir la page login
        </button>
      )}
    </Modal>
  )
}