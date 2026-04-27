import { MockEmbeddingModelV3 } from 'ai/test'

export function mockEmbeddingReturning(vector: number[]): MockEmbeddingModelV3 {
  return new MockEmbeddingModelV3({
    doEmbed: async () => ({
      embeddings: [vector],
      usage: { tokens: 10 },
      warnings: [],
    }),
  })
}

export function mockEmbeddingCapturing(
  vector: number[],
  capture: (value: string) => void
): MockEmbeddingModelV3 {
  return new MockEmbeddingModelV3({
    doEmbed: async ({ values }) => {
      if (values[0]) capture(values[0])
      return {
        embeddings: [vector],
        usage: { tokens: 10 },
        warnings: [],
      }
    },
  })
}
