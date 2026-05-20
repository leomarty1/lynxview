// Assistant.jsx — page Assistant Atelier (3 colonnes : Historique / Conversation / Contexte)
//
// Streaming réel via SSE bridge (runSkill côté lib/api). Le caret jaune
// pulse en fin de texte tant que le run n'est pas terminé.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchSkills, runSkill } from "../../lib/api.js";
import { History as HistStore, Token } from "../../lib/storage.js";
import { matchSkill } from "../../lib/skillMatch.js";
import { renderMarkdown } from "../../lib/markdown.js";
import SkillPicker, { ICON_MAP } from "./SkillPicker.jsx";

// Map skill name → classe pill couleur (réutilise les a-skill-pill--* du CSS)
const PILL_CLASS = {
  diagnostic: "diagnostic",
  "draft-client": "mail-client",
  support: "mail-client",
  prediag: "mail-client",
  "msg-post-maintenance": "mail-client",
  "rapport-terrain": "cr",
  "safety-check": "diagnostic",
  refine: "tuto",
  learn: "tuto",
  "bc-devis": "devis",
  hubspot: "github",
  "github-board": "github",
  "onboarding-client": "cr",
  "update-plugin": "github",
};

const TAG_FOR_SKILL = {
  diagnostic: "urgent",
  "safety-check": "urgent",
  support: "client",
  "draft-client": "client",
  "msg-post-maintenance": "client",
  prediag: "client",
  "rapport-terrain": "sav",
  "onboarding-client": "sav",
  refine: "doc",
  learn: "doc",
  "github-board": "dev",
  "update-plugin": "dev",
  hubspot: "client",
  "bc-devis": "sav",
};

