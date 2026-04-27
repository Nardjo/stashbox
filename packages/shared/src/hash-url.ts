import { sha256 } from "js-sha256";

import { normalizeUrl } from "./normalize-url.js";

export function hashUrl(input: string): string {
  return sha256(normalizeUrl(input));
}
