import { test } from '@japa/runner'

import { authHeader } from '#tests/helpers/api_key'

test.group('POST /bookmarks — sharedFrom', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('persists sharedFrom into savedFrom array', async ({ client, assert }) => {
    const created = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/from-shortcut', sharedFrom: 'ios-shortcut' })

    created.assertStatus(201)
    assert.deepEqual(created.body().savedFrom, ['ios-shortcut'])

    const fetched = await client.get(`/bookmarks/${created.body().id}`).headers(auth)
    fetched.assertStatus(200)
    assert.deepEqual(fetched.body().savedFrom, ['ios-shortcut'])
  })

  test('rejects unknown sharedFrom value with 422', async ({ client }) => {
    const res = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/bad-source', sharedFrom: 'myspace' })
    res.assertStatus(422)
  })

  test('omitting sharedFrom keeps savedFrom empty', async ({ client, assert }) => {
    const res = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/no-source' })

    res.assertStatus(201)
    assert.deepEqual(res.body().savedFrom, [])
  })
})
