// SkillRunner.jsx — sélection skill + textarea + bouton run.
// Charte : alignement gauche, jaune pour bouton primaire (taille > 20pt OK),
// bleu pour le tag "sensitive".
//
// Mode auto : si selectedSkill est vide ("— Auto —"), un moteur de matching
// suggère en temps réel (debounce 250ms) le skill le plus probable selon
// le texte tapé. Léo peut accepter d'un clic ou ignorer la suggestion.

import { useEffect, useState } from "react";
import { matchSkill } from "../lib/skillMatch.js";

export default function SkillRunner({
  skills,
  selectedSkill,
  onSelectSkill,
  prompt,
  onPromptChange,
  onRun,
  onCancel,
  running,
}) {
  const [hint, setHint] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    const s = skills.find((s) => s.name === selectedSkill);
    setHint(s?.argumentHint || "");
    setSensitive(!!s?.sensitive);
  }, [selectedSkill, skills]);

  // Auto-détection : debounce 250ms, uniquement quand "Auto" est sélectionné.
  useEffect(() => {
    if (selectedSkill) {
      setSuggestion(null);
      return undefined;
    }
    if (!prompt || prompt.trim().length < 5) {
      setSuggestion(null);
      return undefined;
    }
    const id = setTimeout(() => {
      const match = matchSkill(prompt, skills);
      setSuggestion(match);
    }, 250);
    return () => clearTimeout(id);
  }, [prompt, selectedSkill, skills]);

  function handleSubmit(e) {
    e.preventDefault();
    if (running) {
      onCancel?.();
      return;
    }
    onRun?.();
  }

  function handleKeyDown(e) {
    // Ctrl+Enter pour lancer.
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !running) {
      e.preventDefault();
      onRun?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="lx-card flex flex-col gap-3 p-4">
      <div className="flex items-end gap-3">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-lx-muted">
            Skill
          </span>
          <select
            value={selectedSkill}
            onChange={(e) => onSelectSkill(e.target.value)}
            className="lx-input w-full"
            disabled={running}
          >
            <option value="">— Auto (claude détecte) —</option>
            {skills.map((s) => (
              <option key={s.name} value={s.name}>
                /{s.name}
                {s.sensitive ? "  •  client/sensible" : ""}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className={running ? "lx-btn-danger min-w-[120px]" : "lx-btn-primary min-w-[120px]"}
        >
          {running ? "Arrêter" : "Lancer"}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-lx-muted">
        {sensitive && <span className="lx-tag">sensible · local-only</span>}
        {hint && (
          <span>
            <span className="font-mono text-lx-text">arg:</span> {hint}
          </span>
        )}
      </div>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          selectedSkill
            ? `Args / contenu pour /${selectedSkill}…`
            : "Tape ta question librement — claude choisira le skill pertinent (mail client, problème S300X, demande de CR, etc.)"
        }
        rows={9}
        className="lx-input lx-input--mono resize-y text-sm"
        spellCheck="false"
        disabled={running}
        aria-label={
          selectedSkill
            ? `Arguments pour le skill /${selectedSkill}`
            : "Prompt libre ou question — claude détectera le skill"
        }
      />

      {/* Mode auto : suggestion en temps réel sous la textarea */}
      {!selectedSkill && suggestion && (
        <button
          type="button"
          onClick={() => onSelectSkill(suggestion.name)}
          disabled={running}
          className="self-start rounded border border-dashed border-lx-border bg-lx-soft px-3 py-1.5 text-xs text-lx-muted transition-colors hover:border-lx-yellow hover:text-lx-text"
          title="Cliquer pour verrouiller ce skill avant de lancer"
        >
          <span className="mr-1 text-lx-subtle">détecté :</span>
          <span className="font-mono font-medium text-lx-blue">
            /{suggestion.name}
          </span>
          <span className="ml-2 text-lx-subtle">
            ({suggestion.confidence}% confiance — clic pour verrouiller)
          </span>
        </button>
      )}
      {!selectedSkill && !suggestion && prompt && prompt.trim().length >= 5 && (
        <p className="text-xs text-lx-subtle">
          Aucun skill ne ressort clairement. Claude tranchera au lancement.
        </p>
      )}

      <p className="text-xs text-lx-subtle">
        <kbd className="rounded border border-lx-border bg-lx-soft px-1.5 py-0.5 font-mono text-[0.7rem]">
          Ctrl
        </kbd>
        <span className="mx-1">+</span>
        <kbd className="rounded border border-lx-border bg-lx-soft px-1.5 py-0.5 font-mono text-[0.7rem]">
          Entrée
        </kbd>
        <span className="ml-2">pour lancer</span>
      </p>
    </form>
  );
}
