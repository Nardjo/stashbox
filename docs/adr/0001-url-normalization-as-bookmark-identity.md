# URL normalization as Bookmark identity

The **URL hash** (SHA-256 of the **Normalized URL**) is the immutable uniqueness key of a **Bookmark**. Once data exists in the table, the normalization rules cannot change without rehashing every row — which would silently merge or fork **Bookmarks**. We are committing the rules up front, in `CONTEXT.md § URL identity & dedupe`, and freezing them.

## Decision

Normalization is **client-agnostic and synchronous at save time**. No HTTP redirect-following before hashing; no probing for canonical URLs. Specific rules: force `https://`, lowercase host, strip `www.` and `m.`/`mobile.` prefixes, apply a small hardcoded alias table (`twitter.com → x.com`, `youtu.be/<id> → youtube.com/watch?v=<id>`), strip default ports, strip default index files, strip trailing slash, **keep path case** (many sites are case-sensitive), strip tracking params via the maintained ClearURLs ruleset, sort remaining params alphabetically, drop fragments **except** when they begin with `/` (legacy SPA fragment-as-route).

## Considered alternatives

- **Follow redirects at save time** to discover the canonical URL. Rejected: breaks the "instant 201" guarantee promised by the async **Pipeline** model, and adds a network failure surface to the synchronous save path. All resolution work belongs in the **Pipeline**.
- **Per-domain query allowlist** instead of a global tracking-param strip list. Rejected for v1: maintenance cost outweighs the precision gain. ClearURLs is good enough.
- **Lowercasing the path**. Rejected: GitHub, S3, and many CMSes are case-sensitive — lowercasing would silently merge distinct resources.

## Consequences

- The hash is stable enough that two clients (Shortcut + Extension) saving "the same" URL with different casings, `www.`, or trailing slashes will dedupe correctly.
- Adding a new alias to the canonical table later (e.g. `vxtwitter.com → x.com`) does **not** retroactively merge existing **Bookmarks** that were saved under the old form. Such migrations require an explicit one-shot `node ace url:rehash --from … --to …` operation, accepted as a **Owner**-initiated cost.
- Following redirects is a v1.x candidate behind a flag (`STASHBOX_FOLLOW_REDIRECTS_AT_SAVE=true`) if the **Owner** is willing to trade save latency for fewer near-duplicates.
