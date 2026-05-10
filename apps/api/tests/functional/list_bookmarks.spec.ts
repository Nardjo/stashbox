import { test } from '@japa/runner'

import { authHeader } from '#tests/helpers/api_key'
import { seedBookmark } from '#tests/helpers/seed_bookmark'

test.group('GET /bookmarks (list)', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('returns visible bookmarks ordered by savedAt DESC and excludes failed', async ({
    client,
    assert,
  }) => {
    const oldest = new Date(Date.now() - 120_000)
    const old = new Date(Date.now() - 90_000)
    const newer = new Date(Date.now() - 60_000)
    const newest = new Date()
    const idPending = await seedBookmark({
      url: 'https://pending.example.com/a',
      enrichmentStatus: 'pending',
      savedAt: newest,
    })
    const idEnriching = await seedBookmark({
      url: 'https://enriching.example.com/a',
      enrichmentStatus: 'enriching',
      savedAt: newer,
    })
    const idOld = await seedBookmark({
      url: 'https://old.example.com/a',
      enrichmentStatus: 'done',
      savedAt: oldest,
    })
    const idNew = await seedBookmark({
      url: 'https://new.example.com/a',
      enrichmentStatus: 'degraded',
      savedAt: old,
    })
    await seedBookmark({ url: 'https://failed.example.com/a', enrichmentStatus: 'failed' })

    const res = await client.get('/bookmarks').headers(auth)
    res.assertStatus(200)
    const body = res.body() as { results: Array<{ id: string }> }
    assert.deepEqual(
      body.results.map((b) => b.id),
      [idPending, idEnriching, idNew, idOld]
    )
  })

  test('respects limit and offset', async ({ client, assert }) => {
    for (let i = 0; i < 4; i++) {
      await seedBookmark({
        url: `https://p.example.com/${i}`,
        savedAt: new Date(Date.now() - (10 - i) * 1000),
      })
    }

    const res = await client.get('/bookmarks?limit=2&offset=1').headers(auth)
    res.assertStatus(200)
    const body = res.body() as { results: unknown[] }
    assert.equal(body.results.length, 2)
  })

  test('filters by tag', async ({ client, assert }) => {
    const idMl = await seedBookmark({ url: 'https://t1.example.com/a', tags: ['ml', 'video'] })
    await seedBookmark({ url: 'https://t2.example.com/a', tags: ['cooking'] })

    const res = await client.get('/bookmarks?tag=ml').headers(auth)
    res.assertStatus(200)
    const ids = (res.body() as { results: Array<{ id: string }> }).results.map((b) => b.id)
    assert.deepEqual(ids, [idMl])
  })

  test('filters by type', async ({ client, assert }) => {
    const idArticle = await seedBookmark({ url: 'https://a.example.com', type: 'article' })
    await seedBookmark({ url: 'https://v.example.com', type: 'youtube' })

    const res = await client.get('/bookmarks?type=article').headers(auth)
    res.assertStatus(200)
    const ids = (res.body() as { results: Array<{ id: string }> }).results.map((b) => b.id)
    assert.deepEqual(ids, [idArticle])
  })
})
