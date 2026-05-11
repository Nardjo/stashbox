import type { SiteCredentialCookie } from '@stashbox/shared'

import SiteCredential from '#models/site_credential'
import type { ServerCaptureCookie } from '#services/server_capture_provider'
import { decryptSiteCredentialCookies } from '#services/site_credentials_encryption'

export async function loadServerCaptureCookies(url: string): Promise<ServerCaptureCookie[]> {
  const targetUrl = new URL(url)
  const host = targetUrl.hostname.toLowerCase()
  const credentials = (
    await SiteCredential.query().whereIn('domain', credentialDomainCandidates(host))
  ).sort((a, b) => b.domain.length - a.domain.length)

  if (!credentials.length) return []

  return credentials.flatMap((siteCredential) => {
    let cookies: SiteCredentialCookie[]
    try {
      cookies = decryptSiteCredentialCookies(siteCredential.domain, siteCredential.encryptedCookies)
    } catch {
      return []
    }

    return cookies
      .filter((cookie) => cookieAppliesToUrl(cookie, targetUrl))
      .map(toServerCaptureCookie)
  })
}

function credentialDomainCandidates(host: string): string[] {
  const parts = host.split('.').filter(Boolean)

  return parts.map((_, index) => parts.slice(index).join('.'))
}

function cookieAppliesToUrl(cookie: SiteCredentialCookie, targetUrl: URL): boolean {
  const host = targetUrl.hostname.toLowerCase()
  const cookieDomain = cookie.domain.replace(/^\./, '').toLowerCase()

  if (cookie.secure && targetUrl.protocol !== 'https:') return false
  if (cookie.hostOnly && host !== cookieDomain) return false
  if (!cookie.hostOnly && host !== cookieDomain && !host.endsWith(`.${cookieDomain}`)) return false

  return targetUrl.pathname.startsWith(cookie.path || '/')
}

function toServerCaptureCookie(cookie: SiteCredentialCookie): ServerCaptureCookie {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || '/',
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    ...(cookie.session || !cookie.expirationDate ? {} : { expires: cookie.expirationDate }),
    ...sameSiteCookieOption(cookie),
  }
}

function sameSiteCookieOption(cookie: SiteCredentialCookie): Pick<ServerCaptureCookie, 'sameSite'> {
  if (cookie.sameSite === 'strict') return { sameSite: 'Strict' }
  if (cookie.sameSite === 'lax') return { sameSite: 'Lax' }
  if (cookie.sameSite === 'no_restriction') return { sameSite: 'None' }

  return {}
}
