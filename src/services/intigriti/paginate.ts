export interface PageLike<T> {
  maxCount: number
  records: T[]
}

export interface PaginateOptions {
  limit?: number
  maxRecords?: number
}

function identity<T>(item: T): string {
  const id = (item as { id?: unknown }).id
  return typeof id === 'string' ? id : JSON.stringify(item)
}

export async function paginate<T>(
  fetchPage: (offset: number) => Promise<PageLike<T>>,
  options: PaginateOptions = {}
): Promise<T[]> {
  const limit = options.limit ?? 100
  const maxRecords = options.maxRecords ?? 100_000
  const seen = new Set<string>()
  const records: T[] = []
  let offset = 0
  const maxPages = Math.ceil(maxRecords / Math.max(1, limit)) + 1

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(offset)
    if (!Array.isArray(result.records)) {
      break
    }
    for (const item of result.records) {
      const key = identity<T>(item)
      if (!seen.has(key)) {
        seen.add(key)
        records.push(item)
      }
    }
    offset += result.records.length
    if (result.records.length === 0 || offset >= result.maxCount || records.length >= maxRecords) {
      break
    }
  }
  return records
}