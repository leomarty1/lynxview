// SkillRunner.jsx — sélection skill + textarea + bouton run.
// Charte : alignement gauche, jaune pour bouton primaire (taille > 20pt OK),
// bleu pour le tag "sensitive".

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const s = skills.find((s) => s.name === selectedSkill);
    setHint(s?.argumentHint || "");
    setSensitive(!!s?.sensitive);
  }, [selectedSkill, skills]);

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
            <option value="">— Prompt libre —</option>
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
            : "Prompt libre — tape /support, /diagnostic, etc. directement si tu préfères."
        }
        rows={9}
        className="lx-input lx-input--mono resize-y text-sm"
        spellCheck="false"
        disabled={running}
      />

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
