import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import EmbeddingProvider from '#services/embedding_provider'
import { authHeader } from '#tests/helpers/api_key'
import { mockEmbeddingReturning } from '#tests/helpers/mock_embedding'
import { seedBookmark, unitVector } from '#tests/helpers/seed_bookmark'

function mockEmbedding(vector: number[]): EmbeddingProvider {
  return {
    getModel: async () => mockEmbeddingReturning(vector),
  } as unknown as EmbeddingProvider
}

test.group('POST /search', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })
  group.each.teardown(() => {
    app.container.restoreAll()
  })

  test('returns bookmarks ordered by cosine similarity desc with score', async ({
    client,
    assert,
  }) => {
    const idClose = await seedBookmark({
      url: 'https://close.example.com/a',
      title: 'Close match',
      embedding: unitVector(0),
    })
    const idFar = await seedBookmark({
      url: 'https://far.example.com/b',
      title: 'Orthogonal',
      embedding: unitVector(100),
    })

    app.container.swap(EmbeddingProvider, () => mockEmbedding(unitVector(0)))

    const res = await client.post('/search').headers(auth).json({ query: 'anything' })
    res.assertStatus(200)

    const body = res.body() as { results: Array<{ id: string; score: number }> }
    assert.isArray(body.results)
    assert.isAtLeast(body.results.length, 1)
    assert.equal(body.results[0].id, idClose)
    assert.closeTo(body.results[0].score, 1, 0.001)

    const farResult = body.results.find((r) => r.id === idFar)
    if (farResult) {
      assert.isBelow(farResult.score, body.results[0].score)
    }
  })

  test('excludes failed, pending, enriching from results', async ({ client, assert }) => {
    const idDone = await seedBookmark({
      url: 'https://done.example.com/a',
      embedding: unitVector(0),
      enrichmentStatus: 'done',
    })
    await seedBookmark({
      url: 'https://failed.example.com/a',
      embedding: unitVector(0),
      enrichmentStatus: 'failed',
    })
    await seedBookmark({
      url: 'https://pending.example.com/a',
      embedding: unitVector(0),
      enrichmentStatus: 'pending',
    })
    await seedBookmark({
      url: 'https://enriching.example.com/a',
      embedding: unitVector(0),
      enrichmentStatus: 'enriching',
    })
    const idDegraded = await seedBookmark({
      url: 'https://degraded.example.com/a',
      embedding: unitVector(0),
      enrichmentStatus: 'degraded',
    })

    app.container.swap(EmbeddingProvider, () => mockEmbedding(unitVector(0)))

    const res = await client.post('/search').headers(auth).json({ query: 'q', minScore: 0 })
    res.assertStatus(200)

    const ids = (res.body() as { results: Array<{ id: string }> }).results.map((r) => r.id)
    assert.includeMembers(ids, [idDone, idDegraded])
    assert.equal(ids.length, 2)
  })

  test('filters by type', async ({ client, assert }) => {
    const idArticle = await seedBookmark({
      url: 'https://article.example.com/a',
      type: 'article',
      embedding: unitVector(0),
    })
    await seedBookmark({
      url: 'https://video.example.com/a',
      type: 'youtube',
      embedding: unitVector(0),
    })

    app.container.swap(EmbeddingProvider, () => mockEmbedding(unitVector(0)))

    const res = await client
      .post('/search')
      .headers(auth)
      .json({ query: 'q', type: 'article', minScore: 0 })
    res.assertStatus(200)

    const ids = (res.body() as { results: Array<{ id: string }> }).results.map((r) => r.id)
    assert.deepEqual(ids, [idArticle])
  })

  test('filters by tags (OR semantics)', async ({ client, assert }) => {
    const idMl = await seedBookmark({
      url: 'https://ml.example.com/a',
      tags: ['ml'],
      embedding: unitVector(0),
    })
    const idVideo = await seedBookmark({
      url: 'https://vid.example.com/a',
      tags: ['video'],
      embedding: unitVector(0),
    })
    await seedBookmark({
      url: 'https://other.example.com/a',
      tags: ['cooking'],
      embedding: unitVector(0),
    })

    app.container.swap(EmbeddingProvider, () => mockEmbedding(unitVector(0)))

    const res = await client
      .post('/search')
      .headers(auth)
      .json({ query: 'q', tags: ['ml', 'video'], minScore: 0 })
    res.assertStatus(200)

    const ids = (res.body() as { results: Array<{ id: string }> }).results.map((r) => r.id).sort()
    assert.deepEqual(ids, [idMl, idVideo].sort())
  })

  test('respects minScore', async ({ client, assert }) => {
    await seedBookmark({
      url: 'https://orth.example.com/a',
      embedding: unitVector(100),
    })
    const idClose = await seedBookmark({
      url: 'https://close2.example.com/a',
      embedding: unitVector(0),
    })

    app.container.swap(EmbeddingProvider, () => mockEmbedding(unitVector(0)))

    const res = await client.post('/search').headers(auth).json({ query: 'q', minScore: 0.5 })
    res.assertStatus(200)

    const results = (res.body() as { results: Array<{ id: string; score: number }> }).results
    assert.equal(results.length, 1)
    assert.equal(results[0].id, idClose)
  })

  test('respects limit', async ({ client, assert }) => {
    for (let i = 0; i < 5; i++) {
      await seedBookmark({
        url: `https://lim.example.com/${i}`,
        embedding: unitVector(0),
      })
    }
    app.container.swap(EmbeddingProvider, () => mockEmbedding(unitVector(0)))

    const res = await client
      .post('/search')
      .headers(auth)
      .json({ query: 'q', limit: 2, minScore: 0 })
    res.assertStatus(200)
    const results = (res.body() as { results: unknown[] }).results
    assert.equal(results.length, 2)
  })
})
