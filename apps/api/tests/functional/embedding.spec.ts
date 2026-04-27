import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import EmbeddingProvider from '#services/embedding_provider'
import enrichmentQueue from '#services/enrichment_queue'
import LlmProvider from '#services/llm_provider'
import { authHeader } from '#tests/helpers/api_key'
import { mockEmbeddingReturning } from '#tests/helpers/mock_embedding'
import { mockModelReturning } from '#tests/helpers/mock_llm'

function mockLlm(json: object): LlmProvider {
  return {
    getModel: async () => mockModelReturning(json),
  } as unknown as LlmProvider
}

function mockEmbedding(vector: number[]): EmbeddingProvider {
  return {
    getModel: async () => mockEmbeddingReturning(vector),
  } as unknown as EmbeddingProvider
}

test.group('Embedding pipeline (E2E)', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })
  group.each.teardown(() => {
    app.container.restoreAll()
  })

  test('after enrichment, bookmark row has 1536-dim embedding and embedding_source_text', async ({
    client,
    assert,
  }) => {
    app.container.swap(LlmProvider, () =>
      mockLlm({
        title: 'Why Kubernetes Won',
        description: 'Container orchestration history.',
        tags: ['kubernetes', 'devops'],
        type: 'article',
      })
    )

    const expectedVector = Array.from({ length: 1536 }, (_, i) => (i % 7) / 10)
    app.container.swap(EmbeddingProvider, () => mockEmbedding(expectedVector))

    const created = await client.post('/bookmarks').headers(auth).json({
      url: 'https://k8s.example.com/embed-test',
      content: 'Long-form content about kubernetes.',
    })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    assert.equal(after.body().enrichmentStatus, 'done')

    const rows = await db.rawQuery(
      `SELECT embedding::text AS embedding_text, embedding_source_text
       FROM bookmarks WHERE id = ?`,
      [created.body().id]
    )
    const row = (rows.rows ?? rows)[0]

    assert.isString(row.embedding_text)
    assert.match(row.embedding_text, /^\[/)
    const dims = row.embedding_text.replace(/^\[|\]$/g, '').split(',').length
    assert.equal(dims, 1536)

    assert.isString(row.embedding_source_text)
    assert.include(row.embedding_source_text, 'Title: Why Kubernetes Won')
    assert.include(row.embedding_source_text, 'Type: article')
    assert.include(row.embedding_source_text, 'Tags: kubernetes, devops')
    assert.include(row.embedding_source_text, 'Summary: Container orchestration history.')
    assert.include(row.embedding_source_text, 'Content excerpt:')
  })

  test('embedding provider error → status=failed with embedding_provider_error reason', async ({
    client,
    assert,
  }) => {
    app.container.swap(LlmProvider, () =>
      mockLlm({
        title: 't',
        description: 'd',
        tags: ['x'],
        type: 'article',
      })
    )

    app.container.swap(
      EmbeddingProvider,
      () =>
        ({
          getModel: async () => {
            throw new Error('boom: embedding api down')
          },
        }) as unknown as EmbeddingProvider
    )

    const created = await client.post('/bookmarks').headers(auth).json({
      url: 'https://embed-fail.example.com/post',
      content: 'whatever',
    })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    const body = after.body()
    assert.equal(body.enrichmentStatus, 'failed')
    assert.equal(body.enrichmentFailureReason, 'embedding_provider_error')
    assert.match(body.enrichmentError, /boom/)
  })

  test('HNSW cosine index exists on bookmarks.embedding', async ({ assert }) => {
    const rows = await db.rawQuery(
      `SELECT indexname FROM pg_indexes
       WHERE tablename = 'bookmarks' AND indexname = 'bookmarks_embedding_hnsw_idx'`
    )
    const records = rows.rows ?? rows
    assert.equal(records.length, 1)
  })
})
