import type { EmbeddingModelV3 } from '@ai-sdk/provider'
import type { EmbeddingModel } from 'ai'

import env from '#start/env'

export type SupportedEmbeddingProvider = 'openai' | 'openrouter'

export default class EmbeddingProvider {
  async getModel(): Promise<EmbeddingModel> {
    const provider = env.get('STASHBOX_EMBEDDING_PROVIDER') as
      | SupportedEmbeddingProvider
      | undefined
    const modelId = env.get('STASHBOX_EMBEDDING_MODEL')
    const apiKey = env.get('STASHBOX_EMBEDDING_API_KEY')

    if (!provider) throw new Error('STASHBOX_EMBEDDING_PROVIDER not configured')
    if (!modelId) throw new Error('STASHBOX_EMBEDDING_MODEL not configured')
    if (!apiKey) throw new Error('STASHBOX_EMBEDDING_API_KEY not configured')

    return resolveEmbeddingModel(provider, modelId, apiKey)
  }
}

export async function resolveEmbeddingModel(
  provider: SupportedEmbeddingProvider,
  modelId: string,
  apiKey: string
): Promise<EmbeddingModelV3> {
  switch (provider) {
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      return createOpenAI({ apiKey }).embedding(modelId)
    }
    case 'openrouter': {
      const { createOpenRouter } = await import('@openrouter/ai-sdk-provider')
      return createOpenRouter({ apiKey }).textEmbeddingModel(modelId)
    }
  }
}
