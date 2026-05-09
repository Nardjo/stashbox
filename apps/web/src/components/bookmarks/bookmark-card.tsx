import type { Bookmark } from "@stashbox/shared";
import { useState } from "react";

type BookmarkCardProps = {
  bookmark: Bookmark;
  onDeleteBookmark: (id: string) => Promise<void>;
};

export function BookmarkCard({ bookmark, onDeleteBookmark }: BookmarkCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const domain = getDomain(bookmark.url);
  const isLoading =
    bookmark.enrichmentStatus === "pending" || bookmark.enrichmentStatus === "enriching";

  return (
    <article
      aria-label={bookmark.title}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800">
        {isLoading ? (
          <div
            role="status"
            aria-label="Enrichissement en cours"
            className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800"
          >
            <span className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        ) : bookmark.enrichmentStatus === "failed" ? (
          <div
            role="img"
            aria-label={`Enrichissement échoué pour ${domain}`}
            className="flex h-full w-full items-center justify-center bg-rose-50 text-5xl font-semibold text-rose-500 dark:bg-rose-500/10 dark:text-rose-300"
          >
            !
          </div>
        ) : bookmark.ogImage ? (
          <img
            className="h-full w-full object-cover"
            src={bookmark.ogImage}
            alt={`Aperçu de ${bookmark.title}`}
          />
        ) : (
          <div
            role="img"
            aria-label={`Aperçu indisponible pour ${domain}`}
            className="flex h-full w-full items-center justify-center bg-slate-100 text-4xl font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
          >
            {domain.at(0)?.toUpperCase() ?? bookmark.type.at(0)?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="min-w-0 truncate">{domain}</span>
          <div className="flex items-center gap-2">
            {bookmark.enrichmentStatus !== "done" ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                {getStatusLabel(bookmark.enrichmentStatus)}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-900 px-2 py-1 text-white dark:bg-slate-100 dark:text-slate-950">
              {bookmark.type}
            </span>
          </div>
        </div>
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
          {bookmark.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          {bookmark.tags.map((tag) => (
            <span
              key={tag}
              className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
        <button
          type="button"
          aria-label={`Supprimer ${bookmark.title}`}
          onClick={() => setIsConfirmingDelete(true)}
          className="rounded-full border border-rose-200 px-3 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10"
        >
          Supprimer
        </button>
      </div>
      {isConfirmingDelete ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`delete-title-${bookmark.id}`}
          aria-describedby={`delete-description-${bookmark.id}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            <h3 id={`delete-title-${bookmark.id}`} className="text-lg font-semibold">
              Supprimer ce bookmark ?
            </h3>
            <p
              id={`delete-description-${bookmark.id}`}
              className="mt-2 text-sm text-slate-600 dark:text-slate-300"
            >
              Cette action retirera "{bookmark.title}" de votre grille.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteBookmark(bookmark.id);
                    setIsConfirmingDelete(false);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getStatusLabel(status: Bookmark["enrichmentStatus"]) {
  if (status === "degraded") return "Dégradé";
  if (status === "failed") return "Échec";
  return "En attente";
}
