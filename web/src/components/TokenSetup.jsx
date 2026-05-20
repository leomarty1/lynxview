// TokenSetup.jsx — connexion one-click au bridge local. Restylé v0.4
// en classes Atelier (a-btn / a-search) pour cohérence avec le shell.

import { useEffect, useState } from "react";
import { fetchLocalToken, pingStatus } from "../lib/api.js";

export default function TokenSetup({ baseUrl, onTokenSet, onBaseUrlSet }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [bridgeReachable, setBridgeReachable] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [url, setUrl] = useState(baseUrl);
  const [manualToken, setManualToken] = useState("");

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
        setError("Le bridge refuse cette origine. Mode manuel ci-dessous.");
      } else if (err.message.startsWith("auth_local_failed")) {
        setError("Bridge joignable mais /auth/local manquant (v0.2.1+).");
      } else {
        setError("Impossible de joindre le bridge. Vérifie qu'il tourne.");
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
      setError("Token trop court — vérifie token.txt");
      return;
    }
    onBaseUrlSet(url.trim());
    onTokenSet(t);
  }

  const buttonLabel = connecting
    ? "Connexion en cours…"
    : bridgeReachable === false
      ? "Connecter (bridge hors-ligne)"
      : "Connecter au bridge local";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f5f4f1",
        fontFamily: "'Roboto', sans-serif",
        color: "var(--lx-anthracite)",
      }}
    >
      {/* Branding (gauche) */}
      <aside
        style={{
          flex: "0 0 40%",
          background: "#faf8f4",
          borderRight: "1px solid #e9e4d8",
          padding: "48px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--lx-anthracite)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                color: "var(--lx-yellow)",
                fontSize: 24,
                letterSpacing: "-0.04em",
              }}
            >
              L
            </span>
            <span
              style={{
                position: "absolute",
                bottom: 7,
                right: 7,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--lx-blue)",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Lynxview
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#97938e",
                marginTop: 4,
                letterSpacing: "0.04em",
              }}
            >
              atelier · v0.4
            </div>
          </div>
        </div>

        <div>
          <h1
            className="outfit"
            style={{ fontSize: 56, lineHeight: 1, margin: 0, marginBottom: 12 }}
          >
            Lynxview
          </h1>
          <p style={{ maxWidth: "30ch", fontSize: 14, color: "#6b6764", margin: 0 }}>
            Pilote ton plugin{" "}
            <code
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--lx-blue)",
                background: "#f3efe7",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              lynxter-support
            </code>{" "}
            depuis le navigateur. Le bridge tourne sur ton PC — aucune donnée
            client ne quitte ton poste.
          </p>
        </div>

        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            color: "var(--lx-yellow)",
            fontSize: 28,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Make&nbsp;it&nbsp;smarter
        </div>
      </aside>

      {/* Form (droite) */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e9e4d8",
              borderRadius: 20,
              padding: "28px 28px",
            }}
          >
            <h2 className="outfit" style={{ fontSize: 16, margin: 0, marginBottom: 14 }}>
              Connexion au bridge
            </h2>
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "#6b6764",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background:
                    bridgeReachable === true
                      ? "var(--lx-green)"
                      : bridgeReachable === false
                        ? "var(--lx-red)"
                        : "#cfcfcf",
                  display: "inline-block",
                }}
              />
              {bridgeReachable === null
                ? "Détection du bridge…"
                : bridgeReachable
                  ? "Bridge détecté sur ton PC"
                  : "Bridge hors-ligne — vérifie qu'il tourne"}
            </p>

            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="a-btn a-btn--primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px 24px" }}
            >
              {buttonLabel}
            </button>

            {error && (
              <p
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  background: "rgba(241,62,63,0.06)",
                  border: "1px solid rgba(241,62,63,0.3)",
                  borderRadius: 10,
                  color: "var(--lx-red)",
                  fontSize: 12.5,
                }}
              >
                {error}
              </p>
            )}

            <p style={{ marginTop: 14, fontSize: 11, color: "#97938e" }}>
              Le token est récupéré automatiquement depuis ton bridge local
              (protégé par CORS). Aucun copier-coller nécessaire.
            </p>
          </div>

          <details
            open={showAdvanced}
            onToggle={(e) => setShowAdvanced(e.target.open)}
            style={{ background: "#fff", border: "1px solid #e9e4d8", borderRadius: 14 }}
          >
            <summary
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#6b6764",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Configurer manuellement (override)
            </summary>
            <form
              onSubmit={handleManualSubmit}
              style={{ padding: "8px 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#97938e" }}>
                  URL du bridge
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="a-search"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, width: "100%" }}
                  spellCheck="false"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#97938e" }}>
                  Bridge token
                </span>
                <input
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="hex 64 chars"
                  className="a-search"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, width: "100%" }}
                  spellCheck="false"
                />
              </label>
              <button type="submit" className="a-btn" style={{ width: "100%", justifyContent: "center" }}>
                Connecter avec ce token
              </button>
            </form>
          </details>
        </div>
      </main>
    </div>
  );
}
