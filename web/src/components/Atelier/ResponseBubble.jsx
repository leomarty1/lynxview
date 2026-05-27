// ResponseBubble.jsx — bulle de conversation (prompt user + réponse assistant
// streaming + tool calls collapsibles + stderr collapsible).
// Le bouton "Copier" apparaît une fois le streaming terminé.

import { useMemo, useState } from "react";
import { renderMarkdown } from "../../lib/markdown.js";
import { collectToolCalls } from "../../lib/atelierHelpers.js";

export default function ResponseBubble({
  sessionId,
  skill,
  prompt,
  assistantText,
  streaming,
  events,
  restored = false,
}) {
  const toolCalls = useMemo(() => collectToolCalls(events), [events]);
  const stderr = useMemo(
    () =>
      events
        .filter((e) => e.eventName === "stderr")
        .map((e) => e.data?.data || "")
        .join(""),
    [events],
  );

  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!assistantText) return;
    try {
      await navigator.clipboard.writeText(assistantText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="a-response">
      <header className="a-response__head">
        <div className="a-response__title">
          <span className="a-response__icon">✦</span>
          Session
          <span className="a-response__skill">{sessionId}</span>
          {skill && (
            <span
              className="a-response__skill"
              style={{ color: "var(--lx-blue)", marginLeft: "8px" }}
            >
              /{skill}
            </span>
          )}
        </div>
        <div
          className="a-response__actions"
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
        >
          {restored && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "2px 8px",
                background: "var(--surface-2)",
                borderRadius: "999px",
              }}
              title="Conversation restaurée depuis l'historique local"
            >
              📜 archivé
            </span>
          )}
          {streaming && (
            <span className="a-streaming">
              <span className="a-streaming__dot" />
              streaming
            </span>
          )}
          {!streaming && assistantText && (
            <button
              type="button"
              onClick={handleCopy}
              className="a-btn"
              style={{ padding: "6px 12px", fontSize: "12px" }}
              aria-label="Copier la réponse"
              title="Copier la réponse dans le presse-papier"
            >
              {copied ? "✓ Copié" : "📋 Copier"}
            </button>
          )}
        </div>
      </header>

      <div className="a-response__body">
        <div className="a-response__userprompt">
          <div className="a-response__userlbl">Léo</div>
          <p>{prompt || "(prompt vide)"}</p>
        </div>

        <div
          className="a-response__userprompt a-response__ai"
          style={{ borderLeftColor: "var(--lx-yellow)" }}
        >
          <div className="a-response__userlbl a-response__userlbl--ai">Claude</div>
          <div className="a-md" style={{ marginTop: "8px" }}>
            {assistantText ? renderMarkdown(assistantText) : null}
            {streaming && <span className="a-caret" />}
            {!streaming && !assistantText && !restored && (
              <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>
                Pas encore de réponse. Lance le run.
              </p>
            )}
            {!streaming && !assistantText && restored && (
              <p style={{ color: "var(--ink-3)", fontSize: "13px", fontStyle: "italic" }}>
                Réponse non conservée — cette entrée a été créée avant que la
                persistance soit activée (v0.4.3). Relance le skill pour avoir
                une nouvelle réponse.
              </p>
            )}
          </div>
        </div>

        {toolCalls.length > 0 && (
          <details
            style={{
              marginTop: "12px",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "12px",
            }}
          >
            <summary style={{ cursor: "pointer", color: "var(--ink-3)" }}>
              🛠 {toolCalls.length} appel{toolCalls.length > 1 ? "s" : ""} d'outil
            </summary>
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: "18px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
              }}
            >
              {toolCalls.map((tc, i) => (
                <li key={i}>
                  <span style={{ color: "var(--lx-blue)", fontWeight: 500 }}>
                    {tc.name}
                  </span>
                  {tc.input && (
                    <span style={{ color: "var(--ink-3)", marginLeft: "8px" }}>
                      {JSON.stringify(tc.input).slice(0, 100)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}

        {stderr && (
          <details
            style={{
              marginTop: "8px",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "11px",
            }}
          >
            <summary style={{ cursor: "pointer", color: "var(--ink-3)" }}>stderr</summary>
            <pre
              style={{
                margin: "8px 0 0",
                whiteSpace: "pre-wrap",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10.5px",
                color: "var(--ink-2)",
              }}
            >
              {stderr}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
