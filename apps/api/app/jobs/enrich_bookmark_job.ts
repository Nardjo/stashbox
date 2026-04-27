import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import type { EnrichmentFailureReason } from '@stashit/shared'
import { DateTime } from 'luxon'

import Bookmark from '#models/bookmark'
import { composeEmbeddingSource } from '#services/compose_embedding_source'
import { embedBookmarkSource } from '#services/embed_bookmark_source'
import EmbeddingProvider from '#services/embedding_provider'
import { enrichBookmark } from '#services/enrich_bookmark'
import LlmProvider from '#services/llm_provider'

class StageError extends Error {
  constructor(
    public stage: 'llm' | 'embedding',
    message: string
  ) {
    super(message)
  }
}

const FAILURE_REASON: Record<StageError['stage'], EnrichmentFailureReason> = {
  llm: 'llm_provider_error',
  embedding: 'embedding_provider_error',
}

export default class EnrichBookmarkJob {
  static async handle(bookmarkId: string, content?: string): Promise<void> {
    const bookmark = await Bookmark.find(bookmarkId)
    if (!bookmark) return

    bookmark.enrichmentStatus = 'enriching'
    bookmark.enrichmentAttempts = bookmark.enrichmentAttempts + 1
    await bookmark.save()

    try {
      const sourceText = (content && content.trim()) || bookmark.title || bookmark.url

      const enrichment = await runLlm(sourceText)

      bookmark.title = enrichment.title
      bookmark.description = enrichment.description
      bookmark.tags = enrichment.tags
      bookmark.type = enrichment.type

      const embeddingSourceText = composeEmbeddingSource({
        title: enrichment.title,
        type: enrichment.type,
        tags: enrichment.tags,
        description: enrichment.description,
        content: sourceText,
      })

      const vector = await runEmbedding(embeddingSourceText)
      await persistEmbedding(bookmark.id, vector, embeddingSourceText)

      bookmark.embeddingSourceText = embeddingSourceText
      bookmark.enrichmentStatus = 'done'
      bookmark.enrichmentError = null
      bookmark.enrichmentFailureReason = null
      bookmark.enrichedAt = DateTime.utc()
      await bookmark.save()
    } catch (err) {
      bookmark.enrichmentStatus = 'failed'
      bookmark.enrichmentError = err instanceof Error ? err.message : String(err)
      bookmark.enrichmentFailureReason =
        err instanceof StageError ? FAILURE_REASON[err.stage] : 'llm_provider_error'
      await bookmark.save()
    }
  }
}

async function runLlm(sourceText: string) {
  try {
    const provider = await app.container.make(LlmProvider)
    const model = await provider.getModel()
    const existingTags = await fetchExistingTags()
    return await enrichBookmark({ content: sourceText, existingTags, model })
  } catch (err) {
    throw new StageError('llm', err instanceof Error ? err.message : String(err))
  }
}

async function runEmbedding(sourceText: string): Promise<number[]> {
  try {
    const provider = await app.container.make(EmbeddingProvider)
    const model = await provider.getModel()
    return await embedBookmarkSource({ sourceText, model })
  } catch (err) {
    throw new StageError('embedding', err instanceof Error ? err.message : String(err))
  }
}

async function persistEmbedding(
  bookmarkId: string,
  vector: number[],
  sourceText: string
): Promise<void> {
  const literal = `[${vector.join(',')}]`
  await db.rawQuery(
    `UPDATE bookmarks
     SET embedding = ?::vector, embedding_source_text = ?
     WHERE id = ?`,
    [literal, sourceText, bookmarkId]
  )
}

async function fetchExistingTags(): Promise<string[]> {
  const rows = await db.rawQuery(
    `SELECT DISTINCT jsonb_array_elements_text(tags) AS tag FROM bookmarks WHERE jsonb_typeof(tags) = 'array'`
  )
  const records: { tag: string }[] = rows.rows ?? rows
  return records.map((r) => r.tag).filter((t): t is string => typeof t === 'string' && t.length > 0)
}
