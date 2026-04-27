import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import vine from '@vinejs/vine'

import { embedBookmarkSource } from '#services/embed_bookmark_source'
import EmbeddingProvider from '#services/embedding_provider'
import { searchBookmarks } from '#services/search_bookmarks'

const searchValidator = vine.compile(
  vine.object({
    query: vine.string().minLength(1),
    limit: vine.number().positive().optional(),
    minScore: vine.number().min(0).max(1).optional(),
    type: vine.enum(['tweet', 'youtube', 'article', 'image', 'pdf', 'other'] as const).optional(),
    tags: vine.array(vine.string()).optional(),
  })
)

export default class SearchController {
  async handle({ request }: HttpContext) {
    const payload = await request.validateUsing(searchValidator)

    const provider = await app.container.make(EmbeddingProvider)
    const model = await provider.getModel()
    const queryEmbedding = await embedBookmarkSource({ sourceText: payload.query, model })

    const results = await searchBookmarks({
      queryEmbedding,
      limit: payload.limit ?? 10,
      minScore: payload.minScore ?? 0.4,
      type: payload.type,
      tags: payload.tags,
    })

    return { results }
  }
}
