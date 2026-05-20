// HubSpotQueue.jsx — panneau queue HubSpot, charte light.
//
// État OAuth :
//   - data.needsOAuth = true → afficher un bouton "Connecter HubSpot" qui
//     ouvre /hubspot/oauth/start dans une nouvelle fenêtre. Au focus
//     retour de la fenêtre, on refetch automatiquement.
//   - Sinon : afficher la queue (markdown) ou les instructions setup.

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchHubSpot } from "../lib/api.js";

export default function HubSpotQueue({ baseUrl, token, onUseTicket }) {
  const [data, setData] = useState({
    text: "",
    fetchedAt: 0,
    error: null,
    fromCache: false,
    needsOAuth: false,
  });
  const [loading, setLoading] = useState(false);
  const oauthWindowRef = useRef(null);

  async function refresh({ force = false } = {}) {
    setLoading(true);
    try {
      const result = await fetchHubSpot(baseUrl, token, { refresh: force });
      setData(result);
    } catch (err) {
      setData((d) => ({ ...d, error: err.message }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quand la fenêtre OAuth se ferme (Léo a fini d'autoriser), on refetch
  // pour vérifier que le token est bien arrivé côté bridge.
  useEffect(() => {
    function onFocus() {
      if (oauthWindowRef.current && oauthWindowRef.current.closed) {
        oauthWindowRef.current = null;
        // Petit délai pour laisser le bridge écrire le refresh_token.
        setTimeout(() => refresh({ force: true }), 500);
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startOAuth() {
    const url = `${baseUrl}/hubspot/oauth/start`;
    oauthWindowRef.current = window.open(
      url,
      "lynxview-hubspot-oauth",
      "width=620,height=720,noopener=no",
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-medium uppercase tracking-wide text-lx-deep">
          HubSpot
        </h3>
        <button
          type="button"
          onClick={() => refresh({ force: true })}
          disabled={loading}
          className="text-xs text-lx-muted hover:text-lx-text disabled:opacity-50"
          title="Rafraîchir"
        >
          {loading ? "…" : data.fromCache ? "↻ cache" : "↻"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded border border-lx-border bg-lx-bg p-3">
        {!data.text && !loading && !data.error && (
          <p className="text-xs text-lx-subtle">Pas encore chargé.</p>
        )}
        {loading && !data.text && (
          <p className="text-xs text-lx-muted">Chargement…</p>
        )}
        {data.error && !data.text && (
          <p className="text-xs text-lx-err">{data.error}</p>
        )}
        {data.text && (
          <div className="markdown-body text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.text}
            </ReactMarkdown>
          </div>
        )}

        {/* Bouton de connexion OAuth — apparait uniquement quand le bridge
            est configuré (Client ID/Secret OK) mais pas encore autorisé. */}
        {data.needsOAuth && (
          <button
            type="button"
            onClick={startOAuth}
            className="lx-btn-primary mt-3 w-full"
          >
            Connecter HubSpot
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[0.7rem] text-lx-subtle">
        {data.fetchedAt > 0 ? (
          <span>
            {new Date(data.fetchedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {data.fromCache && " · cache"}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() =>
            // Pointe vers /support (sait router selon le contenu collé).
            onUseTicket?.({
              skill: "support",
              prompt: "Traite ce ticket HubSpot : (colle ID ou contenu)",
            })
          }
          className="text-lx-muted hover:text-lx-blue"
          title="Pré-remplit /support — colle l'ID ou le contenu du ticket"
        >
          Traiter un ticket →
        </button>
      </div>
    </div>
  );
}
