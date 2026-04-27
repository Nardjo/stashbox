import { randomUUID } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'
import { hashUrl, normalizeUrl } from '@stashit/shared'

import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'

import Bookmark from '#models/bookmark'
import enrichmentQueue from '#services/enrichment_queue'
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
    return { results: rows.map(serializeBookmarkRow) }
  }

  async index({ request }: HttpContext) {
    const q = await indexValidator.validate(request.qs())
    const limit = q.limit ?? 50
    const offset = q.offset ?? 0

    const params: unknown[] = []
    const wheres = [`enrichment_status IN ('done', 'degraded')`]

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
    return { results: rows.map(serializeBookmarkRow) }
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createBookmarkValidator)

    const url = normalizeUrl(payload.url)
    const urlHash = hashUrl(url)

    const existing = await Bookmark.findBy('urlHash', urlHash)
    if (existing) {
      return response.conflict(existing)
    }

    const bookmark = await Bookmark.create({
      id: randomUUID(),
      url,
      urlHash,
      type: 'other',
      title: payload.title ?? '',
      description: '',
      tags: [],
      ogImage: null,
      embedData: null,
      enrichmentStatus: 'pending',
      enrichmentError: null,
      enrichmentFailureReason: null,
      enrichmentAttempts: 0,
      enrichedAt: null,
      embeddingSourceText: null,
      savedCount: 1,
      savedFrom: payload.sharedFrom ? [payload.sharedFrom] : [],
    })

    await enrichmentQueue.dispatch(bookmark.id, payload.content)

    return response.created(bookmark)
  }

  async show({ params, response }: HttpContext) {
    const bookmark = await Bookmark.find(params.id)
    if (!bookmark) {
      return response.notFound({ error: 'not_found', message: 'Bookmark not found' })
    }
    return bookmark
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

export function serializeBookmarkRow(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    url: r.url,
    urlHash: r.url_hash,
    type: r.type,
    title: r.title,
    description: r.description,
    tags: parseTags(r.tags),
    ogImage: r.og_image,
    embedData: r.embed_data,
    enrichmentStatus: r.enrichment_status,
    enrichmentError: r.enrichment_error,
    enrichmentFailureReason: r.enrichment_failure_reason,
    enrichmentAttempts: r.enrichment_attempts,
    enrichedAt: toIso(r.enriched_at),
    embeddingSourceText: r.embedding_source_text,
    savedAt: toIso(r.saved_at),
    savedCount: r.saved_count,
    lastSavedAt: toIso(r.last_saved_at),
    savedFrom: parseTags(r.saved_from),
  }
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

function toIso(v: unknown): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString()
  return String(v)
}
