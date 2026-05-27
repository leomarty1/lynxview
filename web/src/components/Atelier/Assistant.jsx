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
  // messages : fil de bulles de conversation. Chaque entrée :
  //   { id, sessionId, prompt, skill, events[], streaming, restored }
  // Nouveaux runs prepend → la bulle récente apparaît juste sous le composer,
  // les anciens descendent dans le fil. Pas de scroll auto (le user lit
  // naturellement le haut, qui est le plus récent).
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [historyEntries, setHistoryEntries] = useState(() => HistStore.list());
  const [activeHistId, setActiveHistId] = useState(null);
  const [histFilter, setHistFilter] = useState("all");
  const [suggestion, setSuggestion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const abortRef = useRef(null);
  // Map id → events accumulés synchrone (state messages est async, pas
  // lisible immédiatement après un setMessages dans le callback SSE).
  // Utilisé pour calculer assistantText final au save dans l'historique.
  const msgEventsAccumRef = useRef(new Map());
  // Ref pour scroller en haut au démarrage d'un nouveau run (voir le nouveau
  // message qui apparaît juste sous le composer).
  const mainColRef = useRef(null);

  const running = messages.some((m) => m.streaming);

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

  const phase = messages.length === 0 ? "idle" : "result";

  // Au démarrage d'un nouveau run, scroll en haut de la zone main pour voir
  // le nouveau message apparaître juste sous le composer.
  useEffect(() => {
    if (running) {
      mainColRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [messages.length, running]);

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

  // Génère un sessionId court (S-XXXXXX-XXXX) pour identifier visuellement
  // chaque run dans le fil.
  const makeSessionId = () =>
    "S-" +
    Math.random().toString(36).slice(2, 8).toUpperCase() +
    "-" +
    Date.now().toString(36).slice(-4);

  // Lancer un run — prepend un nouveau message dans le fil, le streame via
  // SSE, le marque terminé à la fin et l'ajoute à l'historique.
  const launch = useCallback(async () => {
    if (running) return;
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    const skillToUse = selectedSkill || suggestion?.name || "";
    const body = skillToUse ? { skill: skillToUse, args: prompt } : { prompt };

    // Snapshot du prompt courant — Léo peut le modifier pendant le streaming
    // sans qu'on perde le prompt original du run.
    const promptSnapshot = prompt;
    const msgId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

    const newMsg = {
      id: msgId,
      sessionId: makeSessionId(),
      prompt: promptSnapshot,
      skill: skillToUse,
      events: [],
      streaming: true,
      restored: false,
    };
    setMessages((prev) => [newMsg, ...prev]);
    msgEventsAccumRef.current.set(msgId, []);

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
          const accum = msgEventsAccumRef.current.get(msgId);
          if (accum) accum.push(ev);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, events: [...m.events, ev] } : m,
            ),
          );
        },
        controller.signal,
      );

      if (!receivedFinal && !controller.signal.aborted) {
        setError(
          "Connexion perdue avec le bridge — la réponse est probablement tronquée. Relance le skill.",
        );
      }

      const finalEvents = msgEventsAccumRef.current.get(msgId) || [];
      const finalAssistantText = collectAssistantText(finalEvents);

      const entry = {
        startedAt: Date.now(),
        skill: skillToUse,
        prompt: promptSnapshot,
        title: promptSnapshot.split("\n")[0].slice(0, 80) || "(sans titre)",
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
      // Marque la bulle comme terminée
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m)),
      );
      msgEventsAccumRef.current.delete(msgId);
      abortRef.current = null;
    }
  }, [baseUrl, token, selectedSkill, prompt, running, suggestion]);

  const stop = () => abortRef.current?.abort();

  // Clic sur une entrée historique : replace le fil par la conversation
  // restaurée. Au lieu de continuer le fil courant, on revient sur ce run-là
  // (plus simple à comprendre que d'avoir des restored mixés avec des runs
  // live).
  const handleHistClick = (entry) => {
    setActiveHistId(entry.id);
    setSelectedSkill(entry.skill || "");
    setPrompt(entry.prompt || "");
    setError("");

    if (entry.assistantText) {
      setMessages([
        {
          id: "restored-" + entry.id,
          sessionId: makeSessionId(),
          prompt: entry.prompt || "",
          skill: entry.skill || "",
          events: [
            {
              eventName: "assistant",
              data: {
                message: {
                  content: [{ type: "text", text: entry.assistantText }],
                },
              },
            },
          ],
          streaming: false,
          restored: true,
        },
      ]);
    } else {
      // Entrée pré-v0.4.3 sans réponse sauvegardée → bulle placeholder
      setMessages([
        {
          id: "restored-" + entry.id,
          sessionId: makeSessionId(),
          prompt: entry.prompt || "",
          skill: entry.skill || "",
          events: [],
          streaming: false,
          restored: true,
        },
      ]);
    }
  };

  // "Nouveau" : reset complet pour repartir d'une page blanche.
  const handleNew = () => {
    setActiveHistId(null);
    setSelectedSkill("");
    setPrompt("");
    setMessages([]);
    setError("");
    setSuggestion(null);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !running) {
      e.preventDefault();
      launch();
    }
  };

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

      {/* ===== Conversation (centre) =====
          Composer en HAUT, conversation en dessous qui s'écrit naturellement
          vers le bas. Le scroll vit dans la section directement. */}
      <section className="a-col a-col--main" ref={mainColRef}>
        {/* Composer en haut */}
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
              {(prompt || messages.length > 0) && !running && (
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

        {/* Empty state */}
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

        {/* Bannière d'erreur compacte (cas SSE disconnect ou erreur de fetch
            quand on a déjà au moins une bulle affichée). */}
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

        {/* Fil de bulles : la plus récente est en haut (index 0), les anciennes
            descendent. Chaque message a son propre sessionId visible dans son
            header pour distinguer les runs successifs. */}
        {messages.map((msg) => (
          <ResponseBubble
            key={msg.id}
            sessionId={msg.sessionId}
            skill={msg.skill}
            prompt={msg.prompt}
            assistantText={collectAssistantText(msg.events)}
            streaming={msg.streaming}
            events={msg.events}
            restored={msg.restored}
          />
        ))}
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
