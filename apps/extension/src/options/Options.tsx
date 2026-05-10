import { StashboxClient } from "@stashbox/api-client";
import type { Bookmark } from "@stashbox/shared";
import { useEffect, useRef, useState } from "react";

import { getOptions, saveOptions } from "../lib/options.js";

/* ─── CSV helpers ─── */
function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value).replace(/"/g, '""');
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function bookmarksToCsv(bookmarks: Bookmark[]): string {
  const headers = ["url", "title", "description", "tags", "type", "enrichment_status", "saved_at"];
  let csv = headers.join(",") + "\n";
  for (const b of bookmarks) {
    const row = [
      escapeCsv(b.url),
      escapeCsv(b.title),
      escapeCsv(b.description),
      escapeCsv(b.tags.join(",")),
      escapeCsv(b.type),
      escapeCsv(b.enrichmentStatus),
      escapeCsv(b.savedAt),
    ];
    csv += row.join(",") + "\n";
  }
  return csv;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Icons ─── */
function IconUpload({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function LogoMark({ className }: { className?: string }) {
  return <img className={className} src="icons/icon48.png" alt="" aria-hidden="true" />;
}

/* ─── Component ─── */
export function Options() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportCount, setExportCount] = useState(0);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getOptions().then((opts) => {
      setApiUrl(opts.apiUrl);
      setApiKey(opts.apiKey);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveOptions({ apiUrl, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const buildClient = () => {
    if (!apiUrl || !apiKey) return null;
    return new StashboxClient({ baseUrl: apiUrl, apiKey });
  };

  /* ── Export ── */
  const handleExport = async () => {
    const client = buildClient();
    if (!client) return;

    setExporting(true);
    setExportCount(0);
    const all: Bookmark[] = [];
    const limit = 100;
    let offset = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        const batch = await client.list({ limit, offset });
        if (batch.length === 0) break;
        all.push(...batch);
        setExportCount(all.length);
        hasMore = batch.length === limit;
        offset += limit;
      }

      const csv = bookmarksToCsv(all);
      const date = new Date().toISOString().split("T")[0];
      downloadFile(csv, `stashbox-export-${date}.csv`, "text/csv;charset=utf-8;");
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  /* ── Import ── */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const client = buildClient();
    if (!client) {
      alert("Configure API URL and key first");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportDone(0);
    setImportError(null);

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setImportError("CSV is empty or invalid");
      setImporting(false);
      return;
    }

    // Skip header, find url column index
    const header = parseCsvLine(lines[0]!);
    const urlIdx = header.findIndex((h) => h.toLowerCase().includes("url"));
    const dataLines = lines.slice(1);
    setImportTotal(dataLines.length);

    let done = 0;
    let errors = 0;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (const line of dataLines) {
      const cols = parseCsvLine(line);
      const url = cols[urlIdx >= 0 ? urlIdx : 0] ?? "";
      if (!url || !url.startsWith("http")) {
        done++;
        setImportDone(done);
        setImportProgress(Math.round((done / dataLines.length) * 100));
        continue;
      }

      try {
        await client.add({ url });
      } catch (err) {
        // 409 = already exists, that's fine
        if (err instanceof Error && err.message.includes("409")) {
          // ok
        } else {
          errors++;
        }
      }

      done++;
      setImportDone(done);
      setImportProgress(Math.round((done / dataLines.length) * 100));
      await delay(150); // Rate limit friendliness
    }

    setImporting(false);
    if (errors > 0) {
      setImportError(`${errors} errors out of ${dataLines.length}`);
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="archive-grid-surface grain-overlay min-h-screen bg-vault-bg px-4 py-6 text-parchment-50">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <header className="archive-panel overflow-hidden rounded-sm">
          <div className="grid md:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="border-b border-vault-border p-5 md:border-b-0 md:border-r">
              <p className="technical-label">Extension / Paramètres</p>
              <div className="mt-3 flex items-end gap-4">
                <LogoMark className="h-20 w-20 rounded-sm border border-vault-border bg-[#17130D] object-cover" />
                <h1 className="font-display text-6xl font-semibold uppercase leading-[0.85] text-parchment-50">
                  Stashbox
                </h1>
              </div>
              <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-parchment-200">
                Configuration locale, import et export CSV pour l'extension navigateur.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1">
              <div className="border-r border-vault-border p-4 md:border-b md:border-r-0">
                <p className="technical-label">API</p>
                <p className="mt-2 font-mono text-sm font-semibold text-parchment-50">
                  {apiUrl ? "Configurée" : "À renseigner"}
                </p>
              </div>
              <div className="p-4">
                <p className="technical-label">Stockage</p>
                <p className="mt-2 font-mono text-sm font-semibold text-sage-600">Local</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="archive-panel rounded-sm p-5">
            <p className="technical-label">Connexion</p>
            <h2 className="mt-2 font-display text-3xl font-semibold uppercase leading-none">
              Accès API
            </h2>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="space-y-1.5">
                <label className="technical-label block">URL de l'API</label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://stashbox.example.com"
                  required
                  className="input-vault w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="technical-label block">Clé API</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_..."
                  required
                  className="input-vault w-full"
                />
              </div>

              <button
                type="submit"
                className="btn-brass flex w-full items-center justify-center gap-2"
              >
                {saved ? (
                  <>
                    <IconCheck className="h-4 w-4" />
                    Enregistré
                  </>
                ) : (
                  "Enregistrer"
                )}
              </button>
            </form>

            <p className="mt-5 border-t border-vault-border pt-4 font-mono text-xs leading-relaxed text-parchment-200">
              La clé API reste stockée localement dans le navigateur et n'est envoyée que vers votre
              instance Stashbox.
            </p>
          </section>

          <div className="grid gap-4">
            <section className="archive-panel rounded-sm p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-vault-border bg-vault-elevated/70">
                  <IconUpload className="h-5 w-5 text-brass-600" />
                </div>
                <div className="min-w-0">
                  <p className="technical-label">Import</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold uppercase leading-none">
                    CSV
                  </h2>
                  <p className="mt-1 font-mono text-xs text-parchment-200">
                    Format export Stashbox.
                  </p>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={importing}
                className="hidden"
              />

              {importing ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs text-parchment-200">
                    <span>
                      {importDone} / {importTotal}
                    </span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-sm bg-vault-elevated">
                    <div
                      className="h-full rounded-sm bg-brass-500 transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost mt-4 flex w-full items-center justify-center gap-2"
                >
                  <IconUpload className="h-3.5 w-3.5" />
                  Choisir CSV
                </button>
              )}

              {importError ? (
                <p className="mt-3 font-mono text-xs text-brick-600">{importError}</p>
              ) : null}
            </section>

            <section className="archive-panel rounded-sm p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-vault-border bg-vault-elevated/70">
                  <IconDownload className="h-5 w-5 text-brass-600" />
                </div>
                <div className="min-w-0">
                  <p className="technical-label">Export</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold uppercase leading-none">
                    Archive CSV
                  </h2>
                  <p className="mt-1 font-mono text-xs text-parchment-200">
                    {exporting
                      ? `Récupération de ${exportCount} bookmarks...`
                      : "Tous les bookmarks sauvegardés."}
                  </p>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-ghost mt-4 flex w-full items-center justify-center gap-2"
              >
                <IconDownload className="h-3.5 w-3.5" />
                {exporting ? "Export..." : "Exporter CSV"}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
