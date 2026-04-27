import { test } from '@japa/runner'

import { authHeader } from '#tests/helpers/api_key'
import { seedBookmark } from '#tests/helpers/seed_bookmark'

test.group('GET /bookmarks/failed', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('returns only failed bookmarks', async ({ client, assert }) => {
    const idFailed = await seedBookmark({
      url: 'https://failed.example.com/a',
      enrichmentStatus: 'failed',
    })
    await seedBookmark({ url: 'https://done.example.com/a', enrichmentStatus: 'done' })
    await seedBookmark({ url: 'https://degraded.example.com/a', enrichmentStatus: 'degraded' })

    const res = await client.get('/bookmarks/failed').headers(auth)
    res.assertStatus(200)
    const ids = (res.body() as { results: Array<{ id: string }> }).results.map((b) => b.id)
    assert.deepEqual(ids, [idFailed])
  })

  test('filters failed by type', async ({ client, assert }) => {
    const idArticle = await seedBookmark({
      url: 'https://f1.example.com',
      type: 'article',
      enrichmentStatus: 'failed',
    })
    await seedBookmark({
      url: 'https://f2.example.com',
      type: 'youtube',
      enrichmentStatus: 'failed',
    })

    const res = await client.get('/bookmarks/failed?type=article').headers(auth)
    res.assertStatus(200)
    const ids = (res.body() as { results: Array<{ id: string }> }).results.map((b) => b.id)
    assert.deepEqual(ids, [idArticle])
  })
})
