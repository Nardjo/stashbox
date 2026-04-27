import { generateObject, type LanguageModel } from 'ai'
import { z } from 'zod'

import { normalizeTags } from '#services/tag_normalizer'

const BOOKMARK_TYPES = ['tweet', 'youtube', 'article', 'image', 'pdf', 'other'] as const

const enrichmentSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000),
  tags: z.array(z.string()).max(12),
  type: z.enum(BOOKMARK_TYPES),
})

export type EnrichmentResult = z.infer<typeof enrichmentSchema>

export interface EnrichBookmarkInput {
  content: string
  existingTags: string[]
  model: LanguageModel
}

export async function enrichBookmark(input: EnrichBookmarkInput): Promise<EnrichmentResult> {
  const { content, existingTags, model } = input

  const vocab = existingTags.length
    ? `Existing tag vocabulary (REUSE whenever a tag fits, only invent new ones if none of these apply):\n${existingTags.map((t) => `- ${t}`).join('\n')}`
    : 'No existing tag vocabulary yet. Choose 2-5 concise, lowercase, kebab-case tags.'

  const prompt = [
    'You enrich a saved bookmark from raw content.',
    'Produce: title (concise, faithful), description (1-2 sentences), tags (2-5), type.',
    vocab,
    '---',
    'Content:',
    content,
  ].join('\n\n')

  const { object } = await generateObject({
    model,
    schema: enrichmentSchema,
    prompt,
  })

  return {
    ...object,
    tags: normalizeTags(object.tags),
  }
}
