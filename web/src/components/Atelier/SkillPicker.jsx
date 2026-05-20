// SkillPicker.jsx — picker skill avec menu dropdown style Atelier.
// Reprend les classes a-skillpick* du design handoff.

import { useEffect, useRef, useState } from "react";

// Mapping skill → icône Unicode (charte handoff). Pour les skills réels
// du plugin lynxter-support, on fallback à ⚙ si pas dans la map.
const ICON_MAP = {
  support: "✦",
  diagnostic: "⚙",
  "draft-client": "✉",
  prediag: "?",
  "rapport-terrain": "◷",
  "msg-post-maintenance": "✉",
  "safety-check": "⚠",
  refine: "↻",
  learn: "❋",
  hubspot: "◉",
  "github-board": "◉",
  "onboarding-client": "↳",
  "update-plugin": "⤓",
  "bc-devis": "€",
};

export default function SkillPicker({ skills, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const current = value
    ? skills.find((s) => s.name === value)
    : { name: "auto", description: "Claude choisit le skill le plus pertinent" };

  const currentLabel = value ? `/${value}` : "Auto";
  const currentIcon = ICON_MAP[value] || "✦";

  function pick(name) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div className="a-skillpick" ref={ref}>
      <span className="a-skillpick__lbl">Skill</span>
      <button
        type="button"
        className="a-skillpick__val"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}
      >
        <span className="a-skillpick__icon">{currentIcon}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>{currentLabel}</span>
        <span className="a-skillpick__chev">▾</span>
      </button>

      {open && (
        <div className="a-skillpick__menu">
          {/* Option Auto en premier */}
          <button
            type="button"
            onClick={() => pick("")}
            className={`a-skillpick__opt ${!value ? "is-on" : ""}`}
          >
            <span className="a-skillpick__optIcon">✦</span>
            <div>
              <div className="a-skillpick__optLbl">auto</div>
              <div className="a-skillpick__optDesc">Claude détecte le skill</div>
            </div>
          </button>
          {/* Skills réels */}
          {skills.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => pick(s.name)}
              className={`a-skillpick__opt ${value === s.name ? "is-on" : ""}`}
            >
              <span className="a-skillpick__optIcon">
                {ICON_MAP[s.name] || "⚙"}
              </span>
              <div>
                <div className="a-skillpick__optLbl">/{s.name}</div>
                <div className="a-skillpick__optDesc">
                  {(s.description || "").slice(0, 80)}
                  {(s.description || "").length > 80 ? "…" : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Export le mapping pour réutilisation (HistoryColumn pill colors)
export { ICON_MAP };
