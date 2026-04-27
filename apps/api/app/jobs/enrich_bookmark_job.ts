import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { detectType, type EnrichmentFailureReason } from '@stashit/shared'
import { DateTime } from 'luxon'

import Bookmark from '#models/bookmark'
import { composeEmbeddingSource } from '#services/compose_embedding_source'
import { embedBookmarkSource } from '#services/embed_bookmark_source'
import EmbeddingProvider from '#services/embedding_provider'
import { enrichBookmark } from '#services/enrich_bookmark'
import FetchProvider, { type FetchOutcome } from '#services/fetch_provider'
import LlmProvider from '#services/llm_provider'

class StageError extends Error {
  constructor(
    public stage: 'llm' | 'embedding' | 'fetch',
    message: string,
    public reason?: EnrichmentFailureReason
  ) {
    super(message)
  }
}

const FAILURE_REASON: Record<'llm' | 'embedding', EnrichmentFailureReason> = {
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
      const detectedType = detectType(bookmark.url)
      const trimmed = content?.trim()

      const fetched: FetchOutcome | null = trimmed
        ? null
        : await runFetch(bookmark.url, detectedType)

      if (fetched?.kind === 'dead') {
        throw new StageError('fetch', `URL is dead: ${fetched.reason}`, 'url_dead')
      }

      const sourceText = pickSourceText({
        clientContent: trimmed,
        fetched,
        fallback: bookmark.title || bookmark.url,
      })

      if (fetched?.kind === 'success') {
        if (fetched.ogImage) bookmark.ogImage = fetched.ogImage
        if (fetched.embedData !== undefined) bookmark.embedData = fetched.embedData
      }

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
      bookmark.enrichmentStatus = fetched?.kind === 'meta_only' ? 'degraded' : 'done'
      bookmark.enrichmentError = null
      bookmark.enrichmentFailureReason = null
      bookmark.enrichedAt = DateTime.utc()
      await bookmark.save()
    } catch (err) {
      bookmark.enrichmentStatus = 'failed'
      bookmark.enrichmentError = err instanceof Error ? err.message : String(err)
      bookmark.enrichmentFailureReason = pickFailureReason(err)
      await bookmark.save()
    }
  }
}

function pickFailureReason(err: unknown): EnrichmentFailureReason {
  if (err instanceof StageError) {
    if (err.reason) return err.reason
    if (err.stage === 'llm' || err.stage === 'embedding') return FAILURE_REASON[err.stage]
  }
  return 'unknown'
}

function pickSourceText(opts: {
  clientContent?: string
  fetched: FetchOutcome | null
  fallback: string
}): string {
  if (opts.clientContent) return opts.clientContent
  if (opts.fetched?.kind === 'success') return opts.fetched.content
  if (opts.fetched?.kind === 'meta_only') {
    const parts = [opts.fetched.ogTitle, opts.fetched.ogDescription, opts.fallback].filter(Boolean)
    return parts.join('\n\n') || opts.fallback
  }
  return opts.fallback
}

async function runFetch(url: string, type: ReturnType<typeof detectType>): Promise<FetchOutcome> {
  try {
    const provider = await app.container.make(FetchProvider)
    return await provider.fetchAndExtract(url, type)
  } catch (err) {
    throw new StageError(
      'fetch',
      err instanceof Error ? err.message : String(err),
      'fetch_unavailable'
    )
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
