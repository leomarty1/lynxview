// History.jsx — sidebar runs précédents, light theme Lynxter.

import { useState } from "react";

export default function History({ entries, onSelect, onClear, onRemove }) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-medium uppercase tracking-wide text-lx-deep">
          Historique
          <span className="ml-1 text-lx-subtle">({entries.length})</span>
        </h3>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirmClear) {
                onClear();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
                setTimeout(() => setConfirmClear(false), 3000);
              }
            }}
            className="text-xs text-lx-muted transition-colors hover:text-lx-err"
          >
            {confirmClear ? "Confirmer ?" : "Vider"}
          </button>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {entries.length === 0 && (
          <p className="text-xs text-lx-subtle">Pas encore de runs.</p>
        )}
        {entries.map((entry) => (
          // Wrapper relative pour ancrer la croix en absolute → on évite
          // d'imbriquer un button dans un button (HTML invalide, focus cassé).
          <div key={entry.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="block w-full rounded border border-transparent bg-lx-bg p-2 pr-6 text-left text-xs transition-all hover:border-lx-border hover:bg-lx-soft"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono font-medium text-lx-blue">
                  {entry.skill ? `/${entry.skill}` : "prompt libre"}
                </span>
                <span className="text-lx-subtle">
                  {formatTime(entry.startedAt)}
                </span>
              </div>
              <p className="line-clamp-2 text-lx-muted">
                {(entry.prompt || "").slice(0, 100) || "—"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label="Supprimer cette entrée de l'historique"
              title="Supprimer"
              className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded text-lx-subtle transition-colors hover:bg-lx-err/10 hover:text-lx-err group-hover:flex"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
