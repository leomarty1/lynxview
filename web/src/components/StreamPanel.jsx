// StreamPanel.jsx — affiche les events SSE en streaming.
// Affiche le texte assistant en markdown, les tool calls en collapsible,
// les erreurs en rouge.

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function StreamPanel({ events, running, error }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Agrège le texte assistant (tous les blocs "text" des messages "assistant").
  const assistantText = collectAssistantText(events);
  const toolCalls = collectToolCalls(events);
  const stderr = events
    .filter((e) => e.eventName === "stderr")
    .map((e) => e.data?.data || "")
    .join("");

  return (
    <div
      ref={scrollRef}
      className="flex h-full flex-col gap-3 overflow-y-auto rounded-lg border border-lx-border bg-lx-panel p-4"
    >
      {events.length === 0 && !running && (
        <div className="flex h-full items-center justify-center text-sm text-lx-muted">
          Lance un skill pour voir la réponse ici.
        </div>
      )}

      {running && (
        <div className="flex items-center gap-2 text-xs text-lx-accent">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-lx-accent" />
          claude --print en cours...
        </div>
      )}

      {assistantText && (
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {assistantText}
          </ReactMarkdown>
        </div>
      )}

      {toolCalls.length > 0 && (
        <details className="rounded border border-lx-border bg-lx-bg p-3 text-xs">
          <summary className="cursor-pointer text-lx-muted">
            🛠 {toolCalls.length} appel{toolCalls.length > 1 ? "s" : ""} d'outil
          </summary>
          <ul className="mt-2 space-y-1 font-mono">
            {toolCalls.map((tc, i) => (
              <li key={i} className="text-lx-muted">
                <span className="text-lx-accent">{tc.name}</span>
                {tc.input && (
                  <span className="ml-2 truncate text-xs opacity-70">
                    {JSON.stringify(tc.input).slice(0, 80)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {stderr && (
        <details className="rounded border border-lx-warn/30 bg-lx-bg p-3 text-xs">
          <summary className="cursor-pointer text-lx-warn">stderr</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-lx-muted">
            {stderr}
          </pre>
        </details>
      )}

      {error && (
        <div className="rounded border border-lx-err/50 bg-lx-err/10 p-3 text-sm text-lx-err">
          {error}
        </div>
      )}
    </div>
  );
}

function collectAssistantText(events) {
  const parts = [];
  for (const e of events) {
    if (e.eventName !== "assistant") continue;
    const msg = e.data?.message;
    if (!msg) continue;
    const content = msg.content || [];
    for (const item of content) {
      if (item.type === "text" && typeof item.text === "string") {
        parts.push(item.text);
      }
    }
  }
  return parts.join("");
}

function collectToolCalls(events) {
  const calls = [];
  for (const e of events) {
    if (e.eventName !== "assistant") continue;
    const content = e.data?.message?.content || [];
    for (const item of content) {
      if (item.type === "tool_use") {
        calls.push({ name: item.name, input: item.input });
      }
    }
  }
  return calls;
}
