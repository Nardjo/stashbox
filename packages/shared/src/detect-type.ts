import type { BookmarkType } from "./schemas.js";

const TWEET_HOST = /(^|\.)(twitter\.com|x\.com)$/i;
const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtu\.be)$/i;
const PDF_PATH = /\.pdf$/i;
const IMAGE_PATH = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

export function detectType(input: string): BookmarkType {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "other";
  }
  const host = url.hostname.toLowerCase();
  if (TWEET_HOST.test(host)) return "tweet";
  if (YOUTUBE_HOST.test(host)) return "youtube";
  if (PDF_PATH.test(url.pathname)) return "pdf";
  if (IMAGE_PATH.test(url.pathname)) return "image";
  return "other";
}
