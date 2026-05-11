import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'

import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { detectMedia, hashUrl, normalizeUrl } from '@stashbox/shared'
import { parse as parseCsv } from 'csv-parse'
import { DateTime } from 'luxon'

interface CsvRow {
  url?: string
  title?: string
  description?: string
  tags?: string
  created_at?: string
}

export default class ImportCsv extends BaseCommand {
  static commandName = 'import:csv'
  static description = 'Stream a CSV of bookmarks and bulk-insert them.'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Path to a CSV file with header row' })
  declare path: string

  async run() {
    const { default: Bookmark } = await import('#models/bookmark')
    const { default: captureQueue } = await import('#services/capture_queue')
    const { default: enrichmentQueue } = await import('#services/enrichment_queue')
    const { getYouTubeThumbnailUrl } = await import('#services/youtube_thumbnail')

    let total = 0
    let inserted = 0
    let skipped = 0
    let failed = 0

    const parser = createReadStream(this.path).pipe(
      parseCsv({ columns: true, skip_empty_lines: true, trim: true })
    )

    for await (const raw of parser as AsyncIterable<CsvRow>) {
      total++
      const rawUrl = (raw.url ?? '').trim()
      if (!rawUrl) {
        failed++
        continue
      }

      let normalized: string
      try {
        const u = new URL(rawUrl)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          failed++
          continue
        }
        normalized = normalizeUrl(rawUrl)
      } catch {
        failed++
        continue
      }

      const urlHash = hashUrl(normalized)
      const existing = await Bookmark.findBy('urlHash', urlHash)
      if (existing) {
        skipped++
        continue
      }

      const tags = (raw.tags ?? '')
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean)

      let savedAt: DateTime | undefined
      if (raw.created_at && raw.created_at.trim()) {
        const dt = DateTime.fromISO(raw.created_at.trim(), { zone: 'utc' })
        if (dt.isValid) savedAt = dt
      }

      const media = detectMedia(normalized)
      const bookmark = await Bookmark.create({
        id: randomUUID(),
        url: normalized,
        urlHash,
        type: 'other',
        title: raw.title ?? '',
        description: raw.description ?? '',
        tags,
        ogImage: media.mediaProvider === 'youtube' ? getYouTubeThumbnailUrl(normalized) : null,
        embedData: null,
        isMedia: media.isMedia,
        mediaKind: media.mediaKind,
        mediaProvider: media.mediaProvider,
        enrichmentStatus: 'pending',
        enrichmentError: null,
        enrichmentFailureReason: null,
        enrichmentAttempts: 0,
        enrichedAt: null,
        embeddingSourceText: null,
        transcriptionStatus: media.isMedia ? 'pending' : 'none',
        transcriptionError: null,
        transcriptionText: null,
        transcribedAt: null,
        savedCount: 1,
        savedFrom: ['import-csv'],
        ...(savedAt ? { savedAt, lastSavedAt: savedAt } : {}),
      })

      await Promise.all([
        media.mediaProvider === 'youtube' ? Promise.resolve() : captureQueue.dispatch(bookmark.id),
        enrichmentQueue.dispatch(bookmark.id),
      ])
      inserted++
    }

    this.logger.info(
      `Import summary — total: ${total}, inserted: ${inserted}, skipped: ${skipped}, failed: ${failed}`
    )

    await Promise.all([captureQueue.shutdown(), enrichmentQueue.shutdown()])
  }
}
