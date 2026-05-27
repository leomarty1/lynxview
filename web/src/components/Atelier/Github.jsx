// Github.jsx — page Github board Atelier en kanban (depuis v0.4.2).
//
// Source : endpoint /github du bridge → JSON structuré (data.board.columns).
// Fallback markdown si pas de board (setup help, erreur API, projet introuvable).

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchGitHub } from "../../lib/api.js";

export default function AtelierGithub({ baseUrl, token }) {
  const [data, setData] = useState({
    text: "",
    board: null,
    fetchedAt: 0,
    fromCache: false,
  });
  const [loading, setLoading] = useState(false);

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

  const board = data.board;
  const hasBoard = board && board.columns && board.columns.length > 0;

  return (
    <div className="a-page">
      <header className="a-pagehead">
        <div>
          <div className="a-pagehead__eyebrow">
            {hasBoard
              ? `${board.totalCount} item(s) assigné(s) à ${board.filterUser}`
              : "› board"}
          </div>
          <h1 className="a-pagehead__title">
            {hasBoard && board.boardTitle ? board.boardTitle : "GitHub board"}
          </h1>
        </div>
        <div className="a-pagehead__actions">
          {hasBoard && board.boardUrl && (
            <a
              href={board.boardUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="a-btn"
              style={{ textDecoration: "none" }}
            >
              ↗ Ouvrir sur GitHub
            </a>
          )}
          <button
            type="button"
            onClick={() => refresh({ force: true })}
            disabled={loading}
            className="a-btn"
            aria-label="Rafraîchir le board"
          >
            {loading ? "..." : data.fromCache ? "↻ cache" : "↻ refresh"}
          </button>
        </div>
      </header>

      {/* Kanban si board structuré disponible */}
      {hasBoard && <KanbanBoard columns={board.columns} />}

      {/* Vide : aucune issue assignée */}
      {board && board.columns.length === 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "32px 28px",
            textAlign: "center",
            color: "var(--ink-3)",
            fontSize: "13px",
          }}
        >
          Aucune issue assignée à <code>{board.filterUser}</code> dans{" "}
          <code>{board.boardTitle}</code>.
        </div>
      )}

      {/* Fallback markdown : setup help, projet introuvable, erreur API */}
      {!hasBoard && !board && data.text && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "22px 26px",
          }}
        >
          <div className="a-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.text}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* État chargement initial */}
      {loading && !data.text && !hasBoard && (
        <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>
          Chargement du board…
        </p>
      )}

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

// ============================================================
// Kanban — colonnes scrollables horizontalement, cards cliquables
// ============================================================
function KanbanBoard({ columns }) {
  return (
    <div className="a-board">
      {columns.map((col) => (
        <div key={col.status} className="a-board__col">
          <header className="a-board__colHead">
            <span className="a-board__colTitle">{col.status}</span>
            <span className="a-board__count">{col.cards.length}</span>
          </header>
          <div className="a-board__cards">
            {col.cards.map((card, i) => (
              <Card key={`${col.status}-${i}`} card={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ card }) {
  const prioClass = priorityClass(card.priority);
  const numLabel =
    card.type === "DraftIssue"
      ? "draft"
      : card.number
        ? `#${card.number}`
        : "";

  const handleClick = () => {
    if (card.url) window.open(card.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className="a-card"
      onClick={card.url ? handleClick : undefined}
      onKeyDown={(e) => {
        if (card.url && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={card.url ? 0 : -1}
      role={card.url ? "link" : undefined}
      style={card.url ? {} : { cursor: "default" }}
    >
      <div className="a-card__head">
        <span className="a-card__num">{numLabel}</span>
        {card.priority && (
          <span className={`a-card__prio ${prioClass}`}>{card.priority}</span>
        )}
      </div>
      <div className="a-card__title">{card.title}</div>
      {card.labels.length > 0 && (
        <div className="a-card__labels">
          {card.labels.map((l) => (
            <span key={l} className="a-card__label">
              {l}
            </span>
          ))}
        </div>
      )}
      {(card.assignees.length > 0 || card.type === "PullRequest") && (
        <div className="a-card__foot">
          <span>
            {card.assignees.length > 0
              ? card.assignees.map((a) => `@${a}`).join(" ")
              : ""}
          </span>
          {card.type === "PullRequest" && <span>PR</span>}
        </div>
      )}
    </article>
  );
}

// Map priorité GitHub (string libre) → classe CSS handoff.
function priorityClass(prio) {
  if (!prio) return "";
  const p = prio.toLowerCase();
  if (p.includes("haute") || p.includes("high") || p.includes("p0") || p.includes("p1")) {
    return "a-card__prio--haute";
  }
  if (p.includes("urgent") || p.includes("critical")) {
    return "a-card__prio--urgent";
  }
  if (p.includes("moy") || p.includes("medium") || p.includes("p2")) {
    return "a-card__prio--moyenne";
  }
  return "";
}
