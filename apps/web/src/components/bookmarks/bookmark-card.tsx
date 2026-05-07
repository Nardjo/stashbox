import type { Bookmark } from "@stashbox/shared";

type BookmarkCardProps = {
  bookmark: Bookmark;
};

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const domain = getDomain(bookmark.url);

  return (
    <article
      aria-label={bookmark.title}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="aspect-[16/10] bg-slate-100">
        {bookmark.ogImage ? (
          <img className="h-full w-full object-cover" src={bookmark.ogImage} alt="" />
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{domain}</span>
          <span className="rounded-full bg-slate-900 px-2 py-1 text-white">{bookmark.type}</span>
        </div>
        <h2 className="text-base font-semibold text-slate-950">{bookmark.title}</h2>
        <div className="flex flex-wrap gap-2">
          {bookmark.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function getDomain(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}
