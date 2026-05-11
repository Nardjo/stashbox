import { ApiError, StashboxClient } from "@stashbox/api-client";
import {
  type Bookmark,
  type ClientCaptureInput,
  detectMedia,
  type SiteCredentialMetadata,
} from "@stashbox/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSaveFlow } from "../hooks/useSaveFlow.js";
import { getOptions, saveOptions } from "../lib/options.js";
import { pollUntilDone } from "../lib/poll.js";
import { syncCurrentSiteCredentials } from "../lib/siteCredentials.js";

interface ExtractedContent {
  title: string;
  content: string;
  url: string;
}

type CredentialSyncState = "idle" | "syncing" | "synced" | "failed";

async function extractFromActiveTab(): Promise<ExtractedContent> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  const tabId = tab.id;

  const tryMessage = (): Promise<ExtractedContent> =>
    new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { type: "EXTRACT_CONTENT" }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(
            new Error(chrome.runtime.lastError.message ?? "Content script unreachable"),
          );
        }
        resolve(response as ExtractedContent);
      });
    });

  try {
    return await tryMessage();
  } catch {
    const manifest = chrome.runtime.getManifest();
    const files = manifest.content_scripts?.[0]?.js;
    if (!files?.length) throw new Error("No content script declared in manifest");
    await chrome.scripting.executeScript({ target: { tabId }, files });
    return tryMessage();
  }
}

async function captureVisibleViewport(): Promise<ClientCaptureInput> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  const viewport = await chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      func: () => ({ width: window.innerWidth, height: window.innerHeight }),
    })
    .then((results) => results[0]?.result)
    .catch(() => undefined);

  return {
    dataUrl,
    width: viewport?.width,
    height: viewport?.height,
  };
}

/* ─── Icons ─── */
function IconCog({ className }: { className?: string }) {
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function IconKey({ className }: { className?: string }) {
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
        d="M15.75 5.25a4.5 4.5 0 00-4.318 5.764L3 19.446V21h1.554l1.5-1.5h2.25v-2.25h2.25l2.432-2.432A4.5 4.5 0 1015.75 5.25z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25h.008v.008h-.008z" />
    </svg>
  );
}

function LogoMark({ className }: { className?: string }) {
  return <img className={className} src="icons/icon48.png" alt="" aria-hidden="true" />;
}

/* ─── Settings ─── */
function SettingsForm({ onSaved }: { onSaved: (client: StashboxClient) => void }) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOptions().then((opts) => {
      setApiUrl(opts.apiUrl);
      setApiKey(opts.apiKey);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const cleanUrl = apiUrl.trim();
    const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, "").trim();
    setApiUrl(cleanUrl);
    setApiKey(cleanKey);
    await saveOptions({ apiUrl: cleanUrl, apiKey: cleanKey });
    onSaved(new StashboxClient({ baseUrl: cleanUrl, apiKey: cleanKey }));
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up">
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
      <button type="submit" disabled={saving} className="btn-brass w-full">
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}

