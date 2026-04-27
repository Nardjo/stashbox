import { test } from '@japa/runner'

import { authHeader } from '#tests/helpers/api_key'
import { seedBookmark } from '#tests/helpers/seed_bookmark'

test.group('GET /tags', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('returns [{tag,count}] desc with default minCount=1', async ({ client, assert }) => {
    await seedBookmark({ url: 'https://t.example.com/a', tags: ['ml', 'ai'] })
    await seedBookmark({ url: 'https://t.example.com/b', tags: ['ml'] })
    await seedBookmark({ url: 'https://t.example.com/c', tags: ['cooking'] })
    // failed bookmark — its tags must NOT count
    await seedBookmark({
      url: 'https://t.example.com/d',
      tags: ['ml', 'ml-failed'],
      enrichmentStatus: 'failed',
    })

    const res = await client.get('/tags').headers(auth)
    res.assertStatus(200)
    const body = res.body() as { results: Array<{ tag: string; count: number }> }
    const map = Object.fromEntries(body.results.map((r) => [r.tag, r.count]))
    assert.equal(map.ml, 2)
    assert.equal(map.ai, 1)
    assert.equal(map.cooking, 1)
    assert.notProperty(map, 'ml-failed')

    // ordered by count desc
    const counts = body.results.map((r) => r.count)
    const sorted = [...counts].sort((a, b) => b - a)
    assert.deepEqual(counts, sorted)
  })

  test('respects minCount filter', async ({ client, assert }) => {
    await seedBookmark({ url: 'https://t.example.com/a', tags: ['ml', 'ai'] })
    await seedBookmark({ url: 'https://t.example.com/b', tags: ['ml'] })

    const res = await client.get('/tags?minCount=2').headers(auth)
    res.assertStatus(200)
    const body = res.body() as { results: Array<{ tag: string; count: number }> }
    assert.equal(body.results.length, 1)
    assert.equal(body.results[0].tag, 'ml')
  })
})
