import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { decryptSiteCredentialCookies } from '#services/site_credentials_encryption'
import { authHeader } from '#tests/helpers/api_key'

const cookie = {
  name: 'sid',
  value: 'secret-cookie-value',
  domain: '.example.com',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax' as const,
  expirationDate: 1_893_456_000,
  session: false,
  hostOnly: false,
}

test.group('Site credentials', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('sync stores cookies encrypted by normalized domain', async ({ client, assert }) => {
    const response = await client
      .post('/site-credentials/sync')
      .headers(auth)
      .json({ domain: 'https://Example.com/account', cookies: [cookie] })

    response.assertStatus(200)
    assert.equal(response.body().domain, 'example.com')
    assert.equal(response.body().cookieCount, 1)

    const row = await db.from('site_credentials').where('domain', 'example.com').first()
    assert.exists(row)
    if (!row) return
    assert.isString(row.encrypted_cookies)
    assert.isFalse(String(row.encrypted_cookies).includes('secret-cookie-value'))
    assert.isFalse(String(row.encrypted_cookies).includes('"sid"'))

    const decrypted = decryptSiteCredentialCookies('example.com', row.encrypted_cookies)
    assert.deepEqual(decrypted, [cookie])
  })

  test('list and read expose metadata only', async ({ client, assert }) => {
    const synced = await client
      .post('/site-credentials/sync')
      .headers(auth)
      .json({ domain: 'example.com', cookies: [cookie] })
    const id = synced.body().id

    const list = await client.get('/site-credentials').headers(auth)
    list.assertStatus(200)
    assert.lengthOf(list.body().results, 1)
    assert.equal(list.body().results[0].cookieCount, 1)
    assert.isFalse(JSON.stringify(list.body()).includes('secret-cookie-value'))
    assert.isFalse(JSON.stringify(list.body()).includes('encryptedCookies'))

    const read = await client.get(`/site-credentials/${id}`).headers(auth)
    read.assertStatus(200)
    assert.equal(read.body().domain, 'example.com')
    assert.isFalse(JSON.stringify(read.body()).includes('secret-cookie-value'))
    assert.isUndefined(read.body().cookies)
    assert.isUndefined(read.body().encryptedCookies)
  })

  test('sync updates an existing domain instead of duplicating it', async ({ client, assert }) => {
    const first = await client
      .post('/site-credentials/sync')
      .headers(auth)
      .json({ domain: 'example.com', cookies: [cookie] })

    const second = await client
      .post('/site-credentials/sync')
      .headers(auth)
      .json({
        domain: 'https://example.com/profile',
        cookies: [cookie, { ...cookie, name: 'theme', value: 'dark' }],
      })

    second.assertStatus(200)
    assert.equal(second.body().id, first.body().id)
    assert.equal(second.body().cookieCount, 2)

    const rows = await db.from('site_credentials').where('domain', 'example.com')
    assert.lengthOf(rows, 1)
  })

  test('delete removes stored Site credentials', async ({ client, assert }) => {
    const synced = await client
      .post('/site-credentials/sync')
      .headers(auth)
      .json({ domain: 'example.com', cookies: [cookie] })
    const id = synced.body().id

    const deleted = await client.delete(`/site-credentials/${id}`).headers(auth)
    deleted.assertStatus(204)

    const list = await client.get('/site-credentials').headers(auth)
    list.assertStatus(200)
    assert.lengthOf(list.body().results, 0)

    const read = await client.get(`/site-credentials/${id}`).headers(auth)
    read.assertStatus(404)
  })
})
