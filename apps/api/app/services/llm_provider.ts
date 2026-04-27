import type { LanguageModelV3 } from '@ai-sdk/provider'
import type { LanguageModel } from 'ai'

import env from '#start/env'

export type SupportedProvider = 'anthropic' | 'openai' | 'google' | 'openrouter'

export default class LlmProvider {
  async getModel(): Promise<LanguageModel> {
    const provider = env.get('STASHIT_LLM_PROVIDER') as SupportedProvider | undefined
    const modelId = env.get('STASHIT_LLM_MODEL')
    const apiKey = env.get('STASHIT_LLM_API_KEY')

    if (!provider) throw new Error('STASHIT_LLM_PROVIDER not configured')
    if (!modelId) throw new Error('STASHIT_LLM_MODEL not configured')
    if (!apiKey) throw new Error('STASHIT_LLM_API_KEY not configured')

    return resolveModel(provider, modelId, apiKey)
  }
}

export async function resolveModel(
  provider: SupportedProvider,
  modelId: string,
  apiKey: string
): Promise<LanguageModelV3> {
  switch (provider) {
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      return createAnthropic({ apiKey })(modelId)
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      return createOpenAI({ apiKey })(modelId)
    }
    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
      return createGoogleGenerativeAI({ apiKey })(modelId)
    }
    case 'openrouter': {
      const { createOpenRouter } = await import('@openrouter/ai-sdk-provider')
      return createOpenRouter({ apiKey }).chat(modelId)
    }
  }
}
