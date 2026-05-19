// HubSpotQueue.jsx — panneau queue HubSpot (cache 5min).
// Clic sur un ticket → préremplit le SkillRunner avec /support + contenu.

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchHubSpot } from "../lib/api.js";

export default function HubSpotQueue({ baseUrl, token, onUseTicket }) {
  const [data, setData] = useState({ text: "", fetchedAt: 0, error: null, fromCache: false });
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-lx-muted">
          HubSpot
        </h2>
        <button
          type="button"
          onClick={() => refresh({ force: true })}
          disabled={loading}
          className="text-xs text-lx-muted hover:text-lx-accent disabled:opacity-50"
        >
          {loading ? "..." : data.fromCache ? "↻ cache" : "↻"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded border border-lx-border bg-lx-bg p-3 text-xs">
        {!data.text && !loading && !data.error && (
          <p className="text-lx-muted">Pas encore chargé.</p>
        )}
        {loading && !data.text && (
          <p className="text-lx-muted">Chargement…</p>
        )}
        {data.error && (
          <p className="text-lx-err">Erreur : {data.error}</p>
        )}
        {data.text && (
          <div className="markdown-body text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.text}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {data.fetchedAt > 0 && (
        <p className="text-xs text-lx-muted">
          Dernier refresh : {new Date(data.fetchedAt).toLocaleTimeString()}
          {data.fromCache && " (cache)"}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          onUseTicket?.({
            skill: "hubspot",
            prompt: "",
            note: "Lance /hubspot pour fetch un ticket précis",
          })
        }
        className="rounded border border-lx-border px-2 py-1 text-xs text-lx-muted hover:border-lx-accent hover:text-lx-accent"
      >
        Fetch ticket par ID
      </button>
    </div>
  );
}
