import { test } from '@japa/runner'

import { composeEmbeddingSource } from '#services/compose_embedding_source'

test.group('composeEmbeddingSource', () => {
  test('builds Title / Type / Tags / Summary / Content excerpt layout', ({ assert }) => {
    const text = composeEmbeddingSource({
      title: 'Why Kubernetes Won',
      type: 'article',
      tags: ['kubernetes', 'devops'],
      description: 'A short take on container orchestration history.',
      content: 'Kubernetes won because it was open and ubiquitous.',
    })

    assert.match(text, /^Title: Why Kubernetes Won$/m)
    assert.match(text, /^Type: article$/m)
    assert.match(text, /^Tags: kubernetes, devops$/m)
    assert.match(text, /^Summary: A short take on container orchestration history\.$/m)
    assert.include(text, 'Content excerpt:')
    assert.include(text, 'Kubernetes won because it was open and ubiquitous.')

    const titleIdx = text.indexOf('Title:')
    const typeIdx = text.indexOf('Type:')
    const tagsIdx = text.indexOf('Tags:')
    const summaryIdx = text.indexOf('Summary:')
    const excerptIdx = text.indexOf('Content excerpt:')
    assert.isTrue(titleIdx < typeIdx)
    assert.isTrue(typeIdx < tagsIdx)
    assert.isTrue(tagsIdx < summaryIdx)
    assert.isTrue(summaryIdx < excerptIdx)
  })

  test('truncates content excerpt to ~2000 token cap (≈8000 chars)', ({ assert }) => {
    const longContent = 'x'.repeat(20000)
    const text = composeEmbeddingSource({
      title: 't',
      type: 'article',
      tags: [],
      description: 'd',
      content: longContent,
    })

    const excerpt = text.slice(text.indexOf('Content excerpt:\n') + 'Content excerpt:\n'.length)
    assert.isAtMost(excerpt.length, 8000)
    assert.isAbove(excerpt.length, 7000)
  })
})
