import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { hashUrl } from '@stashit/shared'

export interface SeedBookmarkInput {
  url: string
  title?: string
  description?: string
  tags?: string[]
  type?: 'tweet' | 'youtube' | 'article' | 'image' | 'pdf' | 'other'
  enrichmentStatus?: 'pending' | 'enriching' | 'done' | 'degraded' | 'failed'
  embedding?: number[] | null
  savedAt?: Date
}

export async function seedBookmark(input: SeedBookmarkInput): Promise<string> {
  const id = randomUUID()
  const url = input.url
  const urlHash = hashUrl(url)
  const tags = input.tags ?? []
  const status = input.enrichmentStatus ?? 'done'
  const savedAt = input.savedAt ?? new Date()
  const embeddingLiteral = input.embedding ? `[${input.embedding.join(',')}]` : null

  await db.rawQuery(
    `INSERT INTO bookmarks (
       id, url, url_hash, type, title, description, tags,
       enrichment_status, enrichment_attempts,
       embedding, saved_at, last_saved_at, saved_count, saved_from
     ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ${embeddingLiteral === null ? 'NULL' : '?::vector'}, ?, ?, ?, ?::jsonb)`,
    [
      id,
      url,
      urlHash,
      input.type ?? 'article',
      input.title ?? '',
      input.description ?? '',
      JSON.stringify(tags),
      status,
      0,
      ...(embeddingLiteral === null ? [] : [embeddingLiteral]),
      savedAt,
      savedAt,
      1,
      JSON.stringify([]),
    ]
  )

  return id
}

/**
 * Build a 1536-dim unit vector with most weight in one slot. Deterministic
 * fixtures for cosine ordering: vectors with the same hot slot are similar,
 * different hot slots are orthogonal.
 */
export function unitVector(hotIndex: number, dim = 1536): number[] {
  const v = new Array(dim).fill(0)
  v[hotIndex] = 1
  return v
}
