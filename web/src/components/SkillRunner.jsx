// SkillRunner.jsx — sélection skill + textarea prompt + bouton run.

import { useState, useEffect } from "react";

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

  useEffect(() => {
    const s = skills.find((s) => s.name === selectedSkill);
    setHint(s?.argumentHint || "");
  }, [selectedSkill, skills]);

  function handleSubmit(e) {
    e.preventDefault();
    if (running) {
      onCancel?.();
      return;
    }
    onRun?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-lx-border bg-lx-panel p-4"
    >
      <div className="flex items-center gap-3">
        <label className="flex-1">
          <span className="text-xs uppercase tracking-wide text-lx-muted">
            Skill
          </span>
          <select
            value={selectedSkill}
            onChange={(e) => onSelectSkill(e.target.value)}
            className="mt-1 w-full rounded border border-lx-border bg-lx-bg px-3 py-2 text-sm focus:border-lx-accent focus:outline-none"
            disabled={running}
          >
            <option value="">— Prompt libre —</option>
            {skills.map((s) => (
              <option key={s.name} value={s.name}>
                /{s.name}
                {s.sensitive ? " 🔒" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className={`min-w-[120px] rounded px-4 py-2 font-medium transition ${
            running
              ? "bg-lx-err text-white hover:brightness-110"
              : "bg-lx-accent text-lx-bg hover:brightness-110"
          }`}
        >
          {running ? "Arrêter" : "Lancer"}
        </button>
      </div>

      {hint && (
        <p className="text-xs text-lx-muted">
          <span className="font-mono">argument-hint:</span> {hint}
        </p>
      )}

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={
          selectedSkill
            ? `Args / contenu pour /${selectedSkill}…`
            : "Prompt libre — tape /support, /diagnostic, etc. directement si tu préfères."
        }
        rows={8}
        className="resize-y rounded border border-lx-border bg-lx-bg px-3 py-2 font-mono text-sm focus:border-lx-accent focus:outline-none"
        spellCheck="false"
        disabled={running}
      />

      <p className="text-xs text-lx-muted">
        Astuce : Ctrl+Enter pour lancer (à venir).
      </p>
    </form>
  );
}
