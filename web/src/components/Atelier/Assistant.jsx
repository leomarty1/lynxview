// Assistant.jsx — page Assistant Atelier (3 colonnes : Historique / Conversation / Contexte)
//
// Orchestrateur : state du run + history + handlers. Le rendu de chaque
// colonne est délégué aux composants HistoryPanel / ResponseBubble / ContextRail.
// Helpers tirés dans lib/atelierHelpers.js.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchSkills, runSkill } from "../../lib/api.js";
import { History as HistStore, Token } from "../../lib/storage.js";
import { matchSkill } from "../../lib/skillMatch.js";
import {
  TAG_FOR_SKILL,
  collectAssistantText,
  groupByDate,
} from "../../lib/atelierHelpers.js";
import SkillPicker, { ICON_MAP } from "./SkillPicker.jsx";
import HistoryPanel from "./HistoryPanel.jsx";
import ResponseBubble from "./ResponseBubble.jsx";
import ContextRail from "./ContextRail.jsx";

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
  const [confirmDelete, setConfirmDelete] = useState(null);
  const abortRef = useRef(null);
  // Accumulateur d'events synchrone (state setEvents est async, pas lisible
  // immédiatement après le push). Utilisé pour calculer assistantText final
  // au moment du save dans l'historique.
  const eventsAccumRef = useRef([]);
  // Marque qu'on affiche une entrée restaurée depuis l'historique (mode
  // lecture seule, pas de tools/stderr à montrer puisque non sauvegardés).
  const [restoredFromHistory, setRestoredFromHistory] = useState(false);
  // Refs pour l'auto-scroll de la zone messages (chat-like : composer en bas).
  const msgsRef = useRef(null);
  const msgsEndRef = useRef(null);

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

  // Auto-détection skill (debounce 250 ms)
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
  const phase = running ? "streaming" : events.length === 0 ? "idle" : "result";

  // Auto-scroll smart : suit le bas tant que l'utilisateur est dans les
  // 120 derniers px. Si il a scrollé vers le haut pour relire, on respecte
  // sa position. Au clic sur une entrée historique (restored), on force
  // un scroll initial vers le bas pour qu'il voie la conversation entière.
  useEffect(() => {
    const container = msgsRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const userNearBottom = distanceFromBottom < 120;
    if (userNearBottom || restoredFromHistory) {
      msgsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [assistantText, events.length, restoredFromHistory, error]);

  const filteredHistory = useMemo(() => {
    if (histFilter === "archive") {
      return historyEntries.filter((h) => h.archived);
    }
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

  // Actions historique
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
      setTimeout(() => setConfirmDelete((c) => (c === id ? null : c)), 3000);
    }
  };

  // Lancer un run
  const launch = useCallback(async () => {
    if (running) return;
    setError("");
    setEvents([]);
    setRestoredFromHistory(false);
    eventsAccumRef.current = [];
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const skillToUse = selectedSkill || suggestion?.name || "";
    const body = skillToUse ? { skill: skillToUse, args: prompt } : { prompt };

    // Si le stream se termine sans event end/error, c'est un disconnect réseau
    // → réponse tronquée, on l'indique à Léo.
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
          const ev = { eventName, data };
          eventsAccumRef.current.push(ev);
          setEvents((prev) => [...prev, ev]);
        },
        controller.signal,
      );

      if (!receivedFinal && !controller.signal.aborted) {
        setError(
          "Connexion perdue avec le bridge — la réponse est probablement tronquée. Relance le skill.",
        );
      }

      // Sauve l'entrée + la réponse Claude pour pouvoir restaurer la
      // conversation au clic dans l'historique. On capture le texte assemblé
      // depuis les events à ce moment précis (pas via la ref state).
      const finalAssistantText = collectAssistantText(
        // events state n'est pas encore à jour ici (setter async) — on
        // reconstruit depuis le tableau accumulé localement via le callback.
        // Workaround : on utilise une closure mutable.
        eventsAccumRef.current,
      );

      const entry = {
        startedAt: Date.now(),
        skill: skillToUse,
        prompt,
        title: prompt.split("\n")[0].slice(0, 80) || "(sans titre)",
        tag: TAG_FOR_SKILL[skillToUse] || "doc",
        fav: false,
        client: "—",
        assistantText: finalAssistantText,
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
    setError("");

    // Restaure la conversation si la réponse a été sauvegardée. On
    // synthétise un event "assistant" qui réincarne le texte final → la
    // ResponseBubble s'affiche comme à la fin du run d'origine.
    if (entry.assistantText) {
      setEvents([
        {
          eventName: "assistant",
          data: {
            message: {
              content: [{ type: "text", text: entry.assistantText }],
            },
          },
        },
      ]);
      setRestoredFromHistory(true);
    } else {
      setEvents([]);
      setRestoredFromHistory(false);
    }
  };

  // "Nouveau" : reset complet pour repartir d'une page blanche.
  const handleNew = () => {
    setActiveHistId(null);
    setSelectedSkill("");
    setPrompt("");
    setEvents([]);
    setError("");
    setRestoredFromHistory(false);
    setSuggestion(null);
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
      <HistoryPanel
        filteredHistory={filteredHistory}
        grouped={grouped}
        histFilter={histFilter}
        setHistFilter={setHistFilter}
        activeHistId={activeHistId}
        archiveCount={archiveCount}
        confirmDelete={confirmDelete}
        onHistClick={handleHistClick}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
      />

      {/* ===== Conversation (centre) ===== */}
      {/* Pattern chat : zone messages en haut (scrollable, prend l'espace),
          composer fixé en bas. Auto-scroll smart au nouveau message. */}
      <section className="a-col a-col--main">
        <div className="a-msgs" ref={msgsRef}>
          {/* Empty state — affiché tant qu'aucune conversation n'est en cours */}
          {phase === "idle" && !error && (
            <div className="a-empty">
              <div className="a-empty__mark">✦</div>
              <h2 className="a-empty__title">Lance un skill</h2>
              <p className="a-empty__sub">
                Tape ta question dans le composer en bas. Claude détectera le
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
                    <span className="a-empty__skillDesc">
                      {(s.description || "").slice(0, 70)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && phase === "idle" && (
            <div className="a-empty" style={{ borderColor: "var(--lx-red)" }}>
              <div className="a-empty__mark" style={{ color: "var(--lx-red)" }}>
                !
              </div>
              <h2 className="a-empty__title" style={{ color: "var(--lx-red)" }}>
                Erreur
              </h2>
              <p className="a-empty__sub">{error}</p>
            </div>
          )}

          {/* Bannière d'erreur compacte au-dessus de la bulle (cas SSE
              disconnect quand on a déjà du texte affiché). */}
          {phase !== "idle" && error && (
            <div
              role="alert"
              style={{
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
              restored={restoredFromHistory}
            />
          )}

          {/* Sentinel pour le scrollIntoView auto. */}
          <div ref={msgsEndRef} />
        </div>

        {/* Composer fixé en bas — pattern chat classique */}
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
                  détecté :{" "}
                  <span className="a-meta-val" style={{ color: "var(--lx-blue)" }}>
                    /{suggestion.name}
                  </span>{" "}
                  <span style={{ color: "var(--ink-3)" }}>
                    ({suggestion.confidence}%)
                  </span>
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
            placeholder="Tape ta question librement — Claude choisira le skill pertinent (mail client, problème S300X, demande de CR, etc.)"
            disabled={running}
            spellCheck="false"
            rows={4}
          />
          <div className="a-composer__foot">
            <div
              className="a-composer__hints"
              style={{ display: "flex", alignItems: "center", gap: "12px" }}
            >
              <span>
                <kbd>Ctrl</kbd> + <kbd>↵</kbd> pour lancer
              </span>
              {(prompt || events.length > 0) && !running && (
                <button
                  type="button"
                  onClick={handleNew}
                  className="a-chip"
                  title="Vider le composer et la conversation"
                >
                  + Nouveau
                </button>
              )}
            </div>
            {running ? (
              <button
                type="button"
                onClick={stop}
                className="a-btn"
                style={{
                  background: "var(--lx-red)",
                  color: "#fff",
                  borderColor: "var(--lx-red)",
                }}
              >
                ■ Arrêter
              </button>
            ) : (
              <button
                type="button"
                onClick={launch}
                className="a-btn a-btn--primary"
                disabled={!prompt.trim()}
              >
                ▶ Lancer
              </button>
            )}
          </div>
        </div>
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
