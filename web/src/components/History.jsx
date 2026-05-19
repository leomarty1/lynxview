// History.jsx — sidebar avec les runs précédents (localStorage).

import { useState } from "react";

export default function History({ entries, onSelect, onClear, onRemove }) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-lx-muted">
          Historique ({entries.length})
        </h2>
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
            className="text-xs text-lx-muted hover:text-lx-err"
          >
            {confirmClear ? "Confirmer ?" : "Vider"}
          </button>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {entries.length === 0 && (
          <p className="text-xs text-lx-muted">Pas encore de runs.</p>
        )}
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className="group flex w-full flex-col gap-1 rounded border border-transparent bg-lx-bg p-2 text-left text-xs hover:border-lx-border"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-lx-accent">
                {entry.skill ? `/${entry.skill}` : "prompt libre"}
              </span>
              <span className="text-lx-muted">{formatTime(entry.startedAt)}</span>
            </div>
            <p className="line-clamp-2 text-lx-muted">
              {(entry.prompt || "").slice(0, 100)}
            </p>
            <span
              className="hidden self-end text-lx-err group-hover:inline"
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
