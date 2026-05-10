import { type FormEvent, useId, useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert.tsx";
import { Button } from "~/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card.tsx";
import { Input } from "~/components/ui/input.tsx";

export type SaveBookmarkResult = {
  alreadySaved?: boolean;
};

type AddBookmarkCardProps = {
  onSaveBookmark: (url: string) => Promise<SaveBookmarkResult | void>;
};

type SaveNotice = {
  message: string;
  variant: "default" | "destructive";
};

export function AddBookmarkCard({ onSaveBookmark }: AddBookmarkCardProps) {
  const errorId = useId();
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState<SaveNotice | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextUrl = url.trim();
    if (!isHttpUrl(nextUrl)) {
      setNotice({ message: "Saisissez une URL valide.", variant: "destructive" });
      return;
    }

    setNotice(undefined);
    setIsSaving(true);
    try {
      const result = await onSaveBookmark(nextUrl);
      if (result?.alreadySaved) {
        setNotice({ message: "Ce Bookmark est déjà sauvegardé.", variant: "default" });
      } else {
        setUrl("");
      }
    } catch (error) {
      if (isAlreadySavedError(error)) {
        setNotice({ message: "Ce Bookmark est déjà sauvegardé.", variant: "default" });
      } else {
        setNotice({
          message: "Impossible de sauvegarder le Bookmark.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="archive-grid-surface min-h-full border-dashed border-accent/70 bg-card/70 transition hover:border-accent hover:bg-accent/5">
      <form
        aria-label="Sauvegarder un Bookmark"
        className="flex min-h-full flex-col justify-between"
        noValidate
        onSubmit={handleSubmit}
      >
        <div>
          <CardHeader className="p-4 pb-3">
            <p className="technical-label">Capture slot</p>
            <CardTitle className="text-lg">Sauvegarder un Bookmark</CardTitle>
            <CardDescription>Collez une URL pour lancer l'enrichissement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <label className="block space-y-2">
              <span className="technical-label">URL du Bookmark</span>
              <Input
                aria-describedby={notice ? errorId : undefined}
                aria-invalid={notice?.variant === "destructive" ? true : undefined}
                disabled={isSaving}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/article"
                type="url"
                value={url}
              />
            </label>
            {notice ? (
              <Alert id={errorId} variant={notice.variant}>
                <AlertDescription>{notice.message}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </div>
        <CardFooter className="p-4 pt-0">
          <Button
            className="w-full border-accent bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </CardFooter>
      </form>
    </Card>
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

function isAlreadySavedError(error: unknown) {
  if ((error as { status?: unknown })?.status === 409) return true;
  if (!(error instanceof Error)) return false;

  return error.message.includes("409") || error.message.toLowerCase().includes("conflict");
}
