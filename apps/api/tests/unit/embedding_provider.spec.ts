import { test } from '@japa/runner'

import { resolveEmbeddingModel } from '#services/embedding_provider'

test.group('EmbeddingProvider.resolveEmbeddingModel', () => {
  test('resolves openai embedding provider', async ({ assert }) => {
    const m = await resolveEmbeddingModel('openai', 'text-embedding-3-small', 'sk-test')
    assert.match(m.provider, /openai/)
    assert.equal(m.modelId, 'text-embedding-3-small')
  })
})
