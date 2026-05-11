import type { StashboxClient } from "@stashbox/api-client";
import type { SiteCredentialCookie, SiteCredentialMetadata } from "@stashbox/shared";

export async function syncCurrentSiteCredentials(
  client: StashboxClient,
): Promise<SiteCredentialMetadata> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const siteUrl = getHttpSiteUrl(tab?.url);

  const cookies = await chrome.cookies.getAll({ url: siteUrl.toString() });

  return client.syncSiteCredentials({
    domain: siteUrl.hostname,
    cookies: cookies.map(toSiteCredentialCookie),
  });
}

function getHttpSiteUrl(value: string | undefined): URL {
  if (!value) throw new Error("No active tab URL");

  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Site credentials require an HTTP or HTTPS page");
  }

  return new URL(`${url.protocol}//${url.host}/`);
}

function toSiteCredentialCookie(cookie: chrome.cookies.Cookie): SiteCredentialCookie {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite ?? null,
    expirationDate: cookie.expirationDate ?? null,
    session: cookie.session,
    hostOnly: cookie.hostOnly,
  };
}
