import type { BookmarkType } from '@stashit/shared'

import env from '#start/env'

export type FetchOutcome =
  | {
      kind: 'success'
      content: string
      ogImage?: string
      embedData?: unknown
    }
  | {
      kind: 'meta_only'
      ogTitle?: string
      ogDescription?: string
      ogImage?: string
      reason: 'empty' | 'paywall' | 'auth' | 'transient'
    }
  | {
      kind: 'dead'
      reason: 'url_dead' | 'malformed'
    }

const MIN_CONTENT_CHARS = 100
const FETCH_TIMEOUT_MS = 15_000

export default class FetchProvider {
  async fetchAndExtract(url: string, type: BookmarkType): Promise<FetchOutcome> {
    if (type === 'tweet') return fetchTweet(url)
    if (type === 'youtube') return fetchYouTube(url)
    return fetchViaJina(url)
  }
}

async function fetchViaJina(url: string): Promise<FetchOutcome> {
  const apiKey = env.get('STASHIT_FETCH_API_KEY')
  const headers: Record<string, string> = {
    'Accept': 'text/markdown',
    'User-Agent': 'stashit/1.0',
  }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  let res: Response
  try {
    res = await fetchWithTimeout(`https://r.jina.ai/${url}`, { headers }, FETCH_TIMEOUT_MS)
  } catch {
    return { kind: 'meta_only', reason: 'transient' }
  }

  if (res.status === 404 || res.status === 410) {
    return { kind: 'dead', reason: 'url_dead' }
  }
  if (res.status === 401 || res.status === 403 || res.status === 451) {
    return { kind: 'meta_only', reason: 'auth' }
  }
  if (!res.ok) {
    return { kind: 'meta_only', reason: 'transient' }
  }

  const body = (await res.text()).trim()
  if (body.length < MIN_CONTENT_CHARS) {
    return { kind: 'meta_only', reason: 'empty' }
  }

  return { kind: 'success', content: body }
}

async function fetchTweet(url: string): Promise<FetchOutcome> {
  const oembed = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1`
  try {
    const res = await fetchWithTimeout(oembed, {}, FETCH_TIMEOUT_MS)
    if (res.status === 404) return { kind: 'dead', reason: 'url_dead' }
    if (!res.ok) return { kind: 'meta_only', reason: 'transient' }
    const data = (await res.json()) as { html?: string; author_name?: string }
    const content = stripHtml(data.html ?? '')
    return { kind: 'success', content, embedData: data }
  } catch {
    return { kind: 'meta_only', reason: 'transient' }
  }
}

async function fetchYouTube(url: string): Promise<FetchOutcome> {
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  try {
    const res = await fetchWithTimeout(oembed, {}, FETCH_TIMEOUT_MS)
    if (res.status === 404) return { kind: 'dead', reason: 'url_dead' }
    if (!res.ok) return { kind: 'meta_only', reason: 'transient' }
    const data = (await res.json()) as {
      title?: string
      author_name?: string
      thumbnail_url?: string
    }
    const content = [data.title, data.author_name].filter(Boolean).join(' — ')
    return {
      kind: 'success',
      content,
      embedData: data,
      ogImage: data.thumbnail_url,
    }
  } catch {
    return { kind: 'meta_only', reason: 'transient' }
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
