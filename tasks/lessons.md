# Lessons

- When exposing `pending` Bookmarks in the UI, verify the full enrichment path: API insert, Redis job, running worker, provider config, and final status transition. A visible `pending` state can reveal a missing worker, not a UI bug.
