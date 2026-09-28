import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabase, type Db } from '../src/main/db/db'
import { createRepository, type Repository, type ProgramInput } from '../src/main/db/repo'

function sample(overrides: Partial<ProgramInput> = {}): ProgramInput {
  return {
    id: 'prog-1',
    handle: 'acme',
    name: 'Acme Corp',
    type: 'public',
    status: 'active',
    confidentiality: 'public',
    minBounty: null,
    maxBounty: { value: 5000, currency: 'EUR' },
    industry: 'Software',
    webLink: 'https://acme.example',
    following: false,
    rawJson: null,
    ...overrides,
  }
}

let db: Db
let repo: Repository

beforeEach(() => {
  db = openDatabase(':memory:')
  repo = createRepository(db)
})

describe('Repository', () => {
  it('upsert un programme puis le reliste tel quel', () => {
    repo.upsertProgram(sample())
    const { records, total } = repo.listPrograms()
    expect(total).toBe(1)
    expect(records[0]).toMatchObject({
      id: 'prog-1',
      handle: 'acme',
      name: 'Acme Corp',
      maxBounty: { value: 5000, currency: 'EUR' },
      favorite: false,
      note: '',
      tags: [],
      groups: [],
    })
  })

  it('un second upsert du même id est idempotent (pas de doublon)', () => {
    repo.upsertProgram(sample())
    repo.upsertProgram(sample({ name: 'Acme Corp v2' }))
    expect(repo.countPrograms()).toBe(1)
    expect(repo.listPrograms().records[0]!.name).toBe('Acme Corp v2')
  })

  it('mini-avarice: minBounty null quand valeur absente', () => {
    repo.upsertProgram(sample({ minBounty: { value: 1000, currency: 'USD' } }))
    const rec = repo.listPrograms().records[0]!
    expect(rec.minBounty).toEqual({ value: 1000, currency: 'USD' })
  })

  it('étoile un programme et filtre favoris', () => {
    repo.upsertProgram(sample())
    repo.setFavorite('prog-1', true)
    expect(repo.listPrograms({ favoriteOnly: true }).total).toBe(1)
    expect(repo.getProgram('prog-1')?.favorite).toBe(true)
    repo.setFavorite('prog-1', false)
    expect(repo.listPrograms({ favoriteOnly: true }).total).toBe(0)
  })

  it('persiste une note indépendamment de l’étoile', () => {
    repo.upsertProgram(sample())
    repo.setNote('prog-1', 'scope: *.acme.example')
    const rec = repo.getProgram('prog-1')
    expect(rec?.note).toBe('scope: *.acme.example')
    expect(rec?.favorite).toBe(false)
  })

  it('gère les groupes: création, renommage, membres, suppression en cascade', () => {
    repo.upsertProgram(sample())
    const { id } = repo.createGroup('Mobile', '#f00')
    repo.addToGroup(id, 'prog-1')
    let groups = repo.listGroups()
    expect(groups).toEqual([{ id, name: 'Mobile', color: '#f00', memberCount: 1 }])

    const { records } = repo.listPrograms({ groupId: id })
    expect(records.map((r) => r.id)).toEqual(['prog-1'])
    expect(records[0]!.groups).toEqual(['Mobile'])

    repo.renameGroup(id, 'Apps mobiles')
    expect(repo.listGroups()[0]!.name).toBe('Apps mobiles')

    repo.removeFromGroup(id, 'prog-1')
    expect(repo.listGroups()[0]!.memberCount).toBe(0)
    expect(repo.listPrograms({ groupId: id }).total).toBe(0)

    repo.addToGroup(id, 'prog-1')
    repo.removeGroup(id)
    expect(repo.listGroups()).toHaveLength(0)
    expect(repo.listPrograms().records[0]!.groups).toEqual([])
  })

  it('refuse un groupe en doublon (nom unique)', () => {
    repo.createGroup('Mobile')
    expect(() => repo.createGroup('Mobile')).toThrow()
  })

  it('gère les tags: attachement, détachement, comptage, suppression', () => {
    repo.upsertProgram(sample())
    repo.upsertProgram(sample({ id: 'prog-2', handle: 'beta', name: 'Beta Inc' }))
    const t1 = repo.createTag('nofollow')
    const t2 = repo.createTag('api')
    repo.addTagToProgram('prog-1', t1.id)
    repo.addTagToProgram('prog-1', t2.id)
    repo.addTagToProgram('prog-2', t1.id)

    let tags = repo.listTags()
    expect(tags).toEqual([
      { id: t2.id, name: 'api', count: 1 },
      { id: t1.id, name: 'nofollow', count: 2 },
    ])

    expect(repo.getProgram('prog-1')?.tags.sort()).toEqual(['api', 'nofollow'])
    expect(repo.listPrograms({ tagId: t1.id }).total).toBe(2)

    repo.removeTagFromProgram('prog-1', t1.id)
    expect(repo.listTags().find((t) => t.id === t1.id)?.count).toBe(1)

    repo.removeTag(t1.id)
    expect(repo.listTags()).toHaveLength(1)
    expect(repo.getProgram('prog-1')?.tags).toEqual(['api'])
  })

  it('recherche par nom, handle ou industrie (insensible à la casse)', () => {
    repo.upsertProgram(sample())
    repo.upsertProgram(sample({ id: 'prog-2', handle: 'beta', name: 'Beta Inc', industry: 'Logistics' }))
    expect(repo.listPrograms({ search: 'acme' }).total).toBe(1)
    expect(repo.listPrograms({ search: 'LOGISTICS' }).total).toBe(1)
    expect(repo.listPrograms({ search: 'inexistant' }).total).toBe(0)
  })

  it('trie par nom (asc/desc) et par prime max', () => {
    repo.upsertProgram(sample()) // Acme, 5000
    repo.upsertProgram(sample({ id: 'prog-2', handle: 'beta', name: 'Beta', maxBounty: null }))
    repo.upsertProgram(sample({ id: 'prog-3', handle: 'zeta', name: 'Zeta', maxBounty: { value: 10000, currency: 'EUR' } }))

    let names = repo.listPrograms({ sort: 'name', dir: 'asc' }).records.map((r) => r.name)
    expect(names).toEqual(['Acme Corp', 'Beta', 'Zeta'])
    names = repo.listPrograms({ sort: 'name', dir: 'desc' }).records.map((r) => r.name)
    expect(names).toEqual(['Zeta', 'Beta', 'Acme Corp'])

    const bounty = repo.listPrograms({ sort: 'bounty', dir: 'desc' }).records.map((r) => r.name)
    expect(bounty).toEqual(['Zeta', 'Acme Corp', 'Beta'])
  })

  it('pagine avec offset/limit et renvoie le total global', () => {
    for (let i = 1; i <= 5; i += 1) {
      repo.upsertProgram(sample({ id: `prog-${i}`, handle: `h${i}`, name: `Prog ${i}` }))
    }
    const page = repo.listPrograms({ limit: 2, offset: 2, sort: 'name', dir: 'asc' })
    expect(page.total).toBe(5)
    expect(page.records.map((r) => r.name)).toEqual(['Prog 3', 'Prog 4'])
  })

  it('maintient les métadonnées locales après une resync (upsert n’écrase pas favoris/notes)', () => {
    repo.upsertProgram(sample())
    repo.setFavorite('prog-1', true)
    repo.setNote('prog-1', 'note locale')
    repo.setNote('prog-1', 'note locale')
    repo.upsertProgram(sample({ name: 'Acme v2' }))
    const rec = repo.getProgram('prog-1')
    expect(rec?.name).toBe('Acme v2')
    expect(rec?.favorite).toBe(true)
    expect(rec?.note).toBe('note locale')
  })
})