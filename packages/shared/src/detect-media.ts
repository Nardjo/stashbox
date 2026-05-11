import type { MediaKind, MediaProvider } from "./schemas.js";

export type MediaDetection =
  | {
      isMedia: true;
      mediaKind: MediaKind;
      mediaProvider: MediaProvider;
    }
  | {
      isMedia: false;
      mediaKind: null;
      mediaProvider: null;
    };

type MediaRule = {
  provider: MediaProvider;
  kind: MediaKind;
  matches: (url: URL) => boolean;
};

const NO_MEDIA: MediaDetection = {
  isMedia: false,
  mediaKind: null,
  mediaProvider: null,
};

const MEDIA_RULES: MediaRule[] = [
  {
    provider: "youtube",
    kind: "video",
    matches: (url) =>
      isHost(url, "youtube.com") &&
      (url.pathname === "/watch" ||
        url.pathname.startsWith("/shorts/") ||
        url.pathname.startsWith("/live/") ||
        url.pathname.startsWith("/embed/")),
  },
  {
    provider: "youtube",
    kind: "video",
    matches: (url) => isExactHost(url, "youtu.be") && url.pathname.length > 1,
  },
  {
    provider: "vimeo",
    kind: "video",
    matches: (url) =>
      (isExactHost(url, "vimeo.com") && /^\/\d+/.test(url.pathname)) ||
      (isExactHost(url, "player.vimeo.com") && /^\/video\/\d+/.test(url.pathname)),
  },
  {
    provider: "soundcloud",
    kind: "audio",
    matches: (url) => {
      if (!isHost(url, "soundcloud.com")) return false;
      const parts = url.pathname.split("/").filter(Boolean);
      return parts.length >= 2 && parts[0] !== "discover" && parts[0] !== "search";
    },
  },
  {
    provider: "spotify",
    kind: "audio",
    matches: (url) => isExactHost(url, "open.spotify.com") && url.pathname.startsWith("/episode/"),
  },
];

export function detectMedia(input: string): MediaDetection {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return NO_MEDIA;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return NO_MEDIA;

  const rule = MEDIA_RULES.find((candidate) => candidate.matches(url));
  if (!rule) return NO_MEDIA;

  return {
    isMedia: true,
    mediaKind: rule.kind,
    mediaProvider: rule.provider,
  };
}

function isHost(url: URL, baseHost: string): boolean {
  return isExactHost(url, baseHost) || url.hostname.toLowerCase().endsWith(`.${baseHost}`);
}

function isExactHost(url: URL, host: string): boolean {
  return url.hostname.toLowerCase() === host;
}
