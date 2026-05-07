import { useEffect, useRef, useState } from "react";
import { StashboxClient } from "@stashbox/api-client";
import type { Bookmark } from "@stashbox/shared";
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
    <div className="min-h-screen bg-vault-bg grain-overlay flex items-start justify-center pt-12 pb-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* ── Header ── */}
        <div className="vault-card rounded-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display text-2xl font-semibold text-parchment-50 tracking-wide">
              stashbox
            </h1>
            <p className="text-xs text-parchment-200 tracking-wide">Configuration de l'extension</p>
          </div>

          <div className="h-px bg-vault-border" />

          {/* ── Settings ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-medium tracking-widest uppercase text-parchment-300">
                URL de l'API
              </label>
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
              <label className="block text-[10px] font-medium tracking-widest uppercase text-parchment-300">
                Clé API
              </label>
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
              className="btn-brass w-full flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <IconCheck className="w-4 h-4" />
                  Enregistré
                </>
              ) : (
                "Enregistrer"
              )}
            </button>
          </form>

          <div className="h-px bg-vault-border" />

          <p className="text-[10px] text-parchment-300 text-center leading-relaxed">
            La clé API est stockée localement dans le navigateur. Elle n'est jamais envoyée ailleurs
            que vers votre instance stashbox.
          </p>
        </div>

        {/* ── Import ── */}
        <div className="vault-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brass-500/10 flex items-center justify-center">
              <IconUpload className="w-4 h-4 text-brass-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-parchment-50">Importer</h2>
              <p className="text-[10px] text-parchment-300">CSV au format stashbox</p>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-parchment-200">
                <span>
                  {importDone} / {importTotal}
                </span>
                <span>{importProgress}%</span>
              </div>
              <div className="h-1 bg-vault-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-brass-500 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-ghost w-full flex items-center justify-center gap-2"
            >
              <IconUpload className="w-3.5 h-3.5" />
              Choisir un fichier CSV
            </button>
          )}

          {importError && <p className="text-[10px] text-brick-500 text-center">{importError}</p>}
        </div>

        {/* ── Export ── */}
        <div className="vault-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brass-500/10 flex items-center justify-center">
              <IconDownload className="w-4 h-4 text-brass-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-parchment-50">Exporter</h2>
              <p className="text-[10px] text-parchment-300">
                {exporting
                  ? `Récupération de ${exportCount} bookmarks...`
                  : "Télécharger tous les bookmarks en CSV"}
              </p>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-ghost w-full flex items-center justify-center gap-2"
          >
            <IconDownload className="w-3.5 h-3.5" />
            {exporting ? "Export en cours..." : "Exporter en CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}
