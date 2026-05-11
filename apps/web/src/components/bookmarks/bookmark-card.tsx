import type { Bookmark } from "@stashbox/shared";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge } from "~/components/ui/badge.tsx";
import { Button } from "~/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "~/components/ui/dialog.tsx";

type BookmarkCardProps = {
  bookmark: Bookmark;
  onDeleteBookmark: (id: string) => Promise<void>;
};

export function BookmarkCard({ bookmark, onDeleteBookmark }: BookmarkCardProps) {
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);
  const domain = getDomain(bookmark.url);
  const title = bookmark.title.trim() || domain || bookmark.url;
  const previewImageUrl = bookmark.capture?.url ?? bookmark.ogImage;
  const isLoading =
    bookmark.enrichmentStatus === "pending" || bookmark.enrichmentStatus === "enriching";

  async function copyBookmarkUrl() {
    let didCopy = false;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(bookmark.url);
        didCopy = true;
      } catch {
        didCopy = false;
      }
    }

    if (!didCopy && typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = bookmark.url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      didCopy = document.execCommand("copy");
      textarea.remove();
    }

    setHasCopiedUrl(didCopy);
  }

  function requestDeleteConfirmation() {
    setIsShowingDetails(false);
    setIsConfirmingDelete(true);
  }

  return (
    <article
      aria-label={title}
      className="archive-panel group relative flex h-full flex-col overflow-hidden rounded-sm border-border transition hover:border-accent/70"
    >
      <button
        type="button"
        aria-label={`Voir les détails de ${title}`}
        onClick={() => setIsShowingDetails(true)}
        className="absolute inset-0 z-10 cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <div className="archive-grid-surface relative aspect-[16/10] overflow-hidden border-b border-border bg-muted">
        <div className="absolute right-2 top-2 z-20 flex gap-1.5 opacity-100 transition duration-200 sm:opacity-0 sm:translate-y-1 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border bg-card/90 backdrop-blur"
            title={`Ouvrir ${title}`}
          >
            <a href={bookmark.url} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              <span className="sr-only">Ouvrir {title}</span>
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void copyBookmarkUrl()}
            className="h-9 w-9 border-border bg-card/90 backdrop-blur"
            title={hasCopiedUrl ? "URL copiée" : `Copier l'URL de ${title}`}
          >
            {hasCopiedUrl ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span className="sr-only">
              {hasCopiedUrl ? "URL copiée" : `Copier l'URL de ${title}`}
            </span>
          </Button>
          <Button
            type="button"
            aria-label={`Supprimer ${title}`}
            onClick={requestDeleteConfirmation}
            variant="outline"
            size="icon"
            className="h-9 w-9 border-destructive/50 bg-card/90 text-destructive backdrop-blur hover:border-destructive hover:bg-destructive/10"
            title={`Supprimer ${title}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
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
        ) : previewImageUrl ? (
          <img
            className="h-full w-full scale-[1.18] object-cover object-center grayscale transition duration-300 group-hover:scale-[1.2] group-hover:grayscale-0"
            src={previewImageUrl}
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
            {bookmark.transcriptionStatus && bookmark.transcriptionStatus !== "none" ? (
              <Badge
                variant="outline"
                className={getTranscriptionStatusClassName(bookmark.transcriptionStatus)}
              >
                {getTranscriptionStatusLabel(bookmark.transcriptionStatus)}
              </Badge>
            ) : null}
          </div>
        </div>
        <h2 className="font-display text-xl font-semibold uppercase leading-none tracking-[-0.01em] text-foreground">
          {title}
        </h2>
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
      </div>
      <Dialog open={isShowingDetails} onOpenChange={setIsShowingDetails}>
        <DialogContent className="scrollbar-none max-h-[min(90vh,46rem)] max-w-3xl overflow-y-auto overflow-x-hidden p-0">
          <div className="min-w-0">
            <div className="archive-grid-surface h-52 overflow-hidden border-b border-border bg-muted sm:h-60">
              {previewImageUrl ? (
                <img
                  className="h-full w-full scale-[1.08] object-cover object-center grayscale"
                  src={previewImageUrl}
                  alt={`Aperçu de ${title}`}
                />
              ) : (
                <div
                  role="img"
                  aria-label={`Aperçu indisponible pour ${domain}`}
                  className="flex h-full w-full items-center justify-center font-mono text-6xl font-semibold text-muted-foreground"
                >
                  {domain.at(0)?.toUpperCase() ?? bookmark.type.at(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-5 p-5">
              <div className="min-w-0 space-y-2 pr-8">
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className={getStatusClassName(bookmark.enrichmentStatus)}
                  >
                    {getStatusLabel(bookmark.enrichmentStatus)}
                  </Badge>
                  <Badge>{bookmark.type}</Badge>
                  {bookmark.transcriptionStatus && bookmark.transcriptionStatus !== "none" ? (
                    <Badge
                      variant="outline"
                      className={getTranscriptionStatusClassName(bookmark.transcriptionStatus)}
                    >
                      {getTranscriptionStatusLabel(bookmark.transcriptionStatus)}
                    </Badge>
                  ) : null}
                </div>
                <DialogTitle className="text-2xl tracking-[0.02em]">{title}</DialogTitle>
                <DialogDescription className="break-all">{bookmark.url}</DialogDescription>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <DetailItem label="Domaine">{domain}</DetailItem>
                <DetailItem label="Type">{bookmark.type}</DetailItem>
                <DetailItem label="Statut">{getStatusLabel(bookmark.enrichmentStatus)}</DetailItem>
                <DetailItem label="Sauvegardes">{bookmark.savedCount}</DetailItem>
                <DetailItem label="Ajouté le">{formatBookmarkDate(bookmark.savedAt)}</DetailItem>
                <DetailItem label="Dernière sauvegarde">
                  {formatBookmarkDate(bookmark.lastSavedAt)}
                </DetailItem>
                <DetailItem label="Enrichi le">
                  {formatBookmarkDate(bookmark.enrichedAt)}
                </DetailItem>
                <DetailItem label="Tentatives">{bookmark.enrichmentAttempts}</DetailItem>
                {bookmark.transcriptionStatus ? (
                  <DetailItem label="Transcription">
                    {getTranscriptionStatusLabel(bookmark.transcriptionStatus)}
                  </DetailItem>
                ) : null}
              </div>

              <DetailBlock label="Description">
                {bookmark.description.trim() || "Aucune description."}
              </DetailBlock>

              <DetailBlock label="Tags">
                {bookmark.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {bookmark.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm border border-border bg-secondary/60 px-2 py-1 font-mono text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  "Aucun tag."
                )}
              </DetailBlock>

              <div className="grid gap-2 sm:grid-cols-2">
                <DetailItem label="Source">
                  {bookmark.savedFrom.length > 0 ? bookmark.savedFrom.join(", ") : "Non renseignée"}
                </DetailItem>
                <DetailItem label="Capture">
                  {bookmark.capture ? (
                    <a
                      href={bookmark.capture.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-primary hover:underline"
                    >
                      {bookmark.capture.url}
                    </a>
                  ) : (
                    "Aucune capture."
                  )}
                </DetailItem>
                <DetailItem label="Image OpenGraph">
                  {bookmark.ogImage ? (
                    <a
                      href={bookmark.ogImage}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-primary hover:underline"
                    >
                      {bookmark.ogImage}
                    </a>
                  ) : (
                    "Aucune image."
                  )}
                </DetailItem>
              </div>

              {bookmark.transcriptionError || bookmark.transcriptionText ? (
                <DetailBlock label="Transcription média">
                  {bookmark.transcriptionText ? (
                    <pre className="max-h-48 max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words font-mono text-xs">
                      {bookmark.transcriptionText}
                    </pre>
                  ) : (
                    bookmark.transcriptionError
                  )}
                </DetailBlock>
              ) : null}

              {getEmbedDataSummary(bookmark.embedData).length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {getEmbedDataSummary(bookmark.embedData).map(({ label, value }) => (
                    <DetailItem key={label} label={label}>
                      {value}
                    </DetailItem>
                  ))}
                </div>
              ) : null}

              {bookmark.enrichmentFailureReason || bookmark.enrichmentError ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <DetailItem label="Raison échec">
                    {bookmark.enrichmentFailureReason ?? "Non renseignée"}
                  </DetailItem>
                  <DetailItem label="Erreur enrichissement">
                    {bookmark.enrichmentError ?? "Non renseignée"}
                  </DetailItem>
                </div>
              ) : null}

              {bookmark.embeddingSourceText ? (
                <DetailBlock label="Texte indexé">
                  <pre className="max-h-40 max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-sm border border-border bg-background/60 p-3 font-mono text-xs text-muted-foreground">
                    {bookmark.embeddingSourceText}
                  </pre>
                </DetailBlock>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button type="button" onClick={requestDeleteConfirmation} variant="destructive">
                  <Trash2 aria-hidden="true" />
                  Supprimer
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="outline">
                    <a href={bookmark.url} target="_blank" rel="noreferrer">
                      Ouvrir le lien
                    </a>
                  </Button>
                  <Button type="button" onClick={() => void copyBookmarkUrl()}>
                    {hasCopiedUrl ? "URL copiée" : "Copier l'URL"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
                  setIsShowingDetails(false);
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

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-sm border border-border bg-card/60 p-3">
      <p className="technical-label">{label}</p>
      <p className="mt-1 break-words font-mono text-sm text-foreground">{children}</p>
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-sm border border-border bg-card/60 p-3">
      <h3 className="technical-label">{label}</h3>
      <div className="mt-2 break-words font-mono text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </section>
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

function getTranscriptionStatusLabel(status: NonNullable<Bookmark["transcriptionStatus"]>) {
  if (status === "done") return "Transcrit";
  if (status === "failed") return "Transcription échouée";
  if (status === "transcribing") return "Transcription";
  if (status === "pending") return "À transcrire";
  return "Sans transcription";
}

function getTranscriptionStatusClassName(status: NonNullable<Bookmark["transcriptionStatus"]>) {
  if (status === "done") return "border-[var(--signal)] text-[var(--signal)]";
  if (status === "failed") return "border-destructive text-destructive";
  if (status === "transcribing") return "border-accent text-accent";
  return "border-amber-500/70 text-amber-600 dark:text-amber-300";
}

function formatBookmarkDate(value: string | null) {
  if (!value) return "Non renseigné";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function getEmbedDataSummary(embedData: Bookmark["embedData"]) {
  if (!embedData || typeof embedData !== "object" || Array.isArray(embedData)) return [];

  const record = embedData as Record<string, unknown>;
  const rows = [
    { label: "Provider", value: getStringRecordValue(record, "provider_name") },
    { label: "Auteur", value: getStringRecordValue(record, "author_name") },
    { label: "Titre embed", value: getStringRecordValue(record, "title") },
  ];

  return rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
}

function getStringRecordValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
