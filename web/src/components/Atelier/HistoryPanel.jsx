// HistoryPanel.jsx — colonne gauche de l'Assistant : liste des TICKETS
// (= conversations complètes). Recherche full-text, filtres status workflow
// (en cours / résolu / archivé) + filtres tag (urgent/client/sav/doc/dev).
//
// Une carte = un ticket. Badge statut couleur visible, nb messages si > 1,
// client, fav, tag.

import IconBtn from "./IconBtn.jsx";
import { PILL_CLASS, formatTime } from "../../lib/atelierHelpers.js";

const TAG_FILTERS = ["all", "fav", "urgent", "client", "sav", "doc", "dev"];

// Map status workflow → label/couleur de badge
const STATUS_BADGE = {
  in_progress: { label: "En cours", bg: "rgba(45,78,162,0.14)", color: "var(--lx-blue)" },
  resolved: { label: "Résolu", bg: "rgba(20,153,17,0.14)", color: "var(--lx-green)" },
  archived: { label: "Archivé", bg: "var(--surface-2)", color: "var(--ink-3)" },
};

export default function HistoryPanel({
  filteredHistory,
  grouped,
  histFilter,
  setHistFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  activeHistId,
  archiveCount,
  resolvedCount,
  confirmDelete,
  onHistClick,
  onArchive,
  onUnarchive,
  onDelete,
}) {
  return (
    <section className="a-col a-col--hist">
      <header className="a-col__head">
        <h2 className="a-col__title">Tickets</h2>
        <span className="a-col__count">
          {filteredHistory.length}
        </span>
      </header>

      {/* Recherche full-text — titre + client + 1er prompt */}
      <div style={{ padding: "0 20px 10px" }}>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Chercher (titre, client, prompt…)"
          className="a-search"
          style={{ width: "100%", fontSize: 12, padding: "6px 14px" }}
          aria-label="Chercher dans les tickets"
        />
      </div>

      {/* Filtres statut workflow */}
      <div
        className="a-hist__filters"
        style={{ paddingBottom: 8 }}
        role="group"
        aria-label="Filtres de statut"
      >
        <button
          type="button"
          className={`a-chip ${statusFilter === "active" ? "is-on" : ""}`}
          onClick={() => setStatusFilter("active")}
          title="Tickets en cours (ni résolus ni archivés)"
        >
          🔵 En cours
        </button>
        <button
          type="button"
          className={`a-chip ${statusFilter === "resolved" ? "is-on" : ""}`}
          onClick={() => setStatusFilter("resolved")}
          title="Tickets marqués résolus"
        >
          ✓ Résolus
          {resolvedCount > 0 && (
            <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
              {resolvedCount}
            </span>
          )}
        </button>
        {archiveCount > 0 && (
          <button
            type="button"
            className={`a-chip ${statusFilter === "archived" ? "is-on" : ""}`}
            onClick={() => setStatusFilter("archived")}
            title="Tickets archivés"
          >
            📦 {archiveCount}
          </button>
        )}
        <button
          type="button"
          className={`a-chip ${statusFilter === "all" ? "is-on" : ""}`}
          onClick={() => setStatusFilter("all")}
          title="Voir tous les tickets sans filtre statut"
          style={{ marginLeft: "auto" }}
        >
          Tout
        </button>
      </div>

      {/* Filtres tag — catégorie thématique */}
      <div className="a-hist__filters" role="group" aria-label="Filtres tag">
        {TAG_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`a-chip ${histFilter === f ? "is-on" : ""}`}
            onClick={() => setHistFilter(f)}
          >
            {f === "all" ? "Tout" : f === "fav" ? "★ Favoris" : f}
          </button>
        ))}
      </div>

      <div className="a-hist__list">
        {grouped.length === 0 && (
          <p style={{ padding: "20px 8px", fontSize: "12px", color: "var(--ink-3)" }}>
            {searchQuery
              ? `Aucun ticket ne correspond à « ${searchQuery} ».`
              : "Aucun ticket dans cette vue. Lance un skill pour en créer un."}
          </p>
        )}
        {grouped.map(({ date, items }) => (
          <div key={date} className="a-hist__group">
            <div className="a-hist__date">{date}</div>
            {items.map((ticket) => {
              const firstPrompt = ticket.messages?.[0]?.prompt || "";
              const msgCount = ticket.messages?.length || 1;
              const statusBadge =
                STATUS_BADGE[ticket.status] || STATUS_BADGE.in_progress;
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
                    style={{ paddingRight: "56px" }}
                  >
                    <div className="a-hist__row1">
                      <span
                        className={`a-skill-pill a-skill-pill--${PILL_CLASS[ticket.skill] || "github"}`}
                      >
                        {ticket.skill ? `/${ticket.skill}` : "auto"}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "9px",
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          padding: "1px 7px",
                          borderRadius: "999px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                        title={`Statut : ${statusBadge.label}`}
                      >
                        {statusBadge.label}
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
                          title={`${msgCount} messages`}
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
                    {ticket.status === "archived" ? (
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
