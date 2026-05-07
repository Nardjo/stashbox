import { type FormEvent, useId, useState } from "react";

import { Button } from "~/components/ui/button.tsx";

type AddBookmarkCardProps = {
  onSaveBookmark: (url: string) => Promise<void>;
};

export function AddBookmarkCard({ onSaveBookmark }: AddBookmarkCardProps) {
  const errorId = useId();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextUrl = url.trim();
    if (!isHttpUrl(nextUrl)) {
      setError("Saisissez une URL valide.");
      return;
    }

    setError(undefined);
    setIsSaving(true);
    try {
      await onSaveBookmark(nextUrl);
      setUrl("");
    } catch {
      setError("Impossible de sauvegarder le Bookmark.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      aria-label="Sauvegarder un Bookmark"
      className="flex min-h-full flex-col justify-between rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Sauvegarder un Bookmark</p>
          <p className="mt-1 text-sm text-slate-500">
            Collez une URL pour lancer l'enrichissement.
          </p>
        </div>
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>URL du Bookmark</span>
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            disabled={isSaving}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/article"
            type="url"
            value={url}
          />
        </label>
        {error ? (
          <p id={errorId} role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
      <Button className="mt-4 w-full" disabled={isSaving} type="submit">
        {isSaving ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </form>
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
