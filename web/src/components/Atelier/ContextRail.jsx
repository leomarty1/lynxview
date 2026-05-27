// ContextRail.jsx — colonne droite de l'Assistant : ticket lié + sources +
// suite logique (suggestions de skills/routes selon le skill courant).

import { suiteForSkill } from "../../lib/atelierHelpers.js";

export default function ContextRail({ skill, setRoute, setSelectedSkill }) {
  // Pas de ticket réel pour l'instant (HubSpot retiré v0.3.1).
  return (
    <div className="a-ctx">
      <h3 className="a-ctx__title">Ticket lié</h3>
      <div className="a-ctx__card">
        <div className="a-ctx__row">
          <span className="a-ctx__k">Source</span>
          <span className="a-ctx__v">aucune</span>
        </div>
        <div className="a-ctx__row">
          <span className="a-ctx__k">Hint</span>
          <span
            className="a-ctx__v"
            style={{ fontSize: "11px", color: "var(--ink-3)" }}
          >
            Colle un ID HubSpot ou un mail dans le prompt
          </span>
        </div>
      </div>

      <h3 className="a-ctx__title" style={{ marginTop: "8px" }}>
        Sources utilisées
      </h3>
      <div className="a-ctx__card">
        <div className="a-ctx__sources">
          <div className="a-src" style={{ cursor: "default" }}>
            <span className="a-src__icon">📚</span>
            <div>
              <div className="a-src__t">KB Lynxter (references/)</div>
              <div className="a-src__s">parc machines · historique solutions · safety</div>
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
