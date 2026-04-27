import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import nock from 'nock'

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

function mockEmbedding(): EmbeddingProvider {
  return {
    getModel: async () => mockEmbeddingReturning(new Array(1536).fill(0.01)),
  } as unknown as EmbeddingProvider
}

test.group('Auto-fetch pipeline (E2E)', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
    nock.disableNetConnect()
    nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'))
  })
  group.each.teardown(() => {
    app.container.restoreAll()
    nock.cleanAll()
    nock.enableNetConnect()
  })

  test('POST without content fetches via Jina and lands done', async ({ client, assert }) => {
    nock('https://r.jina.ai')
      .get('/https://example.com/post')
      .reply(
        200,
        '# Real Article\n\n' +
          'Long-form content fetched from Jina Reader, well over the 100-char threshold to qualify as a successful extraction. More body to be sure.'
      )

    app.container.swap(LlmProvider, () =>
      mockLlm({
        title: 'Real Article',
        description: 'Fetched and enriched.',
        tags: ['fetch'],
        type: 'article',
      })
    )
    app.container.swap(EmbeddingProvider, () => mockEmbedding())

    const created = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/post' })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    after.assertStatus(200)
    const body = after.body()
    assert.equal(body.enrichmentStatus, 'done')
    assert.equal(body.title, 'Real Article')
  })

  test('Jina 404 → bookmark failed with url_dead', async ({ client, assert }) => {
    nock('https://r.jina.ai').get('/https://gone.example.com/post').reply(404, 'not found')

    app.container.swap(LlmProvider, () =>
      mockLlm({ title: 't', description: 'd', tags: ['x'], type: 'article' })
    )
    app.container.swap(EmbeddingProvider, () => mockEmbedding())

    const created = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://gone.example.com/post' })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    const body = after.body()
    assert.equal(body.enrichmentStatus, 'failed')
    assert.equal(body.enrichmentFailureReason, 'url_dead')
  })

  test('Empty Jina response → bookmark degraded (LLM ran on fallback)', async ({
    client,
    assert,
  }) => {
    nock('https://r.jina.ai').get('/https://thin.example.com/post').reply(200, '   ')

    app.container.swap(LlmProvider, () =>
      mockLlm({
        title: 'Thin Article',
        description: 'Inferred from URL only.',
        tags: ['unknown'],
        type: 'article',
      })
    )
    app.container.swap(EmbeddingProvider, () => mockEmbedding())

    const created = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://thin.example.com/post' })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    const body = after.body()
    assert.equal(body.enrichmentStatus, 'degraded')
    assert.equal(body.title, 'Thin Article')
  })

  test('Client-provided content skips fetch entirely', async ({ client, assert }) => {
    // No nock interceptor → if fetch is called, the test will fail because nock blocks the request.

    app.container.swap(LlmProvider, () =>
      mockLlm({ title: 'Provided', description: 'd', tags: ['x'], type: 'article' })
    )
    app.container.swap(EmbeddingProvider, () => mockEmbedding())

    const created = await client.post('/bookmarks').headers(auth).json({
      url: 'https://shortcut.example.com/post',
      content: 'Long-form content already extracted by Safari Reader, no fetch needed.',
    })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    assert.equal(after.body().enrichmentStatus, 'done')
  })
})
