import type { Bookmark } from "@stashbox/shared";
import { useCallback, useState } from "react";

type SaveFlowState = "idle" | "saving" | "saved" | "already-saved" | "failed";

interface SaveFlowOptions {
  save: () => Promise<Bookmark>;
  poll: (id: string) => Promise<Bookmark>;
}

interface SaveFlowResult {
  state: SaveFlowState;
  bookmark: Bookmark | null;
  error: string | null;
  trigger: () => Promise<void>;
}

interface ConflictError extends Error {
  status: 409;
  bookmark: Bookmark;
}

function isConflictError(err: unknown): err is ConflictError {
  return err instanceof Error && (err as ConflictError).status === 409;
}

export function useSaveFlow({ save, poll }: SaveFlowOptions): SaveFlowResult {
  const [state, setState] = useState<SaveFlowState>("idle");
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(async () => {
    setState("saving");
    setError(null);
    setBookmark(null);

    let created: Bookmark;
    try {
      created = await save();
    } catch (err) {
      if (isConflictError(err)) {
        setBookmark(err.bookmark);
        setState("already-saved");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("failed");
      }
      return;
    }

    setBookmark(created);
    setState("saved");

    try {
      const finished = await poll(created.id);
      setBookmark(finished);
    } catch {
      // Polling timed out — keep current bookmark, enrichment still in progress server-side
    }
  }, [save, poll]);

  return { state, bookmark, error, trigger };
}
