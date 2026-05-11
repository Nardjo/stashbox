import type { StashboxClient } from "@stashbox/api-client";
import type { SiteCredentialCookie, SiteCredentialMetadata } from "@stashbox/shared";

export async function syncCurrentSiteCredentials(
  client: StashboxClient,
): Promise<SiteCredentialMetadata> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const siteUrl = getHttpSiteUrl(tab?.url);
  const cookiesApi = getCookiesApi();

  const cookies = await cookiesApi.getAll({ url: siteUrl.toString() });

  return client.syncSiteCredentials({
    domain: siteUrl.hostname,
    cookies: cookies.map(toSiteCredentialCookie),
  });
}

function getCookiesApi(): typeof chrome.cookies {
  const cookiesApi = (chrome as { cookies?: typeof chrome.cookies }).cookies;
  if (cookiesApi?.getAll) return cookiesApi;

  const permissions = chrome.runtime.getManifest().permissions ?? [];
  const hasCookiePermission = permissions.includes("cookies");
  const reason = hasCookiePermission
    ? "Rechargez l'extension depuis chrome://extensions pour activer la permission cookies."
    : "La permission cookies est absente du manifest de l'extension.";

  throw new Error(`Impossible de lire les cookies. ${reason}`);
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
