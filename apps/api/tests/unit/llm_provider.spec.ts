import { test } from '@japa/runner'

import { resolveModel } from '#services/llm_provider'

test.group('LlmProvider.resolveModel', () => {
  test('resolves anthropic provider', async ({ assert }) => {
    const m = await resolveModel('anthropic', 'claude-sonnet-4-5', 'test-key')
    assert.equal(m.provider, 'anthropic.messages')
  })

  test('resolves openai provider', async ({ assert }) => {
    const m = await resolveModel('openai', 'gpt-4o-mini', 'test-key')
    assert.match(m.provider, /openai/)
  })

  test('resolves google provider', async ({ assert }) => {
    const m = await resolveModel('google', 'gemini-1.5-flash', 'test-key')
    assert.match(m.provider, /google/)
  })

  test('resolves openrouter provider', async ({ assert }) => {
    const m = await resolveModel('openrouter', 'anthropic/claude-3.5-sonnet', 'test-key')
    assert.match(m.provider, /openrouter/)
  })
})