/* ─── Main Popup ─── */
export function Popup() {
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState<StashboxClient | null>(null);
  const [view, setView] = useState<"main" | "settings">("main");
  const [credentialSyncState, setCredentialSyncState] = useState<CredentialSyncState>("idle");
  const [credentialSync, setCredentialSync] = useState<SiteCredentialMetadata | null>(null);
  const [credentialSyncError, setCredentialSyncError] = useState<string | null>(null);

  useEffect(() => {
    getOptions().then(({ apiUrl, apiKey }) => {
      if (apiUrl && apiKey) setClient(new StashboxClient({ baseUrl: apiUrl, apiKey }));
      setReady(true);
    });
  }, []);

  const save = useCallback(async (): Promise<Bookmark> => {
    if (!client) throw new Error("Not configured");
    const extracted = await extractFromActiveTab();
    const capture =
      detectMedia(extracted.url).mediaProvider === "youtube"
        ? undefined
        : await captureVisibleViewport();
    try {
      return await client.add({
        url: extracted.url,
        content: extracted.content || undefined,
        sharedFrom: "chrome-extension",
        capture,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const conflict = Object.assign(new Error("Already saved"), {
          status: 409 as const,
          bookmark: err.body as Bookmark,
        });
        throw conflict;
      }
      throw err;
    }
  }, [client]);

  const poll = useCallback(
    async (id: string): Promise<Bookmark> => {
      if (!client) throw new Error("Not configured");
      return pollUntilDone(id, (bid) => client.get(bid), { intervalMs: 1500, timeoutMs: 15000 });
    },
    [client],
  );

  const { state, bookmark, error, trigger } = useSaveFlow({ save, poll });

  const syncCredentials = useCallback(async () => {
    if (!client) return;

    setCredentialSyncState("syncing");
    setCredentialSync(null);
    setCredentialSyncError(null);

    try {
      const metadata = await syncCurrentSiteCredentials(client);
      setCredentialSync(metadata);
      setCredentialSyncState("synced");
    } catch (err) {
      setCredentialSyncError(err instanceof Error ? err.message : "Unknown error");
      setCredentialSyncState("failed");
    }
  }, [client]);

  const autoTriggered = useRef(false);
  useEffect(() => {
    if (ready && client && view === "main" && !autoTriggered.current) {
      autoTriggered.current = true;
      trigger();
    }
  }, [ready, client, view, trigger]);

  const showSettings = view === "settings" || !client;

  if (!ready) {
    return (
      <div className="archive-grid-surface grain-overlay flex h-44 w-[360px] items-center justify-center bg-vault-bg">
        <div className="archive-panel flex items-center gap-3 rounded-sm px-4 py-3 text-parchment-200">
          <IconSpinner className="w-5 h-5 animate-spin text-brass-500" />
          <span className="font-mono text-xs tracking-wide">Ouverture de Stashbox...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="archive-grid-surface grain-overlay w-[360px] bg-vault-bg text-parchment-50">
      <div className="border-b border-vault-border bg-vault-surface/95 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="h-12 w-12 shrink-0 rounded-sm border border-vault-border bg-[#17130D] object-cover" />
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-semibold uppercase leading-none text-parchment-50">
                {showSettings ? "Paramètres" : "Stashbox"}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showSettings ? (
              <button
                type="button"
                onClick={() => setView("main")}
                className="icon-button"
                title="Retour"
              >
                <IconArrowLeft className="w-4 h-4" />
              </button>
            ) : null}
            {client && !showSettings ? (
              <button
                type="button"
                onClick={() => setView("settings")}
                className="icon-button"
                title="Paramètres"
              >
                <IconCog className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4">
        {showSettings ? (
          <div className="archive-panel rounded-sm p-4">
            <SettingsForm
              onSaved={(c) => {
                setClient(c);
                setView("main");
              }}
            />
          </div>
        ) : (
          <div className="min-h-[170px] space-y-4">
            {(state === "idle" || state === "saving") && (
              <div className="archive-panel rounded-sm p-4 animate-fade-up">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-vault-border bg-vault-elevated/70">
                    <IconSpinner className="h-5 w-5 animate-spin text-brass-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="technical-label">
                      {state === "idle" ? "Préparation" : "Capture en cours"}
                    </p>
                    <p className="mt-1 font-mono text-sm text-parchment-200">
                      {state === "idle"
                        ? "Lecture de l'onglet actif."
                        : "Sauvegarde et enrichissement du bookmark."}
                    </p>
                  </div>
                </div>
                {state === "saving" && (
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-sm bg-vault-elevated">
                    <div
                      className="h-full w-full animate-[shimmer_1.5s_linear_infinite] rounded-sm bg-brass-500"
                      style={{
                        backgroundSize: "200% 100%",
                        backgroundImage:
                          "linear-gradient(90deg, #F0AA16 0%, #FBF8EF 50%, #F0AA16 100%)",
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {(state === "saved" || state === "already-saved") && bookmark && (
              <div className="archive-panel overflow-hidden rounded-sm animate-fade-up">
                <div className="archive-grid-surface border-b border-vault-border p-4">
                  <p className="technical-label">Résultat capture</p>
                  <span
                    className={`status-chip mt-2 ${
                      state === "saved" ? "text-sage-600" : "text-brass-600"
                    }`}
                  >
                    {state === "saved" ? "Indexé" : "Déjà sauvegardé"}
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <p className="line-clamp-3 font-display text-2xl font-semibold uppercase leading-none text-parchment-50">
                    {bookmark.title}
                  </p>

                  {bookmark.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {bookmark.tags.map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : bookmark.enrichmentStatus === "pending" ||
                    bookmark.enrichmentStatus === "enriching" ? (
                    <div className="flex items-center gap-2 text-parchment-200">
                      <IconSpinner className="h-3 w-3 animate-spin text-brass-600" />
                      <span className="font-mono text-xs tracking-wide">Analyse en cours...</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {state === "failed" && (
              <div className="archive-panel rounded-sm p-4 animate-fade-up">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-brick-500/50 bg-brick-500/10">
                    <svg
                      className="h-5 w-5 text-brick-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="technical-label text-brick-600">Échec capture</p>
                    {error && <p className="font-mono text-xs text-parchment-200">{error}</p>}
                  </div>
                </div>
                <button
                  onClick={trigger}
                  className="btn-ghost mt-4 flex w-full items-center justify-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Réessayer
                </button>
              </div>
            )}

            <div className="archive-panel rounded-sm p-4 animate-fade-up">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-vault-border bg-vault-elevated/70">
                  {credentialSyncState === "syncing" ? (
                    <IconSpinner className="h-5 w-5 animate-spin text-brass-600" />
                  ) : (
                    <IconKey className="h-5 w-5 text-brass-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="technical-label">Identifiants site</p>
                  <p className="mt-1 font-mono text-xs leading-relaxed text-parchment-200">
                    {credentialSyncState === "synced" && credentialSync
                      ? `${credentialSync.domain} · ${credentialSync.cookieCount} cookies synchronisés.`
                      : credentialSyncState === "failed" && credentialSyncError
                        ? credentialSyncError
                        : "Action explicite pour transmettre les cookies du site actif."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={syncCredentials}
                disabled={credentialSyncState === "syncing"}
                className="btn-ghost mt-4 flex w-full items-center justify-center gap-2"
              >
                <IconKey className="h-3.5 w-3.5" />
                {credentialSyncState === "syncing" ? "Synchronisation..." : "Synchroniser cookies"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-vault-border bg-vault-surface/80 px-4 py-3">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-300">
          <span>v0.1.0</span>
          <span>Agent-first</span>
        </div>
      </div>
    </div>
  );
}
