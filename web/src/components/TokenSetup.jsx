// TokenSetup.jsx — premier lancement / après reset.
// Layout aligné à gauche (charte). Logo + baseline. Boutons en jaune Lynxter.

import { useState } from "react";
import { Logo, Baseline, Wordmark, ProductName } from "./Brand.jsx";

export default function TokenSetup({ baseUrl, onTokenSet, onBaseUrlSet }) {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState(baseUrl);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const t = token.trim();
    if (t.length < 16) {
      setError("Token trop court — vérifie le contenu de token.txt");
      return;
    }
    onBaseUrlSet(url.trim());
    onTokenSet(t);
  }

  return (
    <div className="flex h-full w-full items-stretch bg-lx-bg">
      {/* Colonne de gauche — branding (alignement à gauche, charte p.24) */}
      <aside className="hidden w-2/5 flex-col justify-between border-r border-lx-border bg-lx-soft p-10 md:flex">
        <div className="flex items-baseline gap-3">
          <Logo size={40} className="self-center" />
          <Wordmark className="text-lg" />
          <ProductName name="LYNXVIEW" className="text-base" />
        </div>

        <div className="space-y-6">
          <h1 className="font-display text-5xl font-normal leading-none tracking-tight text-lx-deep">
            <span className="lx-machine block text-[3.5rem] leading-none">
              LYNXVIEW
            </span>
          </h1>
          <p className="max-w-sm text-sm text-lx-muted">
            Pilote ton plugin <code className="text-lx-blue">lynxter-support</code> depuis le navigateur. Le bridge tourne sur ton PC — aucune donnée client ne quitte ton poste.
          </p>
        </div>

        <Baseline className="text-2xl" />
      </aside>

      {/* Colonne de droite — formulaire de connexion */}
      <main className="flex flex-1 items-center justify-center p-8">
        <form
          onSubmit={handleSubmit}
          className="lx-card w-full max-w-md space-y-5 p-7"
        >
          <header className="space-y-1">
            <h2 className="font-display text-xl font-normal uppercase tracking-tight text-lx-deep">
              Connexion au bridge
            </h2>
            <p className="text-sm text-lx-muted">
              Récupère le token dans
              <code className="ml-1 rounded bg-lx-soft px-1.5 py-0.5 text-xs text-lx-blue">
                %APPDATA%\lynxter-bridge\token.txt
              </code>
            </p>
          </header>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-lx-muted">
              URL du bridge
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="lx-input lx-input--mono w-full"
              spellCheck="false"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-lx-muted">
              Bridge token
            </span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="hex 64 caractères"
              className="lx-input lx-input--mono w-full"
              autoFocus
              spellCheck="false"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded border border-lx-err/30 bg-lx-err-soft px-3 py-2 text-sm text-lx-err"
            >
              {error}
            </p>
          )}

          <button type="submit" className="lx-btn-primary w-full">
            Connecter
          </button>

          <p className="text-xs text-lx-subtle">
            Le token reste sur cet ordinateur (localStorage de ce navigateur uniquement).
          </p>
        </form>
      </main>
    </div>
  );
}
