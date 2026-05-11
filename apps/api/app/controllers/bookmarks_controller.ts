import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'

import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { detectMedia, hashUrl, normalizeUrl } from '@stashbox/shared'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

import Bookmark from '#models/bookmark'
import captureQueue from '#services/capture_queue'
import { storeClientCapture, type StoredCapture } from '#services/capture_storage'
import enrichmentQueue from '#services/enrichment_queue'
import transcriptionQueue from '#services/transcription_queue'
import { getYouTubeThumbnailUrl } from '#services/youtube_thumbnail'
import { createBookmarkValidator } from '#validators/bookmark'

const indexValidator = vine.compile(
  vine.object({
    limit: vine.number().positive().max(200).optional(),
    offset: vine.number().min(0).optional(),
    type: vine.enum(['tweet', 'youtube', 'article', 'image', 'pdf', 'other'] as const).optional(),
    tag: vine.string().minLength(1).optional(),
  })
)

export default class BookmarksController {
  async failed({ request }: HttpContext) {
    const q = await indexValidator.validate(request.qs())
    const limit = q.limit ?? 50
    const offset = q.offset ?? 0

    const params: unknown[] = []
    const wheres = [`enrichment_status = 'failed'`]
    if (q.type) {
      params.push(q.type)
      wheres.push(`type = ?`)
    }
    params.push(limit, offset)

    const result = await db.rawQuery(
      `SELECT * FROM bookmarks
       WHERE ${wheres.join(' AND ')}
       ORDER BY saved_at DESC
       LIMIT ? OFFSET ?`,
      params
    )
    const rows: Array<Record<string, unknown>> = result.rows ?? result
    return { results: rows.map((row) => serializeBookmarkRow(row, getRequestBaseUrl(request))) }
  }

