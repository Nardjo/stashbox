import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import enrichmentQueue from '#services/enrichment_queue'
import LlmProvider from '#services/llm_provider'
import { authHeader } from '#tests/helpers/api_key'
import { mockModelReturning } from '#tests/helpers/mock_llm'

function mockProvider(json: object): LlmProvider {
  return {
    getModel: async () => mockModelReturning(json),
  } as unknown as LlmProvider
}

test.group('LLM enrichment (E2E)', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })
  group.each.teardown(() => {
    app.container.restoreAll()
  })

  test('LLM error → bookmark status=failed with error stored, attempts=1', async ({
    client,
    assert,
  }) => {
    app.container.swap(
      LlmProvider,
      () =>
        ({
          getModel: async () => {
            throw new Error('boom: api key invalid')
          },
        }) as unknown as LlmProvider
    )

    const created = await client.post('/bookmarks').headers(auth).json({
      url: 'https://fail.example.com/post',
      content: 'whatever',
    })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    after.assertStatus(200)
    const body = after.body()
    assert.equal(body.enrichmentStatus, 'failed')
    assert.equal(body.enrichmentFailureReason, 'llm_provider_error')
    assert.match(body.enrichmentError, /boom/)
    assert.equal(body.enrichmentAttempts, 1)
  })

  test('POST /bookmarks with content → enrichment populates title/desc/tags/type', async ({
    client,
    assert,
  }) => {
    app.container.swap(LlmProvider, () =>
      mockProvider({
        title: 'Why Kubernetes Won',
        description: 'Container orchestration history.',
        tags: ['Kubernetes', 'DevOps'],
        type: 'article',
      })
    )

    const created = await client.post('/bookmarks').headers(auth).json({
      url: 'https://k8s.example.com/post',
      content: 'Long-form content about kubernetes...',
    })
    created.assertStatus(201)

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    after.assertStatus(200)
    const body = after.body()
    assert.equal(body.enrichmentStatus, 'done')
    assert.equal(body.title, 'Why Kubernetes Won')
    assert.equal(body.description, 'Container orchestration history.')
    assert.equal(body.type, 'article')
    assert.deepEqual(body.tags, ['kubernetes', 'devops'])
    assert.isNotNull(body.enrichedAt)
  })
})
