import { test } from '@japa/runner'

import enrichmentQueue from '#services/enrichment_queue'
import { authHeader } from '#tests/helpers/api_key'

test.group('enrichment pipeline (skeleton)', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('POST then flush queue: bookmark transitions pending→done with hostname title', async ({
    client,
    assert,
  }) => {
    const created = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://Example.com/article?utm_source=foo' })

    created.assertStatus(201)
    assert.equal(created.body().enrichmentStatus, 'pending')

    await enrichmentQueue.flush()

    const after = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    after.assertStatus(200)
    const body = after.body()
    assert.equal(body.enrichmentStatus, 'done')
    assert.equal(body.title, 'example.com')
    assert.isNotNull(body.enrichedAt)
  })
})
