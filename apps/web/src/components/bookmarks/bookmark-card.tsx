import type { Bookmark } from "@stashbox/shared";

type BookmarkCardProps = {
  bookmark: Bookmark;
};

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
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
      </div>
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
