// ContextRail.jsx — colonne droite de l'Assistant. Affiche les méta du
// ticket courant + permet d'éditer le client + changer le statut.

import { useEffect, useState } from "react";
import { suiteForSkill } from "../../lib/atelierHelpers.js";

const SKILL_LABEL = {
  diagnostic: "Diagnostic technique",
  support: "Support client (entrée)",
  "draft-client": "Réponse client",
  "msg-post-maintenance": "Message post-maintenance",
  prediag: "Pré-diagnostic",
  "rapport-terrain": "Rapport terrain",
  "safety-check": "Vérification sécurité",
  "github-board": "Board GitHub",
  "update-plugin": "MAJ plugin",
  "onboarding-client": "Onboarding client",
  refine: "Affiner",
  learn: "Mémoire / pattern",
  "bc-devis": "Devis Business Central",
  hubspot: "HubSpot",
};

const STATUS_OPTS = [
  { id: "in_progress", label: "🔵 En cours", color: "var(--lx-blue)" },
  { id: "resolved", label: "✓ Résolu", color: "var(--lx-green)" },
  { id: "archived", label: "📦 Archivé", color: "var(--ink-3)" },
];

export default function ContextRail({
  skill,
  setRoute,
  setSelectedSkill,
  currentTicket = null,
  onSetClient,
  onSetStatus,
}) {
  // Édition locale du champ client (commit au blur ou Entrée)
  const [clientDraft, setClientDraft] = useState("");
  useEffect(() => {
    setClientDraft(currentTicket?.client || "");
  }, [currentTicket?.id, currentTicket?.client]);

  const commitClient = () => {
    if (!currentTicket || !onSetClient) return;
    const v = clientDraft.trim();
    if (v !== (currentTicket.client || "")) {
      onSetClient(v);
    }
  };

  return (
    <div className="a-ctx">
      <h3 className="a-ctx__title">Ticket courant</h3>
      <div className="a-ctx__card">
        {currentTicket ? (
          <>
            <div className="a-ctx__row">
              <span className="a-ctx__k">Titre</span>
              <span className="a-ctx__v" style={{ fontSize: "12px" }}>
                {currentTicket.title}
              </span>
            </div>

            {/* Statut workflow — boutons radio compacts */}
            <div className="a-ctx__row" style={{ alignItems: "flex-start" }}>
              <span className="a-ctx__k">Statut</span>
              <span className="a-ctx__v" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {STATUS_OPTS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`a-chip ${currentTicket.status === opt.id ? "is-on" : ""}`}
                    onClick={() => onSetStatus?.(opt.id)}
                    style={{ fontSize: 10, padding: "2px 8px" }}
                    aria-pressed={currentTicket.status === opt.id}
                  >
                    {opt.label}
                  </button>
                ))}
              </span>
            </div>

            {/* Client — éditable inline */}
            <div className="a-ctx__row" style={{ alignItems: "flex-start" }}>
              <span className="a-ctx__k">Client</span>
              <span className="a-ctx__v" style={{ flex: 1 }}>
                <input
                  type="text"
                  value={clientDraft}
                  onChange={(e) => setClientDraft(e.target.value)}
                  onBlur={commitClient}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="DJO, SKF, Saxion…"
                  className="a-search"
                  style={{
                    width: "100%",
                    fontSize: 12,
                    padding: "4px 10px",
                  }}
                  aria-label="Nom du client pour ce ticket"
                />
              </span>
            </div>

            <div className="a-ctx__row">
              <span className="a-ctx__k">Messages</span>
              <span className="a-ctx__v">
                💬 {currentTicket.messages?.length || 0}
              </span>
            </div>

            {currentTicket.skill && (
              <div className="a-ctx__row">
                <span className="a-ctx__k">Skill</span>
                <span className="a-ctx__v">
                  <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--lx-blue)" }}>
                    /{currentTicket.skill}
                  </code>
                </span>
              </div>
            )}

            {currentTicket.claudeSessionId && (
              <div className="a-ctx__row">
                <span className="a-ctx__k">Session</span>
                <span
                  className="a-ctx__v"
                  style={{
                    fontSize: "10px",
                    color: "var(--ink-3)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  title="Session Claude active — les follow-ups reprennent ce contexte"
                >
                  🔗 active
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="a-ctx__row">
              <span className="a-ctx__k">Statut</span>
              <span
                className="a-ctx__v"
                style={{ fontStyle: "italic", color: "var(--ink-3)" }}
              >
                brouillon
              </span>
            </div>
            <div className="a-ctx__row">
              <span className="a-ctx__k">Hint</span>
              <span
                className="a-ctx__v"
                style={{ fontSize: "11px", color: "var(--ink-3)" }}
              >
                Le ticket sera créé au premier Lancer.
              </span>
            </div>
            {skill && SKILL_LABEL[skill] && (
              <div className="a-ctx__row">
                <span className="a-ctx__k">Skill prévu</span>
                <span className="a-ctx__v" style={{ fontSize: "12px" }}>
                  {SKILL_LABEL[skill]}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <h3 className="a-ctx__title" style={{ marginTop: "8px" }}>
        Sources disponibles
      </h3>
      <div className="a-ctx__card">
        <div className="a-ctx__sources">
          <div className="a-src" style={{ cursor: "default" }}>
            <span className="a-src__icon">📚</span>
            <div>
              <div className="a-src__t">KB Lynxter</div>
              <div className="a-src__s">
                Connaissance/ · references/ · historique solutions
              </div>
            </div>
          </div>
          <div className="a-src" style={{ cursor: "default" }}>
            <span className="a-src__icon">🛡</span>
            <div>
              <div className="a-src__t">Safety check auto</div>
              <div className="a-src__s">
                PU · isocyanate · tête LIQ · vapeurs → warning EPI
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="a-ctx__title" style={{ marginTop: "8px" }}>
        Suite logique
      </h3>
      <div className="a-ctx__next">
        {suiteForSkill(skill).map((next, i) => (
          <button
            key={i}
            type="button"
            className="a-next"
            onClick={() => {
              if (next.route) setRoute?.(next.route);
              if (next.skill) setSelectedSkill?.(next.skill);
            }}
          >
            <span className="a-next__icon">→</span>
            <div>
              <div className="a-next__t">{next.title}</div>
              <div className="a-next__s">{next.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
