// ContextRail.jsx — colonne droite de l'Assistant.
//
// Affiche : "Cette session" (skill courant + statut), sources de la KB
// activée par le bridge, et suggestions "suite logique" selon le skill.

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

export default function ContextRail({ skill, setRoute, setSelectedSkill }) {
  return (
    <div className="a-ctx">
      <h3 className="a-ctx__title">Cette session</h3>
      <div className="a-ctx__card">
        <div className="a-ctx__row">
          <span className="a-ctx__k">Skill</span>
          <span className="a-ctx__v">
            {skill ? (
              <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--lx-blue)" }}>
                /{skill}
              </code>
            ) : (
              <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
                auto-détection
              </span>
            )}
          </span>
        </div>
        {skill && SKILL_LABEL[skill] && (
          <div className="a-ctx__row">
            <span className="a-ctx__k">Rôle</span>
            <span className="a-ctx__v" style={{ fontSize: "12px" }}>
              {SKILL_LABEL[skill]}
            </span>
          </div>
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
