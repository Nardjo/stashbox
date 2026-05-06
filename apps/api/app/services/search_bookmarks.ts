import db from '@adonisjs/lucid/services/db'
import type { BookmarkType } from '@stashbox/shared'

export interface SearchBookmarksInput {
  queryEmbedding: number[]
  limit: number
  minScore: number
  type?: BookmarkType
  tags?: string[]
}

export interface SearchHit {
  id: string
  url: string
  title: string
  description: string
  tags: string[]
  type: BookmarkType
  score: number
  enrichmentStatus: string
  savedAt: string
}

export async function searchBookmarks(input: SearchBookmarksInput): Promise<SearchHit[]> {
  const { queryEmbedding, limit, minScore, type, tags } = input
  const literal = `[${queryEmbedding.join(',')}]`

  const params: unknown[] = [literal]
  const wheres: string[] = [`enrichment_status IN ('done', 'degraded')`, `embedding IS NOT NULL`]

  if (type) {
    params.push(type)
    wheres.push(`type = ?`)
  }

  if (tags && tags.length > 0) {
    params.push(tags)
    wheres.push(
      `EXISTS (SELECT 1 FROM jsonb_array_elements_text(tags) AS t(name) WHERE t.name = ANY(?))`
    )
  }

  params.push(limit)

  const sql = `
    SELECT id, url, title, description, tags, type, enrichment_status,
           saved_at, 1 - (embedding <=> ?::vector) AS score
    FROM bookmarks
    WHERE ${wheres.join(' AND ')}
    ORDER BY embedding <=> '${literal.replace(/'/g, "''")}'::vector ASC
    LIMIT ?
  `

  const result = await db.rawQuery(sql, params)
  const rows: Array<Record<string, unknown>> = result.rows ?? result

  return rows
    .map((r) => ({
      id: String(r.id),
      url: String(r.url),
      title: String(r.title),
      description: String(r.description),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : JSON.parse(String(r.tags ?? '[]')),
      type: r.type as BookmarkType,
      score: clampScore(Number(r.score)),
      enrichmentStatus: String(r.enrichment_status),
      savedAt: r.saved_at instanceof Date ? (r.saved_at as Date).toISOString() : String(r.saved_at),
    }))
    .filter((hit) => hit.score >= minScore)
}

function clampScore(s: number): number {
  if (Number.isNaN(s)) return 0
  if (s < 0) return 0
  if (s > 1) return 1
  return s
}
