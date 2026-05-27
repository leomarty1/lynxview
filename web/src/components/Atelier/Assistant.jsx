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
    // Vue "archive" : entrées archivées uniquement.
    if (histFilter === "archive") {
      return historyEntries.filter((h) => h.archived);
    }
    // Autres vues : exclure les archivées par défaut.
    const visible = historyEntries.filter((h) => !h.archived);
    if (histFilter === "all") return visible;
    if (histFilter === "fav") return visible.filter((h) => h.fav);
    return visible.filter((h) => h.tag === histFilter);
  }, [historyEntries, histFilter]);

  const archiveCount = useMemo(
    () => historyEntries.filter((h) => h.archived).length,
    [historyEntries],
  );

  const grouped = useMemo(() => groupByDate(filteredHistory), [filteredHistory]);

  // Actions sur les entrées d'historique (archiver / désarchiver / supprimer)
  const [confirmDelete, setConfirmDelete] = useState(null); // id ou null

  const handleArchive = (id, e) => {
    e.stopPropagation();
    setHistoryEntries(HistStore.archive(id));
  };
  const handleUnarchive = (id, e) => {
    e.stopPropagation();
    setHistoryEntries(HistStore.unarchive(id));
  };
  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      setHistoryEntries(HistStore.remove(id));
      setConfirmDelete(null);
      if (activeHistId === id) setActiveHistId(null);
    } else {
      setConfirmDelete(id);
      // Auto-reset du confirm après 3s pour éviter qu'il reste collé
      setTimeout(() => setConfirmDelete((c) => (c === id ? null : c)), 3000);
    }
  };

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

    // Track si le bridge a envoyé un event final ("end" ou "error").
    // Si le stream se termine sans → déconnexion réseau, réponse tronquée.
    let receivedFinal = false;

    try {
      await runSkill(
        baseUrl,
        token,
        body,
        (eventName, data) => {
          if (eventName === "end" || eventName === "error") {
            receivedFinal = true;
          }
          setEvents((prev) => [...prev, { eventName, data }]);
        },
        controller.signal,
      );

      // Stream terminé sans event final = disconnect (bridge tué, réseau coupé).
      if (!receivedFinal && !controller.signal.aborted) {
        setError(
          "Connexion perdue avec le bridge — la réponse est probablement tronquée. Relance le skill.",
        );
      }

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
          <h2 className="a-col__title">
            {histFilter === "archive" ? "Archive" : "Historique"}
          </h2>
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
          {archiveCount > 0 && (
            <button
              type="button"
              className={`a-chip ${histFilter === "archive" ? "is-on" : ""}`}
              onClick={() => setHistFilter("archive")}
              title="Voir les entrées archivées"
              style={{ marginLeft: "auto" }}
            >
              📦 {archiveCount}
            </button>
          )}
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
                <div
                  key={entry.id}
                  className="hist-card-wrapper"
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    onClick={() => handleHistClick(entry)}
                    className={`a-hist__item ${entry.id === activeHistId ? "is-active" : ""}`}
                    style={{ paddingRight: histFilter === "archive" ? "42px" : "56px" }}
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

                  {/* Actions au survol : archiver/désarchiver + supprimer.
                      Position absolue dans le wrapper relative pour éviter
                      d'imbriquer des buttons dans un button (HTML invalide).
                      Affichées via group-hover sur la wrapper. */}
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      gap: "4px",
                      opacity: 0,
                      transition: "opacity 0.12s ease",
                    }}
                    className="hist-actions"
                  >
                    {histFilter === "archive" ? (
                      <IconBtn
                        title="Désarchiver"
                        onClick={(e) => handleUnarchive(entry.id, e)}
                      >
                        ↩
                      </IconBtn>
                    ) : (
                      <IconBtn
                        title="Archiver"
                        onClick={(e) => handleArchive(entry.id, e)}
                      >
                        📦
                      </IconBtn>
                    )}
                    <IconBtn
                      title={
                        confirmDelete === entry.id
                          ? "Confirmer la suppression"
                          : "Supprimer"
                      }
                      onClick={(e) => handleDelete(entry.id, e)}
                      danger
                      pulsing={confirmDelete === entry.id}
                    >
                      {confirmDelete === entry.id ? "✓" : "🗑"}
                    </IconBtn>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <style>{`
          .hist-card-wrapper:hover .hist-actions,
          .hist-card-wrapper:focus-within .hist-actions {
            opacity: 1 !important;
          }
        `}</style>
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

        {phase !== "idle" && error && (
          <div
            role="alert"
            style={{
              margin: "8px 0",
              padding: "10px 14px",
              background: "rgba(241,62,63,0.08)",
              border: "1px solid rgba(241,62,63,0.4)",
              borderRadius: 10,
              color: "var(--lx-red)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠</span>
            <span>{error}</span>
            <button
              type="button"
              onClick={launch}
              className="a-btn"
              style={{
                marginLeft: "auto",
                padding: "4px 10px",
                fontSize: 11,
                borderColor: "var(--lx-red)",
                color: "var(--lx-red)",
              }}
            >
              Réessayer
            </button>
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

  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!assistantText) return;
    try {
      await navigator.clipboard.writeText(assistantText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback : sélection manuelle si Clipboard API refusée
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
            <span className="a-response__skill" style={{ color: "var(--lx-blue)", marginLeft: "8px" }}>
              /{skill}
            </span>
          )}
        </div>
        <div className="a-response__actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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

function IconBtn({ children, title, onClick, danger, pulsing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 24,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: pulsing
          ? "var(--lx-red)"
          : danger
            ? "rgba(241,62,63,0.08)"
            : "rgba(64,62,61,0.08)",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        color: pulsing ? "#fff" : danger ? "var(--lx-red)" : "var(--ink-2)",
        transition: "all 0.12s ease",
        animation: pulsing ? "blink 0.8s infinite" : "none",
      }}
      onMouseEnter={(e) => {
        if (pulsing) return;
        e.currentTarget.style.background = danger
          ? "rgba(241,62,63,0.18)"
          : "rgba(64,62,61,0.16)";
      }}
      onMouseLeave={(e) => {
        if (pulsing) return;
        e.currentTarget.style.background = danger
          ? "rgba(241,62,63,0.08)"
          : "rgba(64,62,61,0.08)";
      }}
    >
      {children}
    </button>
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
