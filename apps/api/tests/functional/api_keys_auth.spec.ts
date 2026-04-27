import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ApiKey from '#models/api_key'

test.group('API key auth on /bookmarks', () => {
  test('rejects unauthenticated POST with 401', async ({ client }) => {
    const res = await client.post('/bookmarks').json({ url: 'https://example.com/a' })
    res.assertStatus(401)
  })

  test('rejects unauthenticated GET with 401', async ({ client }) => {
    const res = await client.get('/bookmarks/00000000-0000-0000-0000-000000000000')
    res.assertStatus(401)
  })

  test('rejects unauthenticated DELETE with 401', async ({ client }) => {
    const res = await client.delete('/bookmarks/00000000-0000-0000-0000-000000000000')
    res.assertStatus(401)
  })

  test('rejects request with malformed Authorization header with 401', async ({ client }) => {
    const res = await client
      .post('/bookmarks')
      .header('Authorization', 'NotBearer xyz')
      .json({ url: 'https://example.com/b' })
    res.assertStatus(401)
  })

  test('rejects unknown bearer key with 401', async ({ client }) => {
    const res = await client
      .post('/bookmarks')
      .header('Authorization', 'Bearer sk_doesnotexist')
      .json({ url: 'https://example.com/c' })
    res.assertStatus(401)
  })

  test('rejects revoked key with 401', async ({ client }) => {
    const { key, plaintext } = await ApiKey.generate('revoked-key')
    key.revokedAt = DateTime.utc()
    await key.save()

    const res = await client
      .post('/bookmarks')
      .header('Authorization', `Bearer ${plaintext}`)
      .json({ url: 'https://example.com/d' })
    res.assertStatus(401)
  })

  test('updates last_used_at on a valid request', async ({ client, assert }) => {
    const { key, plaintext } = await ApiKey.generate('used-key')

    const res = await client
      .post('/bookmarks')
      .header('Authorization', `Bearer ${plaintext}`)
      .json({ url: 'https://example.com/used' })
    res.assertStatus(201)

    await new Promise((r) => setTimeout(r, 50))
    const reloaded = await ApiKey.findOrFail(key.id)
    assert.isNotNull(reloaded.lastUsedAt)
  })
})
