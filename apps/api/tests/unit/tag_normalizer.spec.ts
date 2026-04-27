import { test } from '@japa/runner'

import { normalizeTag, normalizeTags } from '#services/tag_normalizer'

test.group('normalizeTag', () => {
  test('lowercases and kebab-cases', ({ assert }) => {
    assert.equal(normalizeTag('Web Development'), 'web-development')
  })

  test('strips punctuation and trims', ({ assert }) => {
    assert.equal(normalizeTag('  Hello, World!  '), 'hello-world')
  })

  test('singularizes simple plurals', ({ assert }) => {
    assert.equal(normalizeTag('Articles'), 'article')
    assert.equal(normalizeTag('Companies'), 'company')
    assert.equal(normalizeTag('Tags'), 'tag')
  })

  test('keeps uncountable words intact', ({ assert }) => {
    assert.equal(normalizeTag('News'), 'news')
    assert.equal(normalizeTag('JavaScript'), 'javascript')
    assert.equal(normalizeTag('CSS'), 'css')
  })

  test('collapses whitespace and underscores', ({ assert }) => {
    assert.equal(normalizeTag('foo__bar  baz'), 'foo-bar-baz')
  })

  test('normalizeTags dedupes and drops empties', ({ assert }) => {
    assert.deepEqual(normalizeTags(['Articles', 'article', '', '  ', 'News']), ['article', 'news'])
  })
})
