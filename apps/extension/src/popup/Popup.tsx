import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, StashitClient } from "@stashit/api-client";
import type { Bookmark } from "@stashit/shared";
import { useSaveFlow } from "../hooks/useSaveFlow.js";
import { getOptions, saveOptions } from "../lib/options.js";
import { pollUntilDone } from "../lib/poll.js";

interface ExtractedContent {
  title: string;
  content: string;
  url: string;
}

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

function IconSeal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="0.75" opacity="0.25" />
      <text
        x="32"
        y="27"
        textAnchor="middle"
        fill="currentColor"
        fontSize="8"
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="2"
        opacity="0.7"
      >
        STASHIT
      </text>
      <path d="M20 34h24M22 38h20M24 42h16" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <circle cx="32" cy="48" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/* ─── Settings ─── */
function SettingsForm({ onSaved }: { onSaved: (client: StashitClient) => void }) {
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
    onSaved(new StashitClient({ baseUrl: cleanUrl, apiKey: cleanKey }));
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up">
      <div className="space-y-1.5">
        <label className="block text-[10px] font-medium tracking-widest uppercase text-parchment-300">
          URL de l'API
        </label>
        <input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://stashit.example.com"
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
      <button type="submit" disabled={saving} className="btn-brass w-full">
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}

/* ─── Main Popup ─── */
export function Popup() {
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState<StashitClient | null>(null);
  const [view, setView] = useState<"main" | "settings">("main");

  useEffect(() => {
    getOptions().then(({ apiUrl, apiKey }) => {
      if (apiUrl && apiKey) setClient(new StashitClient({ baseUrl: apiUrl, apiKey }));
      setReady(true);
    });
  }, []);

  const save = useCallback(async (): Promise<Bookmark> => {
    if (!client) throw new Error("Not configured");
    const extracted = await extractFromActiveTab();
    try {
      return await client.add({
        url: extracted.url,
        content: extracted.content || undefined,
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
      <div className="w-[320px] h-40 flex items-center justify-center grain-overlay">
        <div className="flex items-center gap-3 text-parchment-200">
          <IconSpinner className="w-5 h-5 animate-spin text-brass-500" />
          <span className="text-xs tracking-wide">Ouverture du coffre...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] grain-overlay bg-vault-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          {showSettings ? (
            <button
              onClick={() => setView("main")}
              className="text-parchment-300 hover:text-brass-400 transition-colors"
              title="Retour"
            >
              <IconArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <h1 className="font-display text-base font-semibold tracking-wide text-parchment-50">
            {showSettings ? "Paramètres" : "stashit"}
          </h1>
        </div>
        {client && (
          <button
            onClick={() => setView(showSettings ? "main" : "settings")}
            className="text-parchment-300 hover:text-brass-400 transition-colors p-1"
            title={showSettings ? "Retour" : "Paramètres"}
          >
            <IconCog className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-vault-border" />

      {/* Content */}
      <div className="px-5 py-4">
        {showSettings ? (
          <SettingsForm
            onSaved={(c) => {
              setClient(c);
              setView("main");
            }}
          />
        ) : (
          <div className="space-y-4 min-h-[140px]">
            {/* Loading states */}
            {(state === "idle" || state === "saving") && (
              <div className="flex flex-col items-center justify-center py-6 gap-3 animate-fade-up">
                <IconSpinner className="w-8 h-8 animate-spin text-brass-500" />
                <p className="text-xs text-parchment-200 tracking-wide">
                  {state === "idle" ? "Préparation..." : "Sauvegarde en cours..."}
                </p>
                {state === "saving" && (
                  <div className="w-full max-w-[180px] h-0.5 bg-vault-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brass-500 rounded-full animate-[shimmer_1.5s_linear_infinite] w-full"
                      style={{
                        backgroundSize: "200% 100%",
                        backgroundImage:
                          "linear-gradient(90deg, #D4A853 0%, #F5F0E8 50%, #D4A853 100%)",
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Success states */}
            {(state === "saved" || state === "already-saved") && bookmark && (
              <div className="space-y-4 animate-fade-up">
                {/* Seal */}
                <div className="flex justify-center py-1">
                  <div
                    className={`${state === "saved" ? "animate-seal-stamp" : ""} text-brass-500`}
                  >
                    <div className="w-16 h-16">
                      <IconSeal className="w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="text-center">
                  <p
                    className={`text-[10px] font-medium tracking-[0.2em] uppercase ${state === "saved" ? "text-sage-500" : "text-brass-400"}`}
                  >
                    {state === "saved" ? "Enregistré" : "Déjà sauvegardé"}
                  </p>
                </div>

                {/* Title */}
                <p className="text-sm font-medium text-parchment-50 leading-relaxed text-center font-display">
                  {bookmark.title}
                </p>

                {/* Tags */}
                {bookmark.tags.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {bookmark.tags.map((tag) => (
                      <span key={tag} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : bookmark.enrichmentStatus === "pending" ||
                  bookmark.enrichmentStatus === "enriching" ? (
                  <div className="flex items-center justify-center gap-2 text-parchment-300">
                    <IconSpinner className="w-3 h-3 animate-spin text-brass-500" />
                    <span className="text-[10px] italic tracking-wide">Analyse en cours...</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Failed */}
            {state === "failed" && (
              <div className="space-y-4 animate-fade-up">
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full border border-brick-500/30 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-brick-500"
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
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-brick-500">
                    Échec
                  </p>
                  {error && <p className="text-[11px] text-parchment-300">{error}</p>}
                </div>
                <button
                  onClick={trigger}
                  className="btn-ghost w-full flex items-center justify-center gap-2"
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
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-3 pt-1">
        <div className="h-px bg-vault-border mb-2" />
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-parchment-300 tracking-wider uppercase">v0.1.0</span>
          <span className="text-[9px] text-parchment-300 tracking-wider">
            Agent-first bookmarks
          </span>
        </div>
      </div>
    </div>
  );
}
