import { test } from '@japa/runner'
import { hashUrl, normalizeUrl } from '@stashit/shared'

test.group('POST /bookmarks', () => {
  test('creates a bookmark from a URL and returns 201', async ({ client, assert }) => {
    const response = await client.post('/bookmarks').json({
      url: 'https://Example.com/article?utm_source=foo',
    })

    response.assertStatus(201)

    const body = response.body()
    const expectedUrl = normalizeUrl('https://Example.com/article?utm_source=foo')
    const expectedHash = hashUrl(expectedUrl)

    assert.match(body.id, /^[0-9a-f-]{36}$/)
    assert.equal(body.url, expectedUrl)
    assert.equal(body.urlHash, expectedHash)
    assert.equal(body.enrichmentStatus, 'pending')
    assert.equal(body.savedCount, 1)
  })

  test('returns 422 when url is missing or invalid', async ({ client }) => {
    const missing = await client.post('/bookmarks').json({})
    missing.assertStatus(422)

    const invalid = await client.post('/bookmarks').json({ url: 'not-a-url' })
    invalid.assertStatus(422)
  })

  test('returns 409 with the existing bookmark on urlHash collision', async ({
    client,
    assert,
  }) => {
    const first = await client
      .post('/bookmarks')
      .json({ url: 'https://example.com/article?utm_source=foo' })
    first.assertStatus(201)
    const firstId = first.body().id

    const second = await client.post('/bookmarks').json({ url: 'https://www.example.com/article/' })

    second.assertStatus(409)
    assert.equal(second.body().id, firstId)
    assert.equal(second.body().urlHash, first.body().urlHash)
  })
})

test.group('GET /bookmarks/:id', () => {
  test('returns 200 with the bookmark', async ({ client, assert }) => {
    const created = await client.post('/bookmarks').json({ url: 'https://example.com/foo' })
    const id = created.body().id

    const response = await client.get(`/bookmarks/${id}`)

    response.assertStatus(200)
    assert.equal(response.body().id, id)
    assert.equal(response.body().url, 'https://example.com/foo')
  })

  test('returns 404 when bookmark is missing', async ({ client }) => {
    const response = await client.get('/bookmarks/00000000-0000-0000-0000-000000000000')
    response.assertStatus(404)
  })
})

test.group('DELETE /bookmarks/:id', () => {
  test('hard-deletes and returns 204', async ({ client }) => {
    const created = await client.post('/bookmarks').json({ url: 'https://example.com/bye' })
    const id = created.body().id

    const del = await client.delete(`/bookmarks/${id}`)
    del.assertStatus(204)

    const after = await client.get(`/bookmarks/${id}`)
    after.assertStatus(404)
  })

  test('returns 404 when deleting a missing bookmark', async ({ client }) => {
    const del = await client.delete('/bookmarks/00000000-0000-0000-0000-000000000000')
    del.assertStatus(404)
  })
})
