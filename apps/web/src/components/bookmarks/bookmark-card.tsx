import type { Bookmark } from "@stashbox/shared";
import { useState } from "react";

import { Badge } from "~/components/ui/badge.tsx";
import { Button } from "~/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "~/components/ui/dialog.tsx";

type BookmarkCardProps = {
  bookmark: Bookmark;
  onDeleteBookmark: (id: string) => Promise<void>;
};

export function BookmarkCard({ bookmark, onDeleteBookmark }: BookmarkCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const domain = getDomain(bookmark.url);
  const title = bookmark.title.trim() || domain || bookmark.url;
  const isLoading =
    bookmark.enrichmentStatus === "pending" || bookmark.enrichmentStatus === "enriching";

  return (
    <article
      aria-label={title}
      className="archive-panel group flex h-full flex-col overflow-hidden rounded-sm border-border transition hover:border-accent/70"
    >
      <div className="archive-grid-surface relative aspect-[16/10] overflow-hidden border-b border-border bg-muted">
        {isLoading ? (
          <div
            role="status"
            aria-label="Enrichissement en cours"
            className="flex h-full w-full items-center justify-center bg-muted"
          >
            <span className="h-12 w-12 rounded-full border border-accent/40 border-t-accent bg-card/60 animate-spin" />
          </div>
        ) : bookmark.enrichmentStatus === "failed" ? (
          <div
            role="img"
            aria-label={`Enrichissement échoué pour ${domain}`}
            className="flex h-full w-full items-center justify-center bg-destructive/10 font-mono text-6xl font-semibold text-destructive"
          >
            !
          </div>
        ) : bookmark.ogImage ? (
          <img
            className="h-full w-full object-cover grayscale transition duration-300 group-hover:grayscale-0"
            src={bookmark.ogImage}
            alt={`Aperçu de ${title}`}
          />
        ) : (
          <div
            role="img"
            aria-label={`Aperçu indisponible pour ${domain}`}
            className="flex h-full w-full items-center justify-center bg-muted font-mono text-5xl font-semibold text-muted-foreground"
          >
            {domain.at(0)?.toUpperCase() ?? bookmark.type.at(0)?.toUpperCase()}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/70 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 truncate font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {domain}
          </span>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <Badge variant="outline" className={getStatusClassName(bookmark.enrichmentStatus)}>
              {getStatusLabel(bookmark.enrichmentStatus)}
            </Badge>
            <Badge>{bookmark.type}</Badge>
          </div>
        </div>
        <h2 className="font-display text-xl font-semibold uppercase leading-none tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {bookmark.description ? (
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            {bookmark.description}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {bookmark.tags.map((tag) => (
            <span
              key={tag}
              className="max-w-full truncate rounded-sm border border-border bg-secondary/60 px-2 py-1 font-mono text-[0.68rem] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-auto border-t border-border pt-3">
          <Button
            type="button"
            aria-label={`Supprimer ${title}`}
            onClick={() => setIsConfirmingDelete(true)}
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10"
          >
            Supprimer
          </Button>
        </div>
      </div>
      <Dialog
        open={isConfirmingDelete}
        onOpenChange={(isOpen) => {
          if (!isDeleting) setIsConfirmingDelete(isOpen);
        }}
      >
        <DialogContent role="alertdialog" className="max-w-sm">
          <DialogTitle>Supprimer ce bookmark ?</DialogTitle>
          <DialogDescription>Cette action retirera "{title}" de votre grille.</DialogDescription>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
              variant="outline"
            >
              Annuler
            </Button>
            <Button
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
              variant="destructive"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
  if (status === "done") return "Indexé";
  if (status === "degraded") return "Dégradé";
  if (status === "failed") return "Échec";
  return "En attente";
}

function getStatusClassName(status: Bookmark["enrichmentStatus"]) {
  if (status === "done") return "border-[var(--signal)] text-[var(--signal)]";
  if (status === "failed") return "border-destructive text-destructive";
  if (status === "degraded") return "border-amber-500/70 text-amber-600 dark:text-amber-300";

  return "border-accent text-accent";
}
