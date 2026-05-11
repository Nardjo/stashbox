import { describe, expect, it } from "vitest";

import { getYouTubeThumbnailUrl, getYouTubeVideoId } from "../src/youtube.js";

describe("YouTube URL helpers", () => {
  it.each([
    ["https://youtube.com/watch?t=494s&v=0AlrHPbhNdI", "0AlrHPbhNdI"],
    ["https://www.youtube.com/watch?v=0AlrHPbhNdI&t=494s", "0AlrHPbhNdI"],
    ["https://youtu.be/0AlrHPbhNdI?t=494", "0AlrHPbhNdI"],
    ["https://youtube.com/shorts/0AlrHPbhNdI", "0AlrHPbhNdI"],
    ["https://youtube.com/embed/0AlrHPbhNdI", "0AlrHPbhNdI"],
    ["https://youtube.com/live/0AlrHPbhNdI", "0AlrHPbhNdI"],
  ])("extracts the video id from %s", (url, expected) => {
    expect(getYouTubeVideoId(url)).toBe(expected);
  });

  it("builds the canonical YouTube thumbnail URL", () => {
    expect(getYouTubeThumbnailUrl("https://youtube.com/watch?v=0AlrHPbhNdI")).toBe(
      "https://i.ytimg.com/vi/0AlrHPbhNdI/hqdefault.jpg",
    );
  });

  it.each([
    "https://youtube.com.evil.example/watch?v=0AlrHPbhNdI",
    "https://youtube.com/watch?v=short",
    "https://example.com/watch?v=0AlrHPbhNdI",
    "not a url",
  ])("returns null for non-YouTube video URL %s", (url) => {
    expect(getYouTubeVideoId(url)).toBeNull();
    expect(getYouTubeThumbnailUrl(url)).toBeNull();
  });
});
