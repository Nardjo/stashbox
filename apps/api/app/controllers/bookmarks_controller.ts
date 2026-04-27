import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import Bookmark from '#models/bookmark'
import { createBookmarkValidator } from '#validators/bookmark'
import { hashUrl, normalizeUrl } from '@stashit/shared'

export default class BookmarksController {
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
      savedFrom: [],
    })

    return response.created(bookmark)
  }

  async show({ params, response }: HttpContext) {
    const bookmark = await Bookmark.find(params.id)
    if (!bookmark) {
      return response.notFound({ error: 'not_found', message: 'Bookmark not found' })
    }
    return bookmark
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
