import { embed, type EmbeddingModel } from 'ai'

export interface EmbedBookmarkSourceInput {
  sourceText: string
  model: EmbeddingModel
}

export async function embedBookmarkSource(input: EmbedBookmarkSourceInput): Promise<number[]> {
  const { embedding } = await embed({
    model: input.model,
    value: input.sourceText,
  })
  return embedding
}
