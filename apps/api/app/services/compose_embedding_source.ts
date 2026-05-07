import type { BookmarkType } from '@stashbox/shared'

export interface ComposeEmbeddingSourceInput {
  title: string
  type: BookmarkType
  tags: string[]
  description: string
  content: string
}

// Char-based proxy for ~2000 tokens (≈4 chars/token). No real tokenizer to keep
// the dependency surface minimal; cap is conservative against the 8191-token
// limit of text-embedding-3-small.
const EXCERPT_CHAR_CAP = 8000

export function composeEmbeddingSource(input: ComposeEmbeddingSourceInput): string {
  const { title, type, tags, description, content } = input
  const excerpt = content.length > EXCERPT_CHAR_CAP ? content.slice(0, EXCERPT_CHAR_CAP) : content

  return [
    `Title: ${title}`,
    `Type: ${type}`,
    `Tags: ${tags.join(', ')}`,
    `Summary: ${description}`,
    `Content excerpt:\n${excerpt}`,
  ].join('\n')
}
