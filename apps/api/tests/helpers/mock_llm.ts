import type {
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3Usage,
} from '@ai-sdk/provider'
import { MockLanguageModelV3 } from 'ai/test'

const FINISH: LanguageModelV3FinishReason = { unified: 'stop', raw: 'stop' }

const USAGE: LanguageModelV3Usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
}

export function buildMockResult(text: string): LanguageModelV3GenerateResult {
  return {
    content: [{ type: 'text', text }],
    finishReason: FINISH,
    usage: USAGE,
    warnings: [],
  }
}

export function mockModelReturning(json: object): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => buildMockResult(JSON.stringify(json)),
  })
}

export function mockModelCapturing(
  json: object,
  capture: (prompt: string) => void
): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async (opts) => {
      const userMsg = opts.prompt.find((m) => m.role === 'user')
      if (userMsg && Array.isArray(userMsg.content)) {
        capture(userMsg.content.map((p) => (p.type === 'text' ? p.text : '')).join('\n'))
      }
      return buildMockResult(JSON.stringify(json))
    },
  })
}
