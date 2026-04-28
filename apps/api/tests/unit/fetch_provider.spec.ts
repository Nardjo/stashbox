import { test } from '@japa/runner'
import nock from 'nock'

import FetchProvider from '#services/fetch_provider'

test.group('FetchProvider (Jina)', (group) => {
  group.each.setup(() => {
    nock.disableNetConnect()
    return () => {
      nock.cleanAll()
      nock.enableNetConnect()
    }
  })

  test('article: returns success with markdown content from Jina', async ({ assert }) => {
    nock('https://r.jina.ai')
      .get('/https://example.com/post')
      .reply(
        200,
        '# Hello\n\nThis is the article body, well over 100 chars to count as real content.\n\nMore paragraphs here that make the body substantial enough to qualify as a successful extraction.'
      )

    const provider = new FetchProvider()
    const outcome = await provider.fetchAndExtract('https://example.com/post', 'article')

    assert.equal(outcome.kind, 'success')
    if (outcome.kind === 'success') {
      assert.match(outcome.content, /# Hello/)
      assert.match(outcome.content, /article body/)
    }
  })

  test('article: empty/short Jina response → meta_only', async ({ assert }) => {
    nock('https://r.jina.ai').get('/https://thin.example.com/p').reply(200, '   ')
    const provider = new FetchProvider()
    const outcome = await provider.fetchAndExtract('https://thin.example.com/p', 'article')
    assert.equal(outcome.kind, 'meta_only')
    if (outcome.kind === 'meta_only') {
      assert.equal(outcome.reason, 'empty')
    }
  })

  test('article: 404 from Jina → dead with url_dead', async ({ assert }) => {
    nock('https://r.jina.ai').get('/https://gone.example.com/p').reply(404, 'not found')
    const provider = new FetchProvider()
    const outcome = await provider.fetchAndExtract('https://gone.example.com/p', 'article')
    assert.equal(outcome.kind, 'dead')
    if (outcome.kind === 'dead') {
      assert.equal(outcome.reason, 'url_dead')
    }
  })

  test('article: 403 → meta_only with reason=auth', async ({ assert }) => {
    nock('https://r.jina.ai').get('/https://paywall.example.com/p').reply(403, 'forbidden')
    const provider = new FetchProvider()
    const outcome = await provider.fetchAndExtract('https://paywall.example.com/p', 'article')
    assert.equal(outcome.kind, 'meta_only')
    if (outcome.kind === 'meta_only') {
      assert.equal(outcome.reason, 'auth')
    }
  })

  test('tweet: oEmbed → success with embedData', async ({ assert }) => {
    const oembedResponse = {
      url: 'https://x.com/foo/status/1',
      author_name: 'Foo',
      html: '<blockquote class="twitter-tweet"><p>Hello world</p></blockquote>',
      provider_name: 'X',
    }
    nock('https://publish.twitter.com').get('/oembed').query(true).reply(200, oembedResponse)

    const provider = new FetchProvider()
    const outcome = await provider.fetchAndExtract('https://x.com/foo/status/1', 'tweet')
    assert.equal(outcome.kind, 'success')
    if (outcome.kind === 'success') {
      assert.match(outcome.content, /Hello world/)
      assert.deepEqual(outcome.embedData, oembedResponse)
    }
  })

  test('youtube: oEmbed → success with embedData and ogImage thumbnail', async ({ assert }) => {
    const oembedResponse = {
      title: 'Some Video',
      author_name: 'Channel Name',
      thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    }
    nock('https://www.youtube.com').get('/oembed').query(true).reply(200, oembedResponse)

    const provider = new FetchProvider()
    const outcome = await provider.fetchAndExtract('https://www.youtube.com/watch?v=abc', 'youtube')
    assert.equal(outcome.kind, 'success')
    if (outcome.kind === 'success') {
      assert.include(outcome.content, 'Some Video')
      assert.equal(outcome.ogImage, 'https://i.ytimg.com/vi/abc/hqdefault.jpg')
      assert.deepEqual(outcome.embedData, oembedResponse)
    }
  })
})
