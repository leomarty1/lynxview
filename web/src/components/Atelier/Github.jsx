// Github.jsx — page Github board Atelier (kanban 6 colonnes).
// Source : endpoint /github du bridge (GraphQL direct) qui retourne
// déjà du markdown structuré par Status. On le parse pour reconstruire
// le format colonnes.

import { useEffect, useState } from "react";
import { fetchGitHub } from "../../lib/api.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const COL_ORDER = ["In progress", "Today / In progress", "Validation", "This week", "Todo", "Backlog", "Stand-by", "Done"];

export default function AtelierGithub({ baseUrl, token }) {
  const [data, setData] = useState({ text: "", fetchedAt: 0, fromCache: false });
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null);

  async function refresh({ force = false } = {}) {
    setLoading(true);
    try {
      const result = await fetchGitHub(baseUrl, token, { refresh: force });
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

  // Pour l'instant on rend le markdown du bridge tel quel dans une carte
  // unique. Phase 4 affinera en parsing kanban réel (issue par colonne avec
  // hover preview). À ce stade : restitution markdown propre, c'est déjà
  // utile et lisible.
  return (
    <div className="a-page">
      <header className="a-pagehead">
        <div>
          <div className="a-pagehead__eyebrow">› board</div>
          <h1 className="a-pagehead__title">GitHub board</h1>
        </div>
        <div className="a-pagehead__actions">
          <button
            type="button"
            onClick={() => refresh({ force: true })}
            disabled={loading}
            className="a-btn"
          >
            {loading ? "..." : data.fromCache ? "↻ cache" : "↻ refresh"}
          </button>
        </div>
      </header>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "22px 26px",
        }}
      >
        {!data.text && !loading && (
          <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>
            Aucune donnée. Vérifie que le PAT GitHub est dans <code>%APPDATA%/lynxter-bridge/github-token.txt</code>.
          </p>
        )}
        {loading && !data.text && (
          <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>Chargement du board…</p>
        )}
        {data.text && (
          <div className="a-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.text}</ReactMarkdown>
          </div>
        )}
      </div>

      {data.fetchedAt > 0 && (
        <p
          style={{
            fontSize: "11px",
            color: "var(--ink-3)",
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: "12px",
          }}
        >
          Dernier refresh : {new Date(data.fetchedAt).toLocaleTimeString()}
          {data.fromCache && " · cache"}
        </p>
      )}
    </div>
  );
}
