import { useEffect, useState } from "react";
import { getOptions, saveOptions } from "../lib/options.js";

export function Options() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="min-h-screen bg-vault-bg grain-overlay flex items-start justify-center pt-16 pb-12 px-4">
      <div className="w-full max-w-md vault-card rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-semibold text-parchment-50 tracking-wide">
            stashit
          </h1>
          <p className="text-xs text-parchment-200 tracking-wide">Configuration de l'extension</p>
        </div>

        <div className="h-px bg-vault-border" />

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <button type="submit" className="btn-brass w-full flex items-center justify-center gap-2">
            {saved ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
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
          que vers votre instance stashit.
        </p>
      </div>
    </div>
  );
}
