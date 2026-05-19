// StreamPanel.jsx — streaming des events SSE, rendu markdown charte Lynxter.

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

  const assistantText = collectAssistantText(events);
  const toolCalls = collectToolCalls(events);
  const stderr = events
    .filter((e) => e.eventName === "stderr")
    .map((e) => e.data?.data || "")
    .join("");

  return (
    <div
      ref={scrollRef}
      className="lx-card flex h-full flex-col gap-3 overflow-y-auto p-5"
    >
      {events.length === 0 && !running && !error && (
        <div className="flex h-full flex-col items-start justify-center gap-2 text-sm text-lx-muted">
          <span className="text-lx-subtle">⋯</span>
          <span>Sélectionne un skill et lance pour voir la réponse ici.</span>
        </div>
      )}

      {running && (
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-lx-muted">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full"
            style={{ background: "var(--lx-yellow)" }}
          />
          <span>claude --print en cours</span>
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
        <details className="rounded border border-lx-border bg-lx-soft p-3 text-xs">
          <summary className="cursor-pointer text-lx-muted">
            <span className="lx-tag mr-2">tools</span>
            {toolCalls.length} appel{toolCalls.length > 1 ? "s" : ""} d&apos;outil
          </summary>
          <ul className="mt-2 space-y-1 font-mono">
            {toolCalls.map((tc, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="font-medium text-lx-blue">{tc.name}</span>
                {tc.input && (
                  <span className="truncate text-lx-muted">
                    {JSON.stringify(tc.input).slice(0, 120)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {stderr && (
        <details className="rounded border border-lx-border bg-lx-soft p-3 text-xs">
          <summary className="cursor-pointer text-lx-muted">stderr</summary>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-lx-muted">
            {stderr}
          </pre>
        </details>
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-lx-err/30 bg-lx-err-soft px-3 py-2 text-sm text-lx-err"
        >
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
