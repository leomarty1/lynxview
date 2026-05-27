// ResponseBubble.jsx — bulle de conversation : prompt user (repliable) +
// réponse Claude streaming + tool calls + stderr collapsibles +
// barre d'actions sous le texte assistant (Copier / Régénérer / Éditer).

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { collectToolCalls } from "../../lib/atelierHelpers.js";
import { copyMarkdownRich } from "../../lib/clipboard.js";

export default function ResponseBubble({
  sessionId,
  skill,
  prompt,
  assistantText,
  streaming,
  events,
  restored = false,
  promptFolded = false,
  isResumed = false,
  onRegenerate,
  onEditPrompt,
  onToggleFoldPrompt,
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

  // copied : "rich" (HTML + plain), "plain" (fallback writeText), false
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!assistantText) return;
    try {
      const { format } = await copyMarkdownRich(assistantText);
      setCopied(format);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  // Seuil au-delà duquel on propose de replier le prompt (long mail client).
  const LONG_PROMPT_THRESHOLD = 280;
  const isLongPrompt = (prompt || "").length > LONG_PROMPT_THRESHOLD;
  const promptToShow = promptFolded
    ? (prompt || "").slice(0, LONG_PROMPT_THRESHOLD) + "…"
    : prompt || "(prompt vide)";

  // Les actions ne s'affichent que quand le streaming est terminé et qu'on
  // a une réponse à manipuler.
  const showActions = !streaming && assistantText;

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
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {isResumed && (
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
              title="Ce message est un follow-up qui a le contexte des messages précédents (Claude --resume)"
            >
              🔗 suite
            </span>
          )}
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
        </div>
      </header>

      <div className="a-response__body">
        {/* Bulle utilisateur — repliable si long */}
        <div className="a-response__userprompt">
          <div
            className="a-response__userlbl"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span>Léo</span>
            {isLongPrompt && onToggleFoldPrompt && (
              <button
                type="button"
                onClick={onToggleFoldPrompt}
                className="a-chip"
                style={{ padding: "1px 8px", fontSize: 10 }}
                aria-label={promptFolded ? "Déplier le prompt" : "Replier le prompt"}
                title={
                  promptFolded
                    ? "Afficher le prompt complet"
                    : "Cacher le prompt long"
                }
              >
                {promptFolded ? "▸ déplier" : "▾ replier"}
              </button>
            )}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{promptToShow}</p>
        </div>

        {/* Bulle Claude */}
        <div
          className="a-response__userprompt a-response__ai"
          style={{ borderLeftColor: "var(--lx-yellow)" }}
        >
          <div className="a-response__userlbl a-response__userlbl--ai">Claude</div>
          <div className="a-md" style={{ marginTop: "8px" }}>
            {assistantText ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {assistantText}
              </ReactMarkdown>
            ) : null}
            {streaming && <span className="a-caret" />}
            {!streaming && !assistantText && !restored && (
              <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>
                Pas encore de réponse. Lance le run.
              </p>
            )}
            {!streaming && !assistantText && restored && (
              <p style={{ color: "var(--ink-3)", fontSize: "13px", fontStyle: "italic" }}>
                Réponse non conservée — cette entrée a été créée avant la
                persistance (v0.4.3). Relance le skill pour une nouvelle
                réponse.
              </p>
            )}
          </div>

          {/* Barre d'actions sous la réponse Claude — apparaît une fois le
              streaming terminé. Visuellement attaché à la bulle assistant
              pour qu'il n'y ait aucune ambiguïté sur quoi est copié/régénéré. */}
          {showActions && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px dashed var(--line)",
              }}
            >
              <button
                type="button"
                onClick={handleCopy}
                className="a-chip"
                aria-label="Copier la réponse"
                title="Copier la réponse Claude — mise en forme préservée pour Outlook/Gmail, texte propre pour Slack/terminal"
              >
                {copied === "rich"
                  ? "✓ Copié (mis en forme)"
                  : copied === "plain"
                    ? "✓ Copié (texte)"
                    : "📋 Copier"}
              </button>
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="a-chip"
                  aria-label="Régénérer la réponse"
                  title="Relancer le même prompt pour une autre réponse"
                >
                  🔄 Régénérer
                </button>
              )}
              {onEditPrompt && (
                <button
                  type="button"
                  onClick={onEditPrompt}
                  className="a-chip"
                  aria-label="Éditer mon prompt"
                  title="Récupérer le prompt dans le composer pour le modifier et relancer"
                >
                  ✏️ Éditer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tool calls collapsibles */}
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