  async index({ request }: HttpContext) {
    const q = await indexValidator.validate(request.qs())
    const limit = q.limit ?? 50
    const offset = q.offset ?? 0

    const params: unknown[] = []
    const wheres = [`enrichment_status IN ('pending', 'enriching', 'done', 'degraded')`]

    if (q.type) {
      params.push(q.type)
      wheres.push(`type = ?`)
    }
    if (q.tag) {
      params.push(q.tag)
      wheres.push(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(tags) AS t(name) WHERE t.name = ?)`
      )
    }
    params.push(limit, offset)

    const result = await db.rawQuery(
      `SELECT * FROM bookmarks
       WHERE ${wheres.join(' AND ')}
       ORDER BY saved_at DESC
       LIMIT ? OFFSET ?`,
      params
    )
    const rows: Array<Record<string, unknown>> = result.rows ?? result
    return { results: rows.map((row) => serializeBookmarkRow(row, getRequestBaseUrl(request))) }
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createBookmarkValidator)

    const url = normalizeUrl(payload.url)
    const urlHash = hashUrl(url)
    const media = detectMedia(url)
    const captureBaseUrl = getRequestBaseUrl(request)
    const initialOgImage = media.mediaProvider === 'youtube' ? getYouTubeThumbnailUrl(url) : null

    const existing = await Bookmark.findBy('urlHash', urlHash)
    if (existing) {
      return response.conflict(serializeBookmarkModel(existing, captureBaseUrl))
    }

    const id = randomUUID()
    let capture: StoredCapture | null = null
    if (payload.capture && media.mediaProvider !== 'youtube') {
      try {
        capture = await storeClientCapture(id, payload.capture, captureBaseUrl)
      } catch (error) {
        return response.status(422).send({
          error: 'validation_failed',
          message: error instanceof Error ? error.message : 'Capture is invalid',
        })
      }
    }

    const bookmark = await Bookmark.create({
      id,
      url,
      urlHash,
      type: 'other',
      title: payload.title ?? '',
      description: '',
      tags: [],
      ogImage: initialOgImage,
      capturePath: capture?.path ?? null,
      captureUrl: capture?.url ?? null,
      captureSource: capture?.source ?? null,
      captureMimeType: capture?.mimeType ?? null,
      captureWidth: capture?.width ?? null,
      captureHeight: capture?.height ?? null,
      captureByteSize: capture?.byteSize ?? null,
      capturedAt: capture?.capturedAt ? DateTime.fromISO(capture.capturedAt) : null,
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
      savedFrom: payload.sharedFrom ? [payload.sharedFrom] : [],
    })

    const shouldRunServerCapture = !capture && media.mediaProvider !== 'youtube'
    await Promise.all([
      shouldRunServerCapture
        ? captureQueue.dispatch(bookmark.id, captureBaseUrl)
        : Promise.resolve(),
      enrichmentQueue.dispatch(bookmark.id, payload.content),
      media.isMedia ? transcriptionQueue.dispatch(bookmark.id) : Promise.resolve(),
    ])

    return response.created(serializeBookmarkModel(bookmark, captureBaseUrl))
  }

  async show({ params, request, response }: HttpContext) {
    const bookmark = await Bookmark.find(params.id)
    if (!bookmark) {
      return response.notFound({ error: 'not_found', message: 'Bookmark not found' })
    }
    return serializeBookmarkModel(bookmark, getRequestBaseUrl(request))
  }

  async refresh({ params, response }: HttpContext) {
    const bookmark = await Bookmark.find(params.id)
    if (!bookmark) {
      return response.notFound({ error: 'not_found', message: 'Bookmark not found' })
    }
    bookmark.enrichmentStatus = 'pending'
    bookmark.enrichmentError = null
    bookmark.enrichmentFailureReason = null
    await bookmark.save()
    await enrichmentQueue.dispatch(bookmark.id)
    return response.accepted({ id: bookmark.id })
  }

  async destroy({ params, response }: HttpContext) {
    const bookmark = await Bookmark.find(params.id)
    if (!bookmark) {
      return response.notFound({ error: 'not_found', message: 'Bookmark not found' })
    }
    await bookmark.delete()
    return response.noContent()
  }
}

export function serializeBookmarkModel(
  bookmark: Bookmark,
  captureBaseUrl?: string
): Record<string, unknown> {
  return {
    id: bookmark.id,
    url: bookmark.url,
    urlHash: bookmark.urlHash,
    type: bookmark.type,
    title: bookmark.title,
    description: bookmark.description,
    tags: bookmark.tags,
    embedding: null,
    ogImage: serializeOgImage(
      bookmark.url,
      bookmark.ogImage,
      bookmark.mediaProvider,
      bookmark.type
    ),
    capture: serializeCapture(
      {
        path: bookmark.capturePath,
        url: bookmark.captureUrl,
        source: bookmark.captureSource,
        mimeType: bookmark.captureMimeType,
        width: bookmark.captureWidth,
        height: bookmark.captureHeight,
        byteSize: bookmark.captureByteSize,
        capturedAt: bookmark.capturedAt,
      },
      captureBaseUrl
    ),
    embedData: bookmark.embedData,
    isMedia: bookmark.isMedia,
    mediaKind: bookmark.mediaKind,
    mediaProvider: bookmark.mediaProvider,
    enrichmentStatus: bookmark.enrichmentStatus,
    enrichmentError: bookmark.enrichmentError,
    enrichmentFailureReason: bookmark.enrichmentFailureReason,
    enrichmentAttempts: bookmark.enrichmentAttempts,
    enrichedAt: toIso(bookmark.enrichedAt),
    embeddingSourceText: bookmark.embeddingSourceText,
    transcriptionStatus: bookmark.transcriptionStatus,
    transcriptionError: bookmark.transcriptionError,
    transcriptionText: bookmark.transcriptionText,
    transcribedAt: toIso(bookmark.transcribedAt),
    savedAt: toIso(bookmark.savedAt),
    savedCount: bookmark.savedCount,
    lastSavedAt: toIso(bookmark.lastSavedAt),
    savedFrom: bookmark.savedFrom,
  }
}

export function serializeBookmarkRow(
  r: Record<string, unknown>,
  captureBaseUrl?: string
): Record<string, unknown> {
  return {
    id: r.id,
    url: r.url,
    urlHash: r.url_hash,
    type: r.type,
    title: r.title,
    description: r.description,
    tags: parseTags(r.tags),
    embedding: null,
    ogImage: serializeOgImage(r.url, r.og_image, r.media_provider, r.type),
    capture: serializeCapture(
      {
        path: r.capture_path,
        url: r.capture_url,
        source: r.capture_source,
        mimeType: r.capture_mime_type,
        width: r.capture_width,
        height: r.capture_height,
        byteSize: r.capture_byte_size,
        capturedAt: r.captured_at,
      },
      captureBaseUrl
    ),
    embedData: r.embed_data,
    isMedia: r.is_media,
    mediaKind: r.media_kind,
    mediaProvider: r.media_provider,
    enrichmentStatus: r.enrichment_status,
    enrichmentError: r.enrichment_error,
    enrichmentFailureReason: r.enrichment_failure_reason,
    enrichmentAttempts: r.enrichment_attempts,
    enrichedAt: toIso(r.enriched_at),
    embeddingSourceText: r.embedding_source_text,
    transcriptionStatus: r.transcription_status,
    transcriptionError: r.transcription_error,
    transcriptionText: r.transcription_text,
    transcribedAt: toIso(r.transcribed_at),
    savedAt: toIso(r.saved_at),
    savedCount: r.saved_count,
    lastSavedAt: toIso(r.last_saved_at),
    savedFrom: parseTags(r.saved_from),
  }
}

function serializeCapture(
  input: {
    path: unknown
    url: unknown
    source: unknown
    mimeType: unknown
    width: unknown
    height: unknown
    byteSize: unknown
    capturedAt: unknown
  },
  captureBaseUrl?: string
): Record<string, unknown> | null {
  const url = buildCaptureUrl(input.url, input.path, captureBaseUrl)
  if (!url || !input.byteSize || !input.capturedAt) return null

  return {
    url,
    source: input.source ?? 'client',
    mimeType: input.mimeType ?? 'image/png',
    width: toNullableNumber(input.width),
    height: toNullableNumber(input.height),
    byteSize: Number(input.byteSize),
    capturedAt: toIso(input.capturedAt),
  }
}

function buildCaptureUrl(storedUrl: unknown, storedPath: unknown, baseUrl?: string): string | null {
  if (!baseUrl) return storedUrl ? String(storedUrl) : null

  const origin = baseUrl.replace(/\/$/, '')
  if (typeof storedUrl === 'string' && storedUrl.length > 0) {
    try {
      return `${origin}${new URL(storedUrl).pathname}`
    } catch {
      return storedUrl.startsWith('/captures/') ? `${origin}${storedUrl}` : storedUrl
    }
  }

  if (typeof storedPath === 'string' && storedPath.length > 0) {
    return `${origin}/captures/${basename(storedPath)}`
  }

  return null
}

function serializeOgImage(
  url: unknown,
  ogImage: unknown,
  mediaProvider: unknown,
  type: unknown
): string | null {
  if (typeof ogImage === 'string' && ogImage.length > 0) return ogImage
  if ((mediaProvider === 'youtube' || type === 'youtube') && typeof url === 'string') {
    return getYouTubeThumbnailUrl(url)
  }

  return null
}

function parseTags(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function getRequestBaseUrl(request: HttpContext['request']): string {
  return `${request.protocol()}://${request.host() ?? 'localhost'}`
}

function toIso(v: unknown): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof (v as { toISO?: unknown }).toISO === 'function') {
    return (v as { toISO: () => string | null }).toISO() ?? String(v)
  }
  return String(v)
}

function toNullableNumber(v: unknown): number | null {
  if (v == null) return null
  const number = Number(v)
  return Number.isFinite(number) ? number : null
}
