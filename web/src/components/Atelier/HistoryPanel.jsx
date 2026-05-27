// HistoryPanel.jsx — colonne gauche de l'Assistant : filtres + liste groupée
// par date + actions hover (archiver/désarchiver/supprimer).

import IconBtn from "./IconBtn.jsx";
import { PILL_CLASS, formatTime } from "../../lib/atelierHelpers.js";

const FILTERS = ["all", "fav", "urgent", "client", "sav", "doc", "dev"];

export default function HistoryPanel({
  filteredHistory,
  grouped,
  histFilter,
  setHistFilter,
  activeHistId,
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
          {histFilter === "archive" ? "Archive" : "Historique"}
        </h2>
        <span className="a-col__count">{filteredHistory.length} entrées</span>
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
            title="Voir les entrées archivées"
            style={{ marginLeft: "auto" }}
          >
            📦 {archiveCount}
          </button>
        )}
      </div>

      <div className="a-hist__list">
        {grouped.length === 0 && (
          <p style={{ padding: "20px 8px", fontSize: "12px", color: "var(--ink-3)" }}>
            Pas encore d'entrées dans l'historique.
          </p>
        )}
        {grouped.map(({ date, items }) => (
          <div key={date} className="a-hist__group">
            <div className="a-hist__date">{date}</div>
            {items.map((entry) => (
              <div
                key={entry.id}
                className="hist-card-wrapper"
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  onClick={() => onHistClick(entry)}
                  className={`a-hist__item ${entry.id === activeHistId ? "is-active" : ""}`}
                  style={{ paddingRight: histFilter === "archive" ? "42px" : "56px" }}
                >
                  <div className="a-hist__row1">
                    <span
                      className={`a-skill-pill a-skill-pill--${PILL_CLASS[entry.skill] || "github"}`}
                    >
                      {entry.skill ? `/${entry.skill}` : "auto"}
                    </span>
                    <span className="a-hist__time">{formatTime(entry.startedAt)}</span>
                  </div>
                  <div className="a-hist__title">
                    {entry.title || (entry.prompt || "").slice(0, 60)}
                  </div>
                  <div className="a-hist__preview">{(entry.prompt || "").slice(0, 140)}</div>
                  <div className="a-hist__row3">
                    <span className="a-hist__client">{entry.client || "—"}</span>
                    {entry.fav && <span className="a-hist__fav">★</span>}
                    <span className={`a-tag a-tag--${entry.tag || "doc"}`}>
                      {entry.tag || "doc"}
                    </span>
                  </div>
                </button>

                {/* Actions au survol — positionnées en absolute pour éviter
                    button-dans-button (HTML invalide). */}
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
                      onClick={(e) => onUnarchive(entry.id, e)}
                    >
                      ↩
                    </IconBtn>
                  ) : (
                    <IconBtn
                      title="Archiver"
                      onClick={(e) => onArchive(entry.id, e)}
                    >
                      📦
                    </IconBtn>
                  )}
                  <IconBtn
                    title={
                      confirmDelete === entry.id
                        ? "Confirmer la suppression"
                        : "Supprimer"
                    }
                    onClick={(e) => onDelete(entry.id, e)}
                    danger
                    pulsing={confirmDelete === entry.id}
                  >
                    {confirmDelete === entry.id ? "✓" : "🗑"}
                  </IconBtn>
                </div>
              </div>
            ))}
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
