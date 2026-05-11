const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export function getYouTubeThumbnailUrl(input: string): string | null {
  const videoId = getYouTubeVideoId(input)
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null
}

function getYouTubeVideoId(input: string): string | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  if (host === 'youtu.be') {
    return pickValidId(url.pathname.split('/').filter(Boolean)[0])
  }

  if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return null

  if (url.pathname === '/watch') {
    return pickValidId(url.searchParams.get('v'))
  }

  const [section, id] = url.pathname.split('/').filter(Boolean)
  if (section === 'shorts' || section === 'embed' || section === 'live') {
    return pickValidId(id)
  }

  return null
}

function pickValidId(value: string | null | undefined): string | null {
  if (!value) return null
  return YOUTUBE_ID_PATTERN.test(value) ? value : null
}
