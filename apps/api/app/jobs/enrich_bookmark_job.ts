import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import Bookmark from '#models/bookmark'
import { enrichBookmark } from '#services/enrich_bookmark'
import LlmProvider from '#services/llm_provider'

export default class EnrichBookmarkJob {
  static async handle(bookmarkId: string, content?: string): Promise<void> {
    const bookmark = await Bookmark.find(bookmarkId)
    if (!bookmark) return

    bookmark.enrichmentStatus = 'enriching'
    bookmark.enrichmentAttempts = bookmark.enrichmentAttempts + 1
    await bookmark.save()

    try {
      const provider = await app.container.make(LlmProvider)
      const model = await provider.getModel()
      const existingTags = await fetchExistingTags()
      const sourceText = (content && content.trim()) || bookmark.title || bookmark.url

      const result = await enrichBookmark({
        content: sourceText,
        existingTags,
        model,
      })

      bookmark.title = result.title
      bookmark.description = result.description
      bookmark.tags = result.tags
      bookmark.type = result.type
      bookmark.enrichmentStatus = 'done'
      bookmark.enrichmentError = null
      bookmark.enrichmentFailureReason = null
      bookmark.enrichedAt = DateTime.utc()
      await bookmark.save()
    } catch (err) {
      bookmark.enrichmentStatus = 'failed'
      bookmark.enrichmentError = err instanceof Error ? err.message : String(err)
      bookmark.enrichmentFailureReason = 'llm_provider_error'
      await bookmark.save()
    }
  }
}

async function fetchExistingTags(): Promise<string[]> {
  const rows = await db.rawQuery(
    `SELECT DISTINCT jsonb_array_elements_text(tags) AS tag FROM bookmarks WHERE jsonb_typeof(tags) = 'array'`
  )
  const records: { tag: string }[] = rows.rows ?? rows
  return records.map((r) => r.tag).filter((t): t is string => typeof t === 'string' && t.length > 0)
}
