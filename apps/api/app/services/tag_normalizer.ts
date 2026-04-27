export function normalizeTag(input: string): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cleaned) return ''

  return cleaned.split('-').filter(Boolean).map(singularize).join('-')
}

export function normalizeTags(tags: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const t of tags) {
    const n = normalizeTag(t)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

const UNCOUNTABLE = new Set([
  'news',
  'series',
  'species',
  'media',
  'data',
  'css',
  'rss',
  'js',
  'ios',
  'macos',
  'aws',
  'gcp',
  'devops',
  'ops',
  'kubernetes',
  'javascript',
  'typescript',
  'docs',
])

function singularize(word: string): string {
  if (word.length <= 3) return word
  if (UNCOUNTABLE.has(word)) return word
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y'
  if (word.endsWith('sses')) return word.slice(0, -2)
  if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('xes')) {
    return word.slice(0, -2)
  }
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}