export default function AtelierAssistant({ baseUrl, token, setRoute }) {
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [prompt, setPrompt] = useState("");
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [historyEntries, setHistoryEntries] = useState(() => HistStore.list());
  const [activeHistId, setActiveHistId] = useState(null);
  const [histFilter, setHistFilter] = useState("all");
  const [suggestion, setSuggestion] = useState(null);
  const abortRef = useRef(null);

  // Charge la liste des skills depuis le bridge
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchSkills(baseUrl, token)
      .then((s) => {
        if (!cancelled) setSkills(s);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.message === "auth_error") {
          Token.clear();
          window.location.reload();
        } else {
          setError(`Skills : ${err.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, baseUrl]);

  // Auto-détection skill (debounce 250ms)
  useEffect(() => {
    if (selectedSkill || !prompt || prompt.trim().length < 5) {
      setSuggestion(null);
      return undefined;
    }
    const id = setTimeout(() => {
      setSuggestion(matchSkill(prompt, skills));
    }, 250);
    return () => clearTimeout(id);
  }, [prompt, selectedSkill, skills]);

  // Texte assistant assemblé depuis les events SSE
  const assistantText = useMemo(() => collectAssistantText(events), [events]);
  const phase = running
    ? "streaming"
    : events.length === 0
      ? "idle"
      : "result";

  const filteredHistory = useMemo(() => {
    if (histFilter === "all") return historyEntries;
    if (histFilter === "fav") return historyEntries.filter((h) => h.fav);
    return historyEntries.filter((h) => h.tag === histFilter);
  }, [historyEntries, histFilter]);

  const grouped = useMemo(() => groupByDate(filteredHistory), [filteredHistory]);

  // Lancer un run
  const launch = useCallback(async () => {
    if (running) return;
    setError("");
    setEvents([]);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const skillToUse = selectedSkill || suggestion?.name || "";
    const body = skillToUse
      ? { skill: skillToUse, args: prompt }
      : { prompt };

    try {
      await runSkill(
        baseUrl,
        token,
        body,
        (eventName, data) => {
          setEvents((prev) => [...prev, { eventName, data }]);
        },
        controller.signal,
      );
      // Sauve dans l'historique
      const entry = {
        startedAt: Date.now(),
        skill: skillToUse,
        prompt,
        title: prompt.split("\n")[0].slice(0, 80) || "(sans titre)",
        tag: TAG_FOR_SKILL[skillToUse] || "doc",
        fav: false,
        client: "—",
      };
      const updated = HistStore.add(entry);
      setHistoryEntries(updated);
      setActiveHistId(updated[0].id);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [baseUrl, token, selectedSkill, prompt, running, suggestion]);

  const stop = () => abortRef.current?.abort();

  const handleHistClick = (entry) => {
    setActiveHistId(entry.id);
    setSelectedSkill(entry.skill || "");
    setPrompt(entry.prompt || "");
    setEvents([]); // Reset bulles
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !running) {
      e.preventDefault();
      launch();
    }
  };

  const sessionId = useMemo(
    () =>
      "S-" +
      Math.random().toString(36).slice(2, 8).toUpperCase() +
      "-" +
      Date.now().toString(36).slice(-4),
    [],
  );

  return (
    <div className="a-assistant">
      {/* ===== Historique (gauche) ===== */}
      <section className="a-col a-col--hist">
        <header className="a-col__head">
          <h2 className="a-col__title">Historique</h2>
          <span className="a-col__count">{filteredHistory.length} entrées</span>
        </header>
        <div className="a-hist__filters">
          {["all", "fav", "urgent", "client", "sav", "doc", "dev"].map((f) => (
            <button
              key={f}
              type="button"
              className={`a-chip ${histFilter === f ? "is-on" : ""}`}
              onClick={() => setHistFilter(f)}
            >
              {f === "all" ? "Tout" : f === "fav" ? "Favoris" : f}
            </button>
          ))}
        </div>
        <div className="a-hist__list">
          {grouped.length === 0 && (
            <p style={{ padding: "20px 8px", fontSize: "12px", color: "var(--ink-3)" }}>
              Pas encore d'entrées dans l'historique.
            </p>
          )}
          {grouped.map(({ date, items }) => (
            <div key={date} className="a-hist__group">
              <div className="a-hist__date">{date}</div>
              {items.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleHistClick(entry)}
                  className={`a-hist__item ${entry.id === activeHistId ? "is-active" : ""}`}
                >
                  <div className="a-hist__row1">
                    <span
                      className={`a-skill-pill a-skill-pill--${PILL_CLASS[entry.skill] || "github"}`}
                    >
                      {entry.skill ? `/${entry.skill}` : "auto"}
                    </span>
                    <span className="a-hist__time">{formatTime(entry.startedAt)}</span>
                  </div>
                  <div className="a-hist__title">{entry.title || (entry.prompt || "").slice(0, 60)}</div>
                  <div className="a-hist__preview">{(entry.prompt || "").slice(0, 140)}</div>
                  <div className="a-hist__row3">
                    <span className="a-hist__client">{entry.client || "—"}</span>
                    {entry.fav && <span className="a-hist__fav">★</span>}
                    <span className={`a-tag a-tag--${entry.tag || "doc"}`}>{entry.tag || "doc"}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===== Conversation (centre) ===== */}
      <section className="a-col a-col--main">
        {/* Composer */}
        <div className="a-composer">
          <div className="a-composer__top">
            <SkillPicker
              skills={skills}
              value={selectedSkill}
              onChange={setSelectedSkill}
              disabled={running}
            />
            <div className="a-composer__meta">
              {!selectedSkill && suggestion && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  détecté : <span className="a-meta-val" style={{ color: "var(--lx-blue)" }}>/{suggestion.name}</span>{" "}
                  <span style={{ color: "var(--ink-3)" }}>({suggestion.confidence}%)</span>
                </span>
              )}
              {selectedSkill && (
                <span>
                  skill <span className="a-meta-val">/{selectedSkill}</span>
                </span>
              )}
            </div>
          </div>
          <textarea
            className="a-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tape ta question librement — claude choisira le skill pertinent (mail client, problème S300X, demande de CR, etc.)"
            disabled={running}
            spellCheck="false"
            rows={4}
          />
          <div className="a-composer__foot">
            <div className="a-composer__hints">
              <kbd>Ctrl</kbd> + <kbd>↵</kbd> pour lancer
            </div>
            {running ? (
              <button type="button" onClick={stop} className="a-btn" style={{ background: "var(--lx-red)", color: "#fff", borderColor: "var(--lx-red)" }}>
                ■ Arrêter
              </button>
            ) : (
              <button type="button" onClick={launch} className="a-btn a-btn--primary" disabled={!prompt.trim()}>
                ▶ Lancer
              </button>
            )}
          </div>
        </div>

        {/* Empty state ou Response */}
        {phase === "idle" && !error && (
          <div className="a-empty">
            <div className="a-empty__mark">✦</div>
            <h2 className="a-empty__title">Lance un skill</h2>
            <p className="a-empty__sub">
              Tape ta question dans le composer ci-dessus. Claude détectera le
              skill pertinent ou tu peux le choisir manuellement.
            </p>
            <div className="a-empty__skills">
              {(skills.slice(0, 6) || []).map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSelectedSkill(s.name)}
                  className="a-empty__skill"
                >
                  <span className="a-empty__skillIcon">{ICON_MAP[s.name] || "⚙"}</span>
                  <span className="a-empty__skillLbl">/{s.name}</span>
                  <span className="a-empty__skillDesc">{(s.description || "").slice(0, 70)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && phase === "idle" && (
          <div className="a-empty" style={{ borderColor: "var(--lx-red)" }}>
            <div className="a-empty__mark" style={{ color: "var(--lx-red)" }}>!</div>
            <h2 className="a-empty__title" style={{ color: "var(--lx-red)" }}>Erreur</h2>
            <p className="a-empty__sub">{error}</p>
          </div>
        )}

        {phase !== "idle" && (
          <ResponseBubble
            sessionId={sessionId}
            skill={selectedSkill || suggestion?.name}
            prompt={prompt}
            assistantText={assistantText}
            streaming={running}
            events={events}
          />
        )}
      </section>

      {/* ===== Contexte (droite) ===== */}
      <section className="a-col a-col--ctx">
        <ContextRail
          skill={selectedSkill || suggestion?.name}
          setRoute={setRoute}
          setSelectedSkill={setSelectedSkill}
        />
      </section>
    </div>
  );
}

// ============================================================
// ResponseBubble : header + user prompt + assistant streaming
// ============================================================
function ResponseBubble({ sessionId, skill, prompt, assistantText, streaming, events }) {
  const toolCalls = useMemo(() => collectToolCalls(events), [events]);
  const stderr = useMemo(
    () =>
      events
        .filter((e) => e.eventName === "stderr")
        .map((e) => e.data?.data || "")
        .join(""),
    [events],
  );

  return (
    <div className="a-response">
      <header className="a-response__head">
        <div className="a-response__title">
          <span className="a-response__icon">✦</span>
          Session
          <span className="a-response__skill">{sessionId}</span>
          {skill && (
            <span className="a-response__skill" style={{ color: "var(--lx-blue)", marginLeft: "8px" }}>
              /{skill}
            </span>
          )}
        </div>
        <div className="a-response__actions">
          {streaming && (
            <span className="a-streaming">
              <span className="a-streaming__dot" />
              streaming
            </span>
          )}
        </div>
      </header>

      <div className="a-response__body">
        {/* Bulle utilisateur */}
        <div className="a-response__userprompt">
          <div className="a-response__userlbl">tu</div>
          <p>{prompt || "(prompt vide)"}</p>
        </div>

        {/* Bulle IA */}
        <div
          className="a-response__userprompt a-response__ai"
          style={{ borderLeftColor: "var(--lx-yellow)" }}
        >
          <div className="a-response__userlbl a-response__userlbl--ai">claude</div>
          <div className="a-md" style={{ marginTop: "8px" }}>
            {assistantText ? renderMarkdown(assistantText) : null}
            {streaming && <span className="a-caret" />}
            {!streaming && !assistantText && (
              <p style={{ color: "var(--ink-3)", fontSize: "13px" }}>
                Pas encore de réponse. Lance le run.
              </p>
            )}
          </div>
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
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
              {toolCalls.map((tc, i) => (
                <li key={i}>
                  <span style={{ color: "var(--lx-blue)", fontWeight: 500 }}>{tc.name}</span>
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
            <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", color: "var(--ink-2)" }}>
              {stderr}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ContextRail : ticket lié + sources + suite logique
// ============================================================
function ContextRail({ skill, setRoute, setSelectedSkill }) {
  // Pas de ticket réel pour l'instant (HubSpot retiré v0.3.1).
  return (
    <div className="a-ctx">
      <h3 className="a-ctx__title">Ticket lié</h3>
      <div className="a-ctx__card">
        <div className="a-ctx__row">
          <span className="a-ctx__k">Source</span>
          <span className="a-ctx__v">aucune</span>
        </div>
        <div className="a-ctx__row">
          <span className="a-ctx__k">Hint</span>
          <span className="a-ctx__v" style={{ fontSize: "11px", color: "var(--ink-3)" }}>
            Colle un ID HubSpot ou un mail dans le prompt
          </span>
        </div>
      </div>

      <h3 className="a-ctx__title" style={{ marginTop: "8px" }}>Sources utilisées</h3>
      <div className="a-ctx__card">
        <div className="a-ctx__sources">
          <div className="a-src" style={{ cursor: "default" }}>
            <span className="a-src__icon">📚</span>
            <div>
              <div className="a-src__t">KB Lynxter (references/)</div>
              <div className="a-src__s">parc machines · historique solutions · safety</div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="a-ctx__title" style={{ marginTop: "8px" }}>Suite logique</h3>
      <div className="a-ctx__next">
        {suiteForSkill(skill).map((next, i) => (
          <button
            key={i}
            type="button"
            className="a-next"
            onClick={() => {
              if (next.route) setRoute?.(next.route);
              if (next.skill) setSelectedSkill?.(next.skill);
            }}
          >
            <span className="a-next__icon">→</span>
            <div>
              <div className="a-next__t">{next.title}</div>
              <div className="a-next__s">{next.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function suiteForSkill(skill) {
  if (skill === "diagnostic") {
    return [
      { title: "Rédiger réponse client", hint: "/draft-client", skill: "draft-client" },
      { title: "Log dans HISTORIQUE_SOLUTIONS", hint: "/learn", skill: "learn" },
    ];
  }
  if (skill === "support") {
    return [{ title: "Suivre sur GitHub", hint: "page Github", route: "github" }];
  }
  if (skill === "rapport-terrain") {
    return [{ title: "Message post-maintenance", hint: "/msg-post-maintenance", skill: "msg-post-maintenance" }];
  }
  return [
    { title: "Voir le board GitHub", hint: "page Github", route: "github" },
    { title: "Consulter la KB", hint: "page Knowledge", route: "knowledge" },
  ];
}

// ============================================================
// Helpers
// ============================================================
function collectAssistantText(events) {
  const parts = [];
  for (const e of events) {
    if (e.eventName !== "assistant") continue;
    const content = e.data?.message?.content || [];
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

function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(entries) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);

  const groups = new Map();
  for (const e of entries) {
    const d = new Date(e.startedAt || 0);
    d.setHours(0, 0, 0, 0);
    let key;
    if (d.getTime() === today.getTime()) key = "Aujourd'hui";
    else if (d.getTime() === yest.getTime()) key = "Hier";
    else key = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}
