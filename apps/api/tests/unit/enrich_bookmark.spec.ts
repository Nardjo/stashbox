import { test } from '@japa/runner'

import { enrichBookmark } from '#services/enrich_bookmark'
import { mockModelCapturing, mockModelReturning } from '#tests/helpers/mock_llm'

test.group('enrichBookmark', () => {
  test('passes existing tag vocabulary into the prompt', async ({ assert }) => {
    let capturedPrompt = ''
    const model = mockModelCapturing(
      { title: 't', description: 'd', tags: ['kubernetes'], type: 'article' },
      (p) => {
        capturedPrompt = p
      }
    )

    await enrichBookmark({
      content: 'a piece on k8s',
      existingTags: ['kubernetes', 'devops', 'cloud'],
      model,
    })

    assert.include(capturedPrompt, 'kubernetes')
    assert.include(capturedPrompt, 'devops')
    assert.include(capturedPrompt, 'REUSE')
  })

  test('returns structured object parsed from LLM', async ({ assert }) => {
    const model = mockModelReturning({
      title: 'Why Kubernetes Won',
      description: 'A short take on container orchestration history.',
      tags: ['Kubernetes', 'DevOps'],
      type: 'article',
    })

    const result = await enrichBookmark({
      content: 'Kubernetes won because it was open and ubiquitous...',
      existingTags: [],
      model,
    })

    assert.equal(result.title, 'Why Kubernetes Won')
    assert.equal(result.description, 'A short take on container orchestration history.')
    assert.equal(result.type, 'article')
    assert.deepEqual(result.tags, ['kubernetes', 'devops'])
  })
})
