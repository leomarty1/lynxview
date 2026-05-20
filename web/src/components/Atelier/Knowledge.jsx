// Knowledge.jsx — page Knowledge Atelier (live).
//
// Fetch /knowledge depuis le bridge → liste sources + categories + items.
// Clic sur une carte : si .md, modal d'aperçu avec markdown rendu ; sinon
// bouton "Ouvrir dans le programme par défaut" qui appelle /knowledge/open.

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  fetchKnowledge,
  fetchKnowledgeFile,
  openKnowledgeFile,
} from "../../lib/api.js";

export default function AtelierKnowledge({ baseUrl, token }) {
  const [data, setData] = useState({ sources: [], categories: [], items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [previewing, setPreviewing] = useState(null); // { id, title, content, ... } | null

  async function load({ refresh = false } = {}) {
    setLoading(true);
    setError("");
    try {
      const result = await fetchKnowledge(baseUrl, token, { refresh });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let items = data.items || [];
    if (selectedCat !== "all") {
      items = items.filter((it) => `${it.source}|${it.category}` === selectedCat);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.filename.toLowerCase().includes(q),
      );
    }
    return items;
  }, [data.items, selectedCat, search]);

  async function handleOpen(item) {
    if (item.previewable) {
      // Aperçu markdown intégré
      try {
        const file = await fetchKnowledgeFile(baseUrl, token, item.id);
        setPreviewing({ ...item, content: file.content });
      } catch (err) {
        setError(`Impossible de lire ${item.filename} : ${err.message}`);
      }
    } else {
      // Ouverture externe (PDF/docx/etc.)
      try {
        await openKnowledgeFile(baseUrl, token, item.id);
      } catch (err) {
        setError(`Impossible d'ouvrir ${item.filename} : ${err.message}`);
      }
    }
  }

  const allCount = data.items?.length || 0;

  return (
    <div className="a-page">
      <header className="a-pagehead">
        <div>
          <div className="a-pagehead__eyebrow">› kb</div>
          <h1 className="a-pagehead__title">Knowledge</h1>
        </div>
        <div className="a-pagehead__actions">
          <input
            type="search"
            className="a-search"
            placeholder="Chercher dans la KB…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={() => load({ refresh: true })}
            disabled={loading}
            className="a-btn"
          >
            {loading ? "..." : "↻ refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div
          className="a-empty"
          style={{ borderColor: "var(--lx-red)", maxWidth: "640px", marginBottom: "16px" }}
        >
          <div className="a-empty__mark" style={{ color: "var(--lx-red)" }}>!</div>
          <h2 className="a-empty__title" style={{ color: "var(--lx-red)" }}>Erreur</h2>
          <p className="a-empty__sub">{error}</p>
        </div>
      )}

      {/* Stats sources */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        {data.sources?.map((s) => (
          <div
            key={s.key}
            className="a-stat"
            style={{ minWidth: "180px", opacity: s.exists ? 1 : 0.5 }}
            title={s.root}
          >
            <span className="a-stat__v" style={{ fontSize: "20px" }}>
              {data.items.filter((it) => it.source === s.key).length}
            </span>
            <span className="a-stat__l">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="a-kb">
        <aside className="a-kb__cats">
          <button
            type="button"
            className={`a-kb__cat ${selectedCat === "all" ? "is-on" : ""}`}
            onClick={() => setSelectedCat("all")}
          >
            Toutes ({allCount})
          </button>
          {data.categories?.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`a-kb__cat ${selectedCat === c.id ? "is-on" : ""}`}
              onClick={() => setSelectedCat(c.id)}
              title={c.sourceLabel}
            >
              <span style={{ display: "block", fontSize: "13px" }}>{c.label}</span>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--ink-3)",
                  letterSpacing: "0.04em",
                }}
              >
                {c.sourceLabel} · {c.count}
              </span>
            </button>
          ))}
        </aside>

        <div className="a-kb__list">
          {loading && filtered.length === 0 && (
            <p style={{ color: "var(--ink-3)", fontSize: "13px", padding: "20px" }}>
              Chargement de la KB…
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p style={{ color: "var(--ink-3)", fontSize: "13px", padding: "20px" }}>
              Aucun fichier trouvé.
            </p>
          )}
          {filtered.map((item) => (
            <article
              key={item.id}
              className="a-kb__item"
              onClick={() => handleOpen(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOpen(item);
                }
              }}
            >
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span className="a-kb__cat-tag">{item.category}</span>
                <span
                  className="a-kb__cat-tag"
                  style={{
                    background: extColor(item.ext).bg,
                    color: extColor(item.ext).fg,
                  }}
                >
                  {item.ext.replace(".", "")}
                </span>
              </div>
              <h3 className="a-kb__title">{item.title}</h3>
              {item.subPath && (
                <div
                  style={{
                    fontSize: "10.5px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--ink-3)",
                  }}
                >
                  {item.subPath}
                </div>
              )}
              <div className="a-kb__meta">
                <span>{formatDate(item.mtime)}</span>
                <span>{formatSize(item.size)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Modal d'aperçu markdown */}
      {previewing && (
        <PreviewModal
          item={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}

function PreviewModal({ item, onClose }) {
  // Esc pour fermer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(64,62,61,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          maxWidth: "880px",
          width: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {item.category} · {item.filename}
            </div>
            <h2
              className="outfit"
              style={{ fontSize: "18px", margin: "4px 0 0" }}
            >
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="a-btn"
            style={{ padding: "6px 12px", fontSize: "12px" }}
            aria-label="Fermer l'aperçu"
          >
            ✕ Fermer
          </button>
        </header>
        <div
          style={{
            overflowY: "auto",
            padding: "24px 28px",
            flex: 1,
          }}
        >
          <div className="a-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.content || "*(vide)*"}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function extColor(ext) {
  switch (ext) {
    case ".md":
    case ".txt":
      return { bg: "rgba(20,153,17,0.12)", fg: "var(--lx-green)" };
    case ".pdf":
      return { bg: "rgba(241,62,63,0.12)", fg: "var(--lx-red)" };
    case ".docx":
    case ".doc":
    case ".odt":
      return { bg: "rgba(45,78,162,0.12)", fg: "var(--lx-blue)" };
    case ".xlsx":
    case ".xls":
    case ".csv":
      return { bg: "rgba(20,153,17,0.12)", fg: "var(--lx-green)" };
    default:
      return { bg: "var(--surface-2)", fg: "var(--ink-2)" };
  }
}

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
