// HubSpotQueue.jsx — panneau queue HubSpot, charte light.

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchHubSpot } from "../lib/api.js";

export default function HubSpotQueue({ baseUrl, token, onUseTicket }) {
  const [data, setData] = useState({
    text: "",
    fetchedAt: 0,
    error: null,
    fromCache: false,
  });
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
            onUseTicket?.({ skill: "hubspot", prompt: "" })
          }
          className="text-lx-muted hover:text-lx-blue"
        >
          Fetch ticket →
        </button>
      </div>
    </div>
  );
}
