import { test } from '@japa/runner'

import { embedBookmarkSource } from '#services/embed_bookmark_source'
import { mockEmbeddingCapturing, mockEmbeddingReturning } from '#tests/helpers/mock_embedding'

test.group('embedBookmarkSource', () => {
  test('passes the source text to the embedding model', async ({ assert }) => {
    let captured = ''
    const model = mockEmbeddingCapturing(new Array(1536).fill(0.1), (v) => {
      captured = v
    })

    await embedBookmarkSource({ sourceText: 'Title: x\nType: article\n...', model })

    assert.equal(captured, 'Title: x\nType: article\n...')
  })

  test('returns the numeric vector from the model', async ({ assert }) => {
    const expected = Array.from({ length: 1536 }, (_, i) => i / 1536)
    const model = mockEmbeddingReturning(expected)

    const vector = await embedBookmarkSource({ sourceText: 'whatever', model })

    assert.equal(vector.length, 1536)
    assert.deepEqual(vector, expected)
  })
})
