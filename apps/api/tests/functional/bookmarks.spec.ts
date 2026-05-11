import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { hashUrl, normalizeUrl } from '@stashbox/shared'

import TranscribeBookmarkJob from '#jobs/transcribe_bookmark_job'
import Bookmark from '#models/bookmark'
import { authHeader } from '#tests/helpers/api_key'

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

test.group('POST /bookmarks', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('creates a bookmark from a URL and returns 201', async ({ client, assert }) => {
    const response = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://Example.com/article?utm_source=foo' })

    response.assertStatus(201)

    const body = response.body()
    const expectedUrl = normalizeUrl('https://Example.com/article?utm_source=foo')
    const expectedHash = hashUrl(expectedUrl)

    assert.match(body.id, /^[0-9a-f-]{36}$/)
    assert.equal(body.url, expectedUrl)
    assert.equal(body.urlHash, expectedHash)
    assert.equal(body.enrichmentStatus, 'pending')
    assert.equal(body.isMedia, false)
    assert.equal(body.transcriptionStatus, 'none')
    assert.equal(body.savedCount, 1)
  })

  test('stores one client capture for extension saves', async ({ client, assert }) => {
    const response = await client
      .post('/bookmarks')
      .headers(auth)
      .json({
        url: 'https://example.com/captured',
        sharedFrom: 'chrome-extension',
        capture: { dataUrl: pngDataUrl, width: 1280, height: 720 },
      })

    response.assertStatus(201)
    const body = response.body()
    assert.equal(body.capture.source, 'client')
    assert.equal(body.capture.mimeType, 'image/png')
    assert.equal(body.capture.width, 1280)
    assert.equal(body.capture.height, 720)
    assert.isAbove(body.capture.byteSize, 0)

    const capturePath = new URL(body.capture.url).pathname
    const image = await client.get(capturePath)
    image.assertStatus(200)
    assert.include(String(image.header('content-type')), 'image/png')
  })

  test('keeps the original capture on dedupe collisions', async ({ client, assert }) => {
    const first = await client
      .post('/bookmarks')
      .headers(auth)
      .json({
        url: 'https://example.com/dedupe-capture?utm_source=one',
        capture: { dataUrl: pngDataUrl, width: 100, height: 100 },
      })
    first.assertStatus(201)

    const second = await client
      .post('/bookmarks')
      .headers(auth)
      .json({
        url: 'https://www.example.com/dedupe-capture/',
        capture: { dataUrl: pngDataUrl, width: 999, height: 999 },
      })

    second.assertStatus(409)
    assert.equal(second.body().id, first.body().id)
    assert.equal(second.body().capture.width, 100)
    assert.equal(second.body().capture.height, 100)
  })

  test('marks allowlisted media for transcription without blocking save', async ({
    client,
    assert,
  }) => {
    const media = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://www.youtube.com/watch?v=abc123' })
    media.assertStatus(201)
    assert.equal(media.body().isMedia, true)
    assert.equal(media.body().mediaKind, 'video')
    assert.equal(media.body().mediaProvider, 'youtube')
    assert.equal(media.body().transcriptionStatus, 'pending')
    assert.equal(media.body().enrichmentStatus, 'pending')

    const article = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/article-media-test' })
    article.assertStatus(201)
    assert.equal(article.body().isMedia, false)
    assert.equal(article.body().transcriptionStatus, 'none')
  })

  test('transcription failure does not fail enrichment', async ({ assert }) => {
    const url = 'https://youtu.be/failure-isolated'
    const bookmark = await Bookmark.create({
      id: randomUUID(),
      url,
      urlHash: hashUrl(url),
      type: 'other',
      title: '',
      description: '',
      tags: [],
      ogImage: null,
      embedData: null,
      isMedia: true,
      mediaKind: 'video',
      mediaProvider: 'youtube',
      enrichmentStatus: 'done',
      enrichmentError: null,
      enrichmentFailureReason: null,
      enrichmentAttempts: 0,
      enrichedAt: null,
      embeddingSourceText: null,
      transcriptionStatus: 'pending',
      transcriptionError: null,
      transcriptionText: null,
      transcribedAt: null,
      savedCount: 1,
      savedFrom: [],
    })

    await TranscribeBookmarkJob.markFailed(bookmark, 'provider unavailable')
    await bookmark.refresh()

    assert.equal(bookmark.transcriptionStatus, 'failed')
    assert.equal(bookmark.transcriptionError, 'provider unavailable')
    assert.equal(bookmark.enrichmentStatus, 'done')
  })

  test('returns 422 when url is missing or invalid', async ({ client }) => {
    const missing = await client.post('/bookmarks').headers(auth).json({})
    missing.assertStatus(422)

    const invalid = await client.post('/bookmarks').headers(auth).json({ url: 'not-a-url' })
    invalid.assertStatus(422)
  })

  test('returns 409 with the existing bookmark on urlHash collision', async ({
    client,
    assert,
  }) => {
    const first = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/article?utm_source=foo' })
    first.assertStatus(201)
    const firstId = first.body().id

    const second = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://www.example.com/article/' })

    second.assertStatus(409)
    assert.equal(second.body().id, firstId)
    assert.equal(second.body().urlHash, first.body().urlHash)
  })
})

test.group('GET /bookmarks/:id', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('returns 200 with the bookmark', async ({ client, assert }) => {
    const created = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/foo' })
    const id = created.body().id

    const response = await client.get(`/bookmarks/${id}`).headers(auth)

    response.assertStatus(200)
    assert.equal(response.body().id, id)
    assert.equal(response.body().url, 'https://example.com/foo')
  })

  test('returns 404 when bookmark is missing', async ({ client }) => {
    const response = await client
      .get('/bookmarks/00000000-0000-0000-0000-000000000000')
      .headers(auth)
    response.assertStatus(404)
  })
})

test.group('DELETE /bookmarks/:id', (group) => {
  let auth: { Authorization: string }
  group.each.setup(async () => {
    auth = await authHeader()
  })

  test('hard-deletes and returns 204', async ({ client }) => {
    const created = await client
      .post('/bookmarks')
      .headers(auth)
      .json({ url: 'https://example.com/bye' })
    const id = created.body().id

    const del = await client.delete(`/bookmarks/${id}`).headers(auth)
    del.assertStatus(204)

    const after = await client.get(`/bookmarks/${id}`).headers(auth)
    after.assertStatus(404)
  })

  test('returns 404 when deleting a missing bookmark', async ({ client }) => {
    const del = await client.delete('/bookmarks/00000000-0000-0000-0000-000000000000').headers(auth)
    del.assertStatus(404)
  })
})
