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
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className="group block w-full rounded border border-transparent bg-lx-bg p-2 text-left text-xs transition-all hover:border-lx-border hover:bg-lx-soft"
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
            <span
              className="hidden text-right text-lx-err group-hover:inline-block"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(entry.id);
              }}
            >
              ✕
            </span>
          </button>
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
