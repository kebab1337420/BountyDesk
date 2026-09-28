import { useCallback, useEffect, useRef, useState } from 'react'
import type { GroupInfo, ProgramSummary, TagInfo } from '../../../shared/ipc'
import { Api } from '../api'
import { Modal } from '../components/Modal'
import { ProgramDetailModal } from '../components/ProgramDetailModal'

const PAGE_SIZE = 200

const STATUS_BUG = /bug/i

function formatBounty(p: ProgramSummary): string {
  const b = p.maxBounty
  if (!b) return '—'
  return `${b.value.toLocaleString('fr-FR')} ${b.currency}`
}

export function ProgramsScreen() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [total, setTotal] = useState(0)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [tags, setTags] = useState<TagInfo[]>([])
  const [sort, setSort] = useState<'name' | 'bounty' | 'recent'>('name')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [activeGroup, setActiveGroup] = useState<number | null>(null)
  const [activeTag, setActiveTag] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteTarget, setNoteTarget] = useState<ProgramSummary | null>(null)
  const [detailTarget, setDetailTarget] = useState<ProgramSummary | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    let p: Awaited<ReturnType<typeof Api.programs.list>>
    try {
      p = await Api.programs.list({
        sort,
        dir,
        favoriteOnly: favoriteOnly || undefined,
        groupId: activeGroup ?? undefined,
        tagId: activeTag ?? undefined,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: 0,
      })
    } catch {
      setError('Impossible de charger les programmes.')
      return
    }
    setPrograms(p.records)
    setTotal(p.total)
    const [g, t] = await Promise.all([Api.groups.list(), Api.tags.list()])
    setGroups(g)
    setTags(t)
  }, [sort, dir, favoriteOnly, activeGroup, activeTag, search])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      void refresh()
    }, 250)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [refresh])

  useEffect(() => {
    setLoading(true)
    void refresh().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runMutation = async (fn: () => Promise<unknown>): Promise<void> => {
    setError(null)
    try {
      await fn()
      await refresh()
    } catch {
      setError('Une opération a échoué.')
    }
  }

  const handleSync = async (): Promise<void> => {
    setSyncing(true)
    setError(null)
    try {
      const result = await Api.programs.sync()
      if (!result.ok) setError(result.error)
      await refresh()
    } catch {
      setError('La synchronisation a échoué (réseau ?).')
    } finally {
      setSyncing(false)
    }
  }

  const openNote = (p: ProgramSummary): void => {
    setNoteDraft(p.note)
    setNoteTarget(p)
  }

  const saveNote = (): void => {
    if (!noteTarget) return
    const target = noteTarget
    setNoteTarget(null)
    void runMutation(() => Api.notes.set(target.id, noteDraft))
  }

  const createGroup = (): void => {
    const name = newGroupName.trim()
    if (!name) return
    setNewGroupName('')
    void runMutation(async () => {
      const r = await Api.groups.create(name)
      if (!r.ok) throw new Error(r.error)
    })
  }

  const renameGroup = (id: number): void => {
    const name = editingGroupName.trim()
    if (!name) return
    setEditingGroupId(null)
    void runMutation(() => Api.groups.rename(id, name))
  }

  const removeGroup = (id: number): void => {
    if (!window.confirm('Supprimer ce groupe (sans toucher aux programmes) ?')) return
    void runMutation(async () => {
      const r = await Api.groups.remove(id)
      if (!r.ok) throw new Error(r.error)
      if (activeGroup === id) setActiveGroup(null)
    })
  }

  const createTag = (): void => {
    const name = newTagName.trim()
    if (!name) return
    setNewTagName('')
    void runMutation(async () => {
      const r = await Api.tags.create(name)
      if (!r.ok) throw new Error(r.error)
    })
  }

  const removeTag = (id: number): void => {
    void runMutation(async () => {
      const r = await Api.tags.remove(id)
      if (!r.ok) throw new Error(r.error)
      if (activeTag === id) setActiveTag(null)
    })
  }

  const addToGroup = (p: ProgramSummary, groupId: number): void => {
    void runMutation(() => Api.groups.addMember(groupId, p.id))
  }

  const addTagToProgram = (p: ProgramSummary, tagId: number): void => {
    void runMutation(() => Api.tags.addToProgram(p.id, tagId))
  }

  return (
    <div className="section">
      {error && (
        <div className="banner-error">
          {error}
          <button className="modal-close" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      <div className="programs-layout">
        <aside className="filter-pane">
          <div>
            <h3>Groupes</h3>
            <ul>
              <li>
                <button className={`side-item ${activeGroup === null ? 'active' : ''}`} onClick={() => setActiveGroup(null)}>
                  Tous les programmes
                </button>
              </li>
              {groups.map((g) => (
                <li key={g.id}>
                  {editingGroupId === g.id ? (
                    <div className="side-edit">
                      <input
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameGroup(g.id)
                          if (e.key === 'Escape') setEditingGroupId(null)
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="side-row">
                      <button
                        className={`side-item ${activeGroup === g.id ? 'active' : ''}`}
                        title={g.name}
                        onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
                      >
                        <span className="side-label">{g.name}</span>
                        <span className="count">{g.memberCount}</span>
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Renommer"
                        onClick={() => {
                          setEditingGroupId(g.id)
                          setEditingGroupName(g.name)
                        }}
                      >
                        ✎
                      </button>
                      <button className="icon-btn danger" aria-label="Supprimer" onClick={() => removeGroup(g.id)}>
                        ✕
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="side-create">
              <input
                placeholder="Nouveau groupe…"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createGroup()
                }}
              />
            </div>
          </div>

          <div>
            <h3>Tags</h3>
            <ul>
              {tags.map((t) => (
                <li key={t.id}>
                  <div className="side-row">
                    <button
                      className={`side-item ${activeTag === t.id ? 'active' : ''}`}
                      title={t.name}
                      onClick={() => setActiveTag(activeTag === t.id ? null : t.id)}
                    >
                      <span className="side-label">#{t.name}</span>
                      <span className="count">{t.count}</span>
                    </button>
                    <button className="icon-btn danger" aria-label="Supprimer" onClick={() => removeTag(t.id)}>
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="side-create">
              <input
                placeholder="Nouveau tag… (#)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createTag()
                }}
              />
            </div>
          </div>
        </aside>

        <div className="programs-content">
          <div className="toolbar">
            <input
              className="search"
              placeholder="Rechercher par nom, handle ou industrie…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="filter-chip-group">
              <button className={`chip ${favoriteOnly ? 'active' : ''}`} onClick={() => setFavoriteOnly(!favoriteOnly)}>
                ★ Favoris
              </button>
              <select
                aria-label="Trier"
                value={sort}
                onChange={(e) => setSort(e.target.value as 'name' | 'bounty' | 'recent')}
              >
                <option value="name">Nom</option>
                <option value="bounty">Prime max</option>
                <option value="recent">Récemment mis à jour</option>
              </select>
              <select aria-label="Sens" value={dir} onChange={(e) => setDir(e.target.value as 'asc' | 'desc')}>
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
            <div className="toolbar-actions">
              {total > 0 && (
                <span className="muted">
                  {total} programme{total > 1 ? 's' : ''}
                </span>
              )}
              <button className="btn primary" onClick={() => void handleSync()} disabled={syncing}>
                {syncing ? 'Synchronisation…' : 'Synchroniser'}
              </button>
            </div>
          </div>

          {loading && <p className="muted">Chargement…</p>}

          {!loading && programs.length === 0 && (
            <p className="muted">
              {total === 0
                ? 'Aucun programme. Cliquez sur « Synchroniser » pour importer le catalogue Intigriti.'
                : 'Aucun résultat avec les filtres actuels.'}
            </p>
          )}

          <ul className="program-list">
            {programs.map((p) => (
              <li key={p.id} className="program-row">
                <button
                  className={`star ${p.favorite ? 'on' : ''}`}
                  aria-label={p.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  onClick={() => void runMutation(() => Api.favorites.set(p.id, !p.favorite))}
                >
                  ★
                </button>
                <div className="program-main" onClick={() => setDetailTarget(p)}>
                  <div className="program-title">
                    <span className="program-name">{p.name}</span>
                    <span className="handle">{p.handle}</span>
                  </div>
                  <div className="program-meta">
                    <span className={`badge ${STATUS_BUG.test(p.status ?? '') ? 'status-bug' : ''}`}>
                      {p.status ?? '—'}
                    </span>
                    <span className="badge">{p.type ?? '—'}</span>
                    {p.industry && <span className="muted">{p.industry}</span>}
                  </div>
                  <div className="program-assoc">
                    {p.tags.map((t) => (
                      <button
                        key={t}
                        className="tag"
                        onClick={() => {
                          const tag = tags.find((tg) => tg.name === t)
                          if (tag) void runMutation(() => Api.tags.removeFromProgram(p.id, tag.id))
                        }}
                        title="Retirer le tag"
                      >
                        #{t} ✕
                      </button>
                    ))}
                    {p.groups.map((g) => (
                      <span key={g} className="group-tag">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="program-actions">
                  <button className="btn small" title="Détails de la mission" onClick={() => setDetailTarget(p)}>
                    Détails
                  </button>
                  <span className={`bounty ${p.maxBounty ? '' : 'none'}`} title="Prime max">
                    {formatBounty(p)}
                  </span>
                  <select
                    aria-label="Ajouter à un groupe"
                    value=""
                    onChange={(e) => {
                      const gid = Number(e.target.value)
                      if (gid) addToGroup(p, gid)
                    }}
                  >
                    <option value="">+ groupe</option>
                    {groups
                      .filter((g) => !p.groups.includes(g.name))
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                  <select
                    aria-label="Ajouter un tag"
                    value=""
                    onChange={(e) => {
                      const tid = Number(e.target.value)
                      if (tid) addTagToProgram(p, tid)
                    }}
                  >
                    <option value="">+ tag</option>
                    {tags
                      .filter((t) => !p.tags.includes(t.name))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.name}
                        </option>
                      ))}
                  </select>
                  <button className="icon-btn" aria-label="Note" onClick={() => openNote(p)}>
                    📝
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {detailTarget && (
        <ProgramDetailModal program={detailTarget} onClose={() => setDetailTarget(null)} />
      )}

      {noteTarget && (
        <Modal title={`Note — ${noteTarget.name}`} onClose={() => setNoteTarget(null)}>
          <textarea
            className="note-editor"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Scope, points d’attention, deadlines…"
            rows={8}
          />
          <div className="modal-footer">
            <button className="primary" onClick={saveNote}>
              Enregistrer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}