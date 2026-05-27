// App.jsx — orchestrator top-level v0.4 (refonte Atelier).
//
// Si pas de token → TokenSetup (connexion one-click au bridge local).
// Sinon → AtelierShell (sidebar + 4 routes : Assistant / Tickets / Github / Knowledge).

import { useState } from "react";
import TokenSetup from "./components/TokenSetup.jsx";
import AtelierShell from "./components/Atelier/Shell.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { Token, BaseUrl } from "./lib/storage.js";

export default function App() {
  const [baseUrl, setBaseUrl] = useState(BaseUrl.get());
  const [token, setToken] = useState(Token.get());

  const handleTokenSet = (t) => {
    Token.set(t);
    setToken(t);
  };

  const handleBaseUrlSet = (url) => {
    BaseUrl.set(url);
    setBaseUrl(url);
  };

  const handleReset = () => {
    Token.clear();
    setToken("");
  };

  return (
    <ErrorBoundary>
      {!token ? (
        <TokenSetup
          baseUrl={baseUrl}
          onTokenSet={handleTokenSet}
          onBaseUrlSet={handleBaseUrlSet}
        />
      ) : (
        <AtelierShell baseUrl={baseUrl} token={token} onReset={handleReset} />
      )}
    </ErrorBoundary>
  );
}
