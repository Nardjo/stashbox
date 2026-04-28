import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import EmbeddingProvider from '#services/embedding_provider'
import enrichmentQueue from '#services/enrichment_queue'
import FetchProvider from '#services/fetch_provider'
import LlmProvider from '#services/llm_provider'
import { authHeader } from '#tests/helpers/api_key'
import { mockEmbeddingReturning } from '#tests/helpers/mock_embedding'
import { mockModelReturning } from '#tests/helpers/mock_llm'
import { seedBookmark } from '#tests/helpers/seed_bookmark'

test.group('POST /bookmarks/:id/refresh', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })
  group.each.teardown(() => {
    app.container.restoreAll()
  })

  test('re-enqueues enrichment and lands the bookmark back to done', async ({ client, assert }) => {
    const id = await seedBookmark({
      url: 'https://refresh.example.com/a',
      title: 'Old title',
      enrichmentStatus: 'done',
    })

    app.container.swap(
      LlmProvider,
      () =>
        ({
          getModel: async () =>
            mockModelReturning({
              title: 'New title',
              description: 'New desc',
              tags: ['fresh'],
              type: 'article',
            }),
        }) as unknown as LlmProvider
    )
    app.container.swap(
      EmbeddingProvider,
      () =>
        ({
          getModel: async () => mockEmbeddingReturning(new Array(1536).fill(0.01)),
        }) as unknown as EmbeddingProvider
    )
    app.container.swap(
      FetchProvider,
      () =>
        ({
          fetchAndExtract: async () => ({
            kind: 'success' as const,
            content:
              'Refetched body content with enough characters to pass the threshold for a successful Jina extraction.',
          }),
        }) as unknown as FetchProvider
    )

    const res = await client.post(`/bookmarks/${id}/refresh`).headers(auth)
    res.assertStatus(202)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${id}`).headers(auth)
    after.assertStatus(200)
    const body = after.body()
    assert.equal(body.title, 'New title')
    assert.equal(body.enrichmentStatus, 'done')
  })

  test('returns 404 for unknown bookmark', async ({ client }) => {
    const res = await client
      .post('/bookmarks/00000000-0000-0000-0000-000000000000/refresh')
      .headers(auth)
    res.assertStatus(404)
  })
})
