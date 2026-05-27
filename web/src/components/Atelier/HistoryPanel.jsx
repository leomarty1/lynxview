// HistoryPanel.jsx — colonne gauche de l'Assistant : liste des TICKETS
// (= conversations complètes regroupant tous les follow-ups d'un même
// problème), filtres par tag/favoris, actions hover.
//
// Une carte = un ticket. Affiche : skill du 1er msg, heure, titre,
// preview du 1er prompt, nombre de messages si > 1, client, fav, tag.

import IconBtn from "./IconBtn.jsx";
import { PILL_CLASS, formatTime } from "../../lib/atelierHelpers.js";

const FILTERS = ["all", "fav", "urgent", "client", "sav", "doc", "dev"];

export default function HistoryPanel({
  filteredHistory, // = tickets filtrés
  grouped,
  histFilter,
  setHistFilter,
  activeHistId, // = currentTicketId
  archiveCount,
  confirmDelete,
  onHistClick,
  onArchive,
  onUnarchive,
  onDelete,
}) {
  return (
    <section className="a-col a-col--hist">
      <header className="a-col__head">
        <h2 className="a-col__title">
          {histFilter === "archive" ? "Archive" : "Tickets"}
        </h2>
        <span className="a-col__count">
          {filteredHistory.length} ticket{filteredHistory.length > 1 ? "s" : ""}
        </span>
      </header>

      <div className="a-hist__filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`a-chip ${histFilter === f ? "is-on" : ""}`}
            onClick={() => setHistFilter(f)}
          >
            {f === "all" ? "Tout" : f === "fav" ? "Favoris" : f}
          </button>
        ))}
        {archiveCount > 0 && (
          <button
            type="button"
            className={`a-chip ${histFilter === "archive" ? "is-on" : ""}`}
            onClick={() => setHistFilter("archive")}
            title="Voir les tickets archivés"
            style={{ marginLeft: "auto" }}
          >
            📦 {archiveCount}
          </button>
        )}
      </div>

      <div className="a-hist__list">
        {grouped.length === 0 && (
          <p style={{ padding: "20px 8px", fontSize: "12px", color: "var(--ink-3)" }}>
            Aucun ticket. Lance ton premier skill pour en créer un.
          </p>
        )}
        {grouped.map(({ date, items }) => (
          <div key={date} className="a-hist__group">
            <div className="a-hist__date">{date}</div>
            {items.map((ticket) => {
              const firstPrompt = ticket.messages?.[0]?.prompt || "";
              const msgCount = ticket.messages?.length || 1;
              return (
                <div
                  key={ticket.id}
                  className="hist-card-wrapper"
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    onClick={() => onHistClick(ticket)}
                    className={`a-hist__item ${ticket.id === activeHistId ? "is-active" : ""}`}
                    style={{ paddingRight: histFilter === "archive" ? "42px" : "56px" }}
                  >
                    <div className="a-hist__row1">
                      <span
                        className={`a-skill-pill a-skill-pill--${PILL_CLASS[ticket.skill] || "github"}`}
                      >
                        {ticket.skill ? `/${ticket.skill}` : "auto"}
                      </span>
                      {msgCount > 1 && (
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "10px",
                            background: "var(--accent-soft)",
                            color: "var(--lx-anthracite)",
                            padding: "1px 6px",
                            borderRadius: "999px",
                            fontWeight: 600,
                          }}
                          title={`${msgCount} messages dans ce ticket`}
                        >
                          💬 {msgCount}
                        </span>
                      )}
                      <span className="a-hist__time">{formatTime(ticket.updatedAt)}</span>
                    </div>
                    <div className="a-hist__title">
                      {ticket.title || firstPrompt.slice(0, 60)}
                    </div>
                    <div className="a-hist__preview">{firstPrompt.slice(0, 140)}</div>
                    <div className="a-hist__row3">
                      <span className="a-hist__client">{ticket.client || "—"}</span>
                      {ticket.fav && <span className="a-hist__fav">★</span>}
                      <span className={`a-tag a-tag--${ticket.tag || "doc"}`}>
                        {ticket.tag || "doc"}
                      </span>
                    </div>
                  </button>

                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      gap: "4px",
                      opacity: 0,
                      transition: "opacity 0.12s ease",
                    }}
                    className="hist-actions"
                  >
                    {histFilter === "archive" ? (
                      <IconBtn
                        title="Désarchiver"
                        onClick={(e) => onUnarchive(ticket.id, e)}
                      >
                        ↩
                      </IconBtn>
                    ) : (
                      <IconBtn
                        title="Archiver le ticket"
                        onClick={(e) => onArchive(ticket.id, e)}
                      >
                        📦
                      </IconBtn>
                    )}
                    <IconBtn
                      title={
                        confirmDelete === ticket.id
                          ? "Confirmer la suppression"
                          : "Supprimer le ticket"
                      }
                      onClick={(e) => onDelete(ticket.id, e)}
                      danger
                      pulsing={confirmDelete === ticket.id}
                    >
                      {confirmDelete === ticket.id ? "✓" : "🗑"}
                    </IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <style>{`
        .hist-card-wrapper:hover .hist-actions,
        .hist-card-wrapper:focus-within .hist-actions {
          opacity: 1 !important;
        }
      `}</style>
    </section>
  );
}
