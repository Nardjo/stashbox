# Single embedding space, explicit migration command

All **Bookmarks** share **one Embedding model and one vector dimension at any given time**. The `embedding` column is `vector(N)` for whichever `N` the active **Embedding provider** declares. Switching models — to a better 1536-dim provider, to `text-embedding-3-large` (3072), or to a local 768-dim model — is an explicit, **Owner**-initiated migration via `node ace embedding:migrate`, never a runtime swap.

## Decision

To make migration affordable, the **Pipeline** persists the exact text it embedded (`embeddingSourceText`, `Title / Type / Tags / Summary / Content excerpt`). Migration drops/recreates the `embedding` column at the new dimension, then re-embeds every `done` / `degraded` **Bookmark** from `embeddingSourceText` **without re-fetching**. This trades a one-shot column of stored text for a fast, deterministic, fetch-free migration that can't lose paywalled content along the way.

## Considered alternatives

- **Polymorphic schema (`vector(N)` chosen at boot time, frozen for life)**. Rejected: hides the migration question instead of answering it. The **Owner** doesn't realize at first boot that they are committing to a dimension forever.
- **Versioned embeddings cohabiting** (`embedding_v1`, `embedding_v2`, or a `bookmark_embeddings` join table). Rejected: introduces search-time choices ("query against v1 or v2?") that don't pay for themselves at single-user scale, and creates structural debt for a use case that should be rare.
- **No persisted source text; re-fetch at migration time**. Rejected: re-fetching may permanently lose content for paywalled or vanished URLs. The whole point of being able to migrate is to keep the corpus intact.

## Consequences

- Every `done` / `degraded` **Bookmark** carries an `embeddingSourceText` blob (~2–5 KB). At 100k **Bookmarks**, that's ~500 MB — acceptable.
- Migration is downtime-bearing for search: while the column is being repopulated, semantic search returns nothing or stale-dim results. Saves keep working — they queue with `pending` status and get embedded once migration completes.
- Importing a JSONL export with a different `embeddingModel`/`embeddingDim` than the running instance is **refused** rather than auto-migrated, by the same principle: re-embedding is always an explicit choice.
