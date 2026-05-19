// TokenSetup.jsx — affiché au premier lancement (ou après reset) pour saisir
// le bearer token du bridge. Le token est ensuite mémorisé en localStorage.

import { useState } from "react";

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
    <div className="flex h-full items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-lx-border bg-lx-panel p-6 shadow-lg"
      >
        <div>
          <h1 className="text-xl font-semibold">Lynxter Control — Setup</h1>
          <p className="mt-1 text-sm text-lx-muted">
            Colle le token du bridge. Il est dans{" "}
            <code className="rounded bg-lx-bg px-1 py-0.5 text-xs">
              %APPDATA%\lynxter-bridge\token.txt
            </code>
            .
          </p>
        </div>

        <label className="block">
          <span className="text-sm text-lx-muted">URL du bridge</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded border border-lx-border bg-lx-bg px-3 py-2 font-mono text-sm focus:border-lx-accent focus:outline-none"
            spellCheck="false"
          />
        </label>

        <label className="block">
          <span className="text-sm text-lx-muted">Bridge token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="hex 64 caractères"
            className="mt-1 w-full rounded border border-lx-border bg-lx-bg px-3 py-2 font-mono text-sm focus:border-lx-accent focus:outline-none"
            autoFocus
            spellCheck="false"
          />
        </label>

        {error && (
          <p className="text-sm text-lx-err">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded bg-lx-accent px-4 py-2 font-medium text-lx-bg transition hover:brightness-110"
        >
          Connecter
        </button>

        <p className="text-xs text-lx-muted">
          Le token reste sur cet ordinateur — stocké en localStorage de ce
          navigateur uniquement.
        </p>
      </form>
    </div>
  );
}
