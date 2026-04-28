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
    // Content script not injected yet (tab was open before extension load) — inject now
    const manifest = chrome.runtime.getManifest();
    const files = manifest.content_scripts?.[0]?.js;
    if (!files?.length) throw new Error("No content script declared in manifest");
    await chrome.scripting.executeScript({ target: { tabId }, files });
    return tryMessage();
  }
}

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">URL de l'API</label>
        <input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://stashit.example.com"
          required
          className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">Clé API</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-…"
          required
          className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

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

  if (!ready) {
    return (
      <div className="w-80 h-32 flex items-center justify-center text-sm text-gray-400">
        Chargement…
      </div>
    );
  }

  const showSettings = view === "settings" || !client;

  return (
    <div className="w-80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-900">
          {showSettings ? "Paramètres" : "Stashit"}
        </h1>
        {client && (
          <button
            onClick={() => setView(showSettings ? "main" : "settings")}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={showSettings ? "Retour" : "Paramètres"}
          >
            {showSettings ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {showSettings ? (
        <SettingsForm
          onSaved={(c) => {
            setClient(c);
            setView("main");
          }}
        />
      ) : (
        <>
          {state === "idle" && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Préparation…
            </div>
          )}

          {state === "saving" && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
              <svg className="w-4 h-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sauvegarde en cours…
            </div>
          )}

          {(state === "saved" || state === "already-saved") && bookmark && (
            <div className="space-y-2">
              <p
                className={`text-xs font-medium ${state === "saved" ? "text-green-600" : "text-amber-600"}`}
              >
                {state === "saved" ? "✓ Sauvegardé" : "Déjà sauvegardé"}
              </p>
              <p className="text-sm font-medium text-gray-900 leading-snug">{bookmark.title}</p>
              {bookmark.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {bookmark.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        state === "saved"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : bookmark.enrichmentStatus === "pending" ||
                bookmark.enrichmentStatus === "enriching" ? (
                <p className="text-xs text-gray-400 italic">Analyse en cours…</p>
              ) : null}
            </div>
          )}

          {state === "failed" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-600">Échec de la sauvegarde</p>
              {error && <p className="text-xs text-gray-400">{error}</p>}
              <button
                onClick={trigger}
                className="w-full rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Réessayer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
