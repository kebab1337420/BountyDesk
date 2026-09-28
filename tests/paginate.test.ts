import { describe, expect, it, vi } from 'vitest'
import { paginate } from '../src/services/intigriti/paginate'

interface Rec {
  id: string
  value: number
}

describe('paginate', () => {
  it('parcourt toutes les pages jusqu’à maxCount', async () => {
    const offsets: number[] = []
    const pages: Rec[][] = [
      [{ id: '1', value: 1 }, { id: '2', value: 2 }],
      [{ id: '3', value: 3 }, { id: '4', value: 4 }],
      [{ id: '5', value: 5 }]
    ]
    const fetchPage = vi.fn(async (offset: number) => {
      offsets.push(offset)
      const index = offset / 2
      const records = pages[index] ?? []
      return { maxCount: 5, records }
    })
    const result = await paginate<Rec>(fetchPage, { limit: 2 })
    expect(offsets).toEqual([0, 2, 4])
    expect(result).toHaveLength(5)
    expect(result.map((r) => r.id)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('s’arrête quand une page est vide même si maxCount n’est pas atteint', async () => {
    const fetchPage = vi.fn(async (offset: number) => {
      if (offset === 0) {
        return { maxCount: 100, records: [{ id: 'x', value: 1 }] }
      }
      return { maxCount: 100, records: [] }
    })
    const result = await paginate<Rec>(fetchPage, { limit: 2 })
    expect(result).toHaveLength(1)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('déduplique par id', async () => {
    const fetchPage = vi.fn(async () => ({
      maxCount: 3,
      records: [{ id: 'dup', value: 1 }, { id: 'dup', value: 1 }, { id: 'other', value: 2 }]
    }))
    const result = await paginate<Rec>(fetchPage, { limit: 3 })
    expect(result).toHaveLength(2)
  })

  it('borne le nombre total de records', async () => {
    let n = 0
    const fetchPage = vi.fn(async () => {
      n += 1
      return { maxCount: 5000, records: [{ id: `a${n}`, value: n }] }
    })
    const result = await paginate<Rec>(fetchPage, { limit: 1, maxRecords: 3 })
    expect(result).toHaveLength(3)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })
})