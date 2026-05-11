import { describe, expect, it } from "vitest";

import { detectMedia } from "../src/detect-media.js";
import { detectType } from "../src/detect-type.js";

describe("detectMedia", () => {
  it.each([
    ["https://youtube.com/watch?v=abc", "video", "youtube"],
    ["https://www.youtube.com/shorts/abc", "video", "youtube"],
    ["https://youtu.be/abc", "video", "youtube"],
    ["https://vimeo.com/123456", "video", "vimeo"],
    ["https://player.vimeo.com/video/123456", "video", "vimeo"],
    ["https://soundcloud.com/artist/track", "audio", "soundcloud"],
    ["https://open.spotify.com/episode/abc123", "audio", "spotify"],
  ] as const)("detects allowlisted media from %s", (url, mediaKind, mediaProvider) => {
    expect(detectMedia(url)).toEqual({
      isMedia: true,
      mediaKind,
      mediaProvider,
    });
  });

  it("stays separate from type detection", () => {
    const url = "https://vimeo.com/123456";

    expect(detectType(url)).toBe("other");
    expect(detectMedia(url)).toMatchObject({ isMedia: true, mediaProvider: "vimeo" });
  });

  it.each([
    "https://example.com/article",
    "https://cdn.example.com/video.mp4",
    "https://youtube.com.evil.example/watch?v=abc",
    "https://open.spotify.com/track/abc123",
    "ftp://youtube.com/watch?v=abc",
    "not a url",
  ])("returns no media for non-allowlisted URL %s", (url) => {
    expect(detectMedia(url)).toEqual({
      isMedia: false,
      mediaKind: null,
      mediaProvider: null,
    });
  });
});
