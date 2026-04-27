// Curated tracking-param list. CONTEXT.md mandates eventual swap to a maintained
// ClearURLs-rules lib; this hand-rolled set covers the dominant offenders so v1
// dedupe stays accurate today.
const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "msclkid",
  "dclid",
  "yclid",
  "twclid",
  "igshid",
  "mc_eid",
  "mc_cid",
  "mkt_tok",
  "ref",
  "ref_src",
  "ref_url",
  "source",
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "_openstat",
  "vero_id",
  "vero_conv",
  "oly_anon_id",
  "oly_enc_id",
  "ck_subscriber_id",
  "rb_clickid",
  "s_cid",
  "wickedid",
  "zanpid",
  "icid",
  "ICID",
  "soc_src",
  "soc_trk",
  "spm",
  "trk",
]);

const TRACKING_PREFIXES = ["utm_", "mtm_", "pk_", "otm_", "hsa_", "hsCtaTracking"];

function isTrackingParam(key: string): boolean {
  if (TRACKING_PARAMS.has(key)) return true;
  return TRACKING_PREFIXES.some((p) => key.startsWith(p));
}

function normalizeQuery(u: URL): void {
  const params = [...u.searchParams.entries()].filter(([k]) => !isTrackingParam(k));
  params.sort(([a], [b]) => a.localeCompare(b));
  const sp = new URLSearchParams();
  for (const [k, v] of params) sp.append(k, v);
  u.search = sp.toString();
}

const HOST_PREFIXES = ["www.", "m.", "mobile."];

function stripHostPrefixes(host: string): string {
  for (const prefix of HOST_PREFIXES) {
    if (host.startsWith(prefix)) return host.slice(prefix.length);
  }
  return host;
}

const INDEX_FILES = ["index.html", "index.php", "index.htm"];

function normalizePath(path: string): string {
  let p = path;
  const indexFile = INDEX_FILES.find((idx) => p.endsWith(`/${idx}`));
  if (indexFile) p = p.slice(0, -(indexFile.length));
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function applyHostAliases(u: URL): void {
  if (u.hostname === "twitter.com") u.hostname = "x.com";
  else if (u.hostname === "youtu.be") {
    const id = u.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    u.hostname = "youtube.com";
    u.pathname = "/watch";
    if (id) u.searchParams.set("v", id);
  }
}

export function normalizeUrl(input: string): string {
  const u = new URL(input);
  if (u.protocol === "http:") u.protocol = "https:";
  u.hostname = stripHostPrefixes(u.hostname.toLowerCase());
  applyHostAliases(u);
  u.pathname = normalizePath(u.pathname);
  normalizeQuery(u);
  // Strip fragment unless it encodes a SPA route (e.g. `#/dashboard/123`).
  if (!u.hash.startsWith("#/")) u.hash = "";
  return u.toString();
}
