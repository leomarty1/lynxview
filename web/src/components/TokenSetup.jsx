// TokenSetup.jsx — connexion au bridge local en un clic.
//
// Mode par défaut "auto" : un seul bouton "Connecter au bridge local"
// qui appelle GET /auth/local. Le bridge ne livre le token que si l'Origin
// est whitelistée côté CORS (donc seul leomarty1.github.io ou localhost
// peuvent récupérer le token de Léo).
//
// Mode "manuel" (caché par défaut) : ancien formulaire URL + token pour
// les cas où l'auto-fetch échoue (bridge offline, override custom).

import { useEffect, useState } from "react";
import { Logo, Baseline, Wordmark, ProductName } from "./Brand.jsx";
import { fetchLocalToken, pingStatus } from "../lib/api.js";

export default function TokenSetup({ baseUrl, onTokenSet, onBaseUrlSet }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [bridgeReachable, setBridgeReachable] = useState(null); // null=pending, true/false
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [url, setUrl] = useState(baseUrl);
  const [manualToken, setManualToken] = useState("");

  // Ping discret au montage pour savoir si le bridge tourne (et adapter
  // le wording du bouton + détecter les "fail to fetch" précoces).
  useEffect(() => {
    let cancelled = false;
    pingStatus(baseUrl)
      .then(() => {
        if (!cancelled) setBridgeReachable(true);
      })
      .catch(() => {
        if (!cancelled) setBridgeReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  async function handleConnect() {
    setConnecting(true);
    setError("");
    try {
      const token = await fetchLocalToken(baseUrl);
      onBaseUrlSet(baseUrl);
      onTokenSet(token);
    } catch (err) {
      if (err.message === "origin_not_allowed") {
        setError(
          "Le bridge refuse cette origine. Vérifie que cette URL est dans le " +
            "CORS allowlist du bridge (bridge/src/config.js). Tu peux passer " +
            "en mode manuel ci-dessous.",
        );
      } else if (err.message.startsWith("auth_local_failed")) {
        setError(
          "Bridge joignable mais a refusé /auth/local. Vérifie qu'il tourne " +
            "bien en v0.2.1+ (le endpoint /auth/local n'existe pas avant).",
        );
      } else {
        setError(
          "Impossible de joindre le bridge. Vérifie qu'il tourne (npm run " +
            "bridge) ou attends quelques secondes après le login Windows.",
        );
      }
      setShowAdvanced(true);
    } finally {
      setConnecting(false);
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    setError("");
    const t = manualToken.trim();
    if (t.length < 16) {
      setError("Token trop court — vérifie le contenu de token.txt");
      return;
    }
    onBaseUrlSet(url.trim());
    onTokenSet(t);
  }

  // Label du bouton selon le ping initial.
  const buttonLabel =
    connecting
      ? "Connexion en cours…"
      : bridgeReachable === false
        ? "Connecter (bridge hors-ligne)"
        : "Connecter au bridge local";

  return (
    <div className="flex h-full w-full items-stretch bg-lx-bg">
      {/* Branding gauche */}
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

      {/* Connexion droite */}
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-5">
          <div className="lx-card space-y-5 p-7">
            <header className="space-y-1">
              <h2 className="font-display text-xl font-normal uppercase tracking-tight text-lx-deep">
                Connexion au bridge
              </h2>
              <p className="flex items-center gap-2 text-sm text-lx-muted">
                <span
                  className={
                    bridgeReachable === true
                      ? "lx-dot lx-dot--ok"
                      : bridgeReachable === false
                        ? "lx-dot lx-dot--err"
                        : "lx-dot"
                  }
                  aria-hidden
                />
                <span>
                  {bridgeReachable === null
                    ? "Détection du bridge…"
                    : bridgeReachable
                      ? "Bridge détecté sur ton PC"
                      : "Bridge hors-ligne — vérifie qu'il tourne"}
                </span>
              </p>
            </header>

            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="lx-btn-primary w-full"
            >
              {buttonLabel}
            </button>

            {error && (
              <p
                role="alert"
                className="rounded border border-lx-err/30 bg-lx-err-soft px-3 py-2 text-sm text-lx-err"
              >
                {error}
              </p>
            )}

            <p className="text-xs text-lx-subtle">
              Le token est récupéré automatiquement depuis ton bridge local
              (protégé par CORS). Aucun copier-coller nécessaire.
            </p>
          </div>

          {/* Mode manuel — bascule discrète */}
          <details
            open={showAdvanced}
            onToggle={(e) => setShowAdvanced(e.target.open)}
            className="rounded border border-lx-border bg-lx-panel"
          >
            <summary className="cursor-pointer px-4 py-2 text-xs uppercase tracking-wide text-lx-muted hover:text-lx-text">
              Configurer manuellement (override)
            </summary>
            <form onSubmit={handleManualSubmit} className="space-y-3 p-4 pt-2">
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
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="hex 64 caractères (%APPDATA%\\lynxter-bridge\\token.txt)"
                  className="lx-input lx-input--mono w-full"
                  spellCheck="false"
                />
              </label>

              <button type="submit" className="lx-btn-secondary w-full">
                Connecter avec ce token
              </button>
            </form>
          </details>
        </div>
      </main>
    </div>
  );
}
