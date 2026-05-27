// Assistant.jsx — page Assistant Atelier (3 colonnes : Historique / Conversation / Contexte)
//
// Orchestrateur : state du run + history + handlers. Le rendu de chaque
// colonne est délégué aux composants HistoryPanel / ResponseBubble / ContextRail.
// Helpers tirés dans lib/atelierHelpers.js.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchSkills, runSkill } from "../../lib/api.js";
import { Tickets, Token } from "../../lib/storage.js";
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
  // messages : le fil de la conversation courante (= les messages du ticket
  // actif). Chaque entrée :
  //   { id, sessionId, claudeSessionId, prompt, skill, events[], streaming,
  //     restored, promptFolded, resumedFrom, assistantText (pour msgs sauvés) }
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  // tickets : la liste persistée (= contenu de l'historique).
  const [tickets, setTickets] = useState(() => Tickets.list());
  // currentTicketId : l'identifiant du ticket actif (= la conversation
  // affichée dans le fil). null = brouillon non encore sauvegardé (sera
  // créé au prochain Lancer).
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [histFilter, setHistFilter] = useState("all");
  const [suggestion, setSuggestion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const abortRef = useRef(null);
  // Map id → events accumulés synchrone (state messages est async, pas
  // lisible immédiatement après un setMessages dans le callback SSE).
  // Utilisé pour calculer assistantText final au save dans le ticket.
  const msgEventsAccumRef = useRef(new Map());
  // Refs pour l'auto-scroll vers le bas (pattern chat chronologique).
  const msgsRef = useRef(null);
  const msgsEndRef = useRef(null);

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

  // Auto-scroll smart vers le BAS (pattern chat chronologique) :
  // - Suit le streaming si Léo est dans les 150 derniers px de la zone msgs
  // - Force le scroll au mount d'un nouveau message (append)
  // - Respecte la position si Léo a scrollé vers le haut pour relire
  useEffect(() => {
    const container = msgsRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const userNearBottom = distanceFromBottom < 150;
    if (userNearBottom || running) {
      msgsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [
    messages.length,
    // Suit le streaming : on dépend du texte de la dernière bulle.
    messages[messages.length - 1]?.events?.length,
    running,
  ]);

  // Liste filtrée des tickets pour l'historique
  const filteredTickets = useMemo(() => {
    if (histFilter === "archive") {
      return tickets.filter((t) => t.archived);
    }
    const visible = tickets.filter((t) => !t.archived);
    if (histFilter === "all") return visible;
    if (histFilter === "fav") return visible.filter((t) => t.fav);
    return visible.filter((t) => t.tag === histFilter);
  }, [tickets, histFilter]);

  const archiveCount = useMemo(
    () => tickets.filter((t) => t.archived).length,
    [tickets],
  );

  // Groupage par date (basé sur updatedAt — un ticket touché aujourd'hui
  // apparaît dans "Aujourd'hui" même s'il a été créé il y a une semaine)
  const groupedForHist = useMemo(
    () =>
      groupByDate(
        filteredTickets.map((t) => ({ ...t, startedAt: t.updatedAt })),
      ),
    [filteredTickets],
  );

  // Actions sur les tickets (archive / désarchive / supprime)
  const handleArchive = (ticketId, e) => {
    e.stopPropagation();
    setTickets(Tickets.archive(ticketId));
  };
  const handleUnarchive = (ticketId, e) => {
    e.stopPropagation();
    setTickets(Tickets.unarchive(ticketId));
  };
  const handleDelete = (ticketId, e) => {
    e.stopPropagation();
    if (confirmDelete === ticketId) {
      setTickets(Tickets.remove(ticketId));
      setConfirmDelete(null);
      if (currentTicketId === ticketId) {
        setCurrentTicketId(null);
        setMessages([]);
      }
    } else {
      setConfirmDelete(ticketId);
      setTimeout(() => setConfirmDelete((c) => (c === ticketId ? null : c)), 3000);
    }
  };

  // Génère un sessionId court (S-XXXXXX-XXXX) pour identifier visuellement
  // chaque run dans le fil.
  const makeSessionId = () =>
    "S-" +
    Math.random().toString(36).slice(2, 8).toUpperCase() +
    "-" +
    Date.now().toString(36).slice(-4);

  // Lancer un run — APPEND un nouveau message à la fin du fil (ordre
  // chronologique chat). Si le fil contient déjà des bulles avec un
  // claudeSessionId, on passe resumeSessionId au bridge pour reprendre la
  // session Claude → le nouveau prompt est un follow-up qui a accès au
  // contexte des messages précédents.
  //
  // @param {object} [opts]
  // @param {string} [opts.overridePrompt] - Utilise ce prompt au lieu de
  //   l'état (pour Régénérer/Éditer qui passent un prompt explicite).
  // @param {string} [opts.overrideSkill] - Idem pour le skill.
  // @param {boolean} [opts.forceNewSession=false] - Force un nouveau --resume,
  //   ignore le sessionId du dernier message du fil (utilisé par Régénérer
  //   pour avoir une vraie nouvelle réponse, pas un follow-up).
  const launch = useCallback(
    async ({ overridePrompt, overrideSkill, forceNewSession = false } = {}) => {
      if (running) return;
      setError("");

      const controller = new AbortController();
      abortRef.current = controller;

      const skillToUse =
        overrideSkill !== undefined
          ? overrideSkill
          : selectedSkill || suggestion?.name || "";
      const promptSnapshot =
        overridePrompt !== undefined ? overridePrompt : prompt;

      // Reprendre la session Claude du dernier message du fil (si présent
      // et pas un msg restauré sans sessionId réel).
      let resumeId;
      if (!forceNewSession) {
        const lastMsgWithSession = [...messages]
          .reverse()
          .find((m) => m.claudeSessionId);
        if (lastMsgWithSession) resumeId = lastMsgWithSession.claudeSessionId;
      }

      const body = skillToUse
        ? { skill: skillToUse, args: promptSnapshot }
        : { prompt: promptSnapshot };
      if (resumeId) body.resumeSessionId = resumeId;

      const msgId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      const newMsg = {
        id: msgId,
        sessionId: makeSessionId(),
        claudeSessionId: null, // rempli quand le bridge émet "session"
        prompt: promptSnapshot,
        skill: skillToUse,
        events: [],
        streaming: true,
        restored: false,
        promptFolded: false,
        resumedFrom: resumeId || null,
      };
      setMessages((prev) => [...prev, newMsg]); // APPEND, pas prepend
      msgEventsAccumRef.current.set(msgId, []);

      let receivedFinal = false;
      // Variable locale (closure synchrone) pour capturer le session_id
      // Claude dès que le bridge l'émet. setMessages est async/batché en
      // React 18 — ne pas lire le state pour ça plus tard, on aurait null.
      let claudeSessionForThisRun = null;

      try {
        await runSkill(
          baseUrl,
          token,
          body,
          (eventName, data) => {
            if (eventName === "end" || eventName === "error") {
              receivedFinal = true;
            }
            // Capture le session_id Claude (event synthétique émis par le
            // bridge dès le 1er event system/init de Claude).
            if (eventName === "session" && data?.sessionId) {
              claudeSessionForThisRun = data.sessionId;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, claudeSessionId: data.sessionId } : m,
                ),
              );
              return;
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

        // Sérialise le message pour le store ticket (pas d'events, juste le
        // texte final — ça suffit pour réafficher la conversation).
        const persistedMessage = {
          id: msgId,
          sessionId: newMsg.sessionId,
          claudeSessionId: claudeSessionForThisRun,
          prompt: promptSnapshot,
          skill: skillToUse,
          assistantText: finalAssistantText,
          startedAt: Date.now(),
        };

        // Soit on append au ticket courant, soit on en crée un nouveau.
        let updatedList;
        if (currentTicketId) {
          Tickets.addMessage(currentTicketId, persistedMessage);
        } else {
          const ticket = Tickets.create({
            ...persistedMessage,
            tag: TAG_FOR_SKILL[skillToUse] || "doc",
          });
          setCurrentTicketId(ticket.id);
        }
        updatedList = Tickets.list();
        setTickets(updatedList);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m)),
        );
        msgEventsAccumRef.current.delete(msgId);
        abortRef.current = null;
      }
    },
    [
      baseUrl,
      token,
      selectedSkill,
      prompt,
      running,
      suggestion,
      messages,
      currentTicketId,
    ],
  );

  const stop = () => abortRef.current?.abort();

  // ------- Actions par message -------

  // Régénérer : relance le même prompt+skill mais en FORÇANT une nouvelle
  // session Claude (pas de --resume) pour avoir une réponse fraîche.
  const handleRegenerate = useCallback(
    (msg) => {
      launch({
        overridePrompt: msg.prompt,
        overrideSkill: msg.skill,
        forceNewSession: true,
      });
    },
    [launch],
  );

  // Éditer mon prompt : remet le prompt dans le composer pour modif. La
  // bulle existante reste dans le fil — Léo modifie son prompt et relance,
  // ce qui crée un NOUVEAU message dans le ticket (follow-up via --resume).
  // S'il veut vraiment supprimer le msg fautif, il supprime le ticket
  // entier ou crée un nouveau ticket via "+ Nouveau".
  const handleEditPrompt = useCallback((msg) => {
    setPrompt(msg.prompt || "");
    setSelectedSkill(msg.skill || "");
  }, []);

  // Replier/déplier mon prompt original (utile pour les longs mails clients)
  const handleToggleFoldPrompt = useCallback((msgId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, promptFolded: !m.promptFolded } : m,
      ),
    );
  }, []);

  // Clic sur un ticket dans l'historique : charge TOUTE la conversation
  // (= tous les messages du ticket) dans le fil central. Le composer est
  // prêt pour des follow-ups (claude --resume via le claudeSessionId du
  // dernier message). Aucun message restauré n'est marqué "draft" : le
  // ticket existe déjà en store, les nouveaux runs s'y ajoutent.
  const handleHistClick = (ticket) => {
    setCurrentTicketId(ticket.id);
    setError("");
    // Le composer est vide quand on ouvre un ticket — Léo écrit un follow-up
    // s'il veut continuer (ou clique sur Éditer/Régénérer d'un msg existant).
    setPrompt("");
    setSelectedSkill("");

    // Reconstruit les messages avec un event synthétique pour ReactBubble.
    const restored = (ticket.messages || []).map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      claudeSessionId: m.claudeSessionId || null,
      prompt: m.prompt || "",
      skill: m.skill || "",
      events: m.assistantText
        ? [
            {
              eventName: "assistant",
              data: {
                message: {
                  content: [{ type: "text", text: m.assistantText }],
                },
              },
            },
          ]
        : [],
      streaming: false,
      restored: true,
      promptFolded: false,
      resumedFrom: null,
      // Conserve l'assistantText déjà rendu pour ResponseBubble
      assistantText: m.assistantText || "",
    }));
    setMessages(restored);
  };

  // "+ Nouveau ticket" : clôt la conversation courante (le ticket est déjà
  // sauvegardé en store au fil de l'eau) et démarre une page blanche.
  // Le prochain Lancer créera un nouveau ticket.
  const handleNew = () => {
    setCurrentTicketId(null);
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
        filteredHistory={filteredTickets}
        grouped={groupedForHist}
        histFilter={histFilter}
        setHistFilter={setHistFilter}
        activeHistId={currentTicketId}
        archiveCount={archiveCount}
        confirmDelete={confirmDelete}
        onHistClick={handleHistClick}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
      />

      {/* ===== Conversation (centre) =====
          Pattern chat chronologique : zone messages au-dessus (scrollable,
          vieux en haut, récent en bas), composer fixé en bas. */}
      <section className="a-col a-col--main">
        <div className="a-msgs" ref={msgsRef}>
          {/* Empty state — tant qu'aucune conversation */}
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

          {/* Fil chronologique : vieux en haut, récent en bas. */}
          {messages.map((msg, i) => (
            <ResponseBubble
              key={msg.id}
              sessionId={msg.sessionId}
              skill={msg.skill}
              prompt={msg.prompt}
              assistantText={collectAssistantText(msg.events)}
              streaming={msg.streaming}
              events={msg.events}
              restored={msg.restored}
              promptFolded={msg.promptFolded}
              isResumed={!!msg.resumedFrom}
              onCopy={null /* géré localement dans la bulle */}
              onRegenerate={() => handleRegenerate(msg)}
              onEditPrompt={() => handleEditPrompt(msg)}
              onToggleFoldPrompt={() => handleToggleFoldPrompt(msg.id)}
            />
          ))}

          {/* Bannière d'erreur sous le fil (cas SSE disconnect après texte). */}
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
                onClick={() => launch()}
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

          {/* Sentinel pour scrollIntoView vers le bas. */}
          <div ref={msgsEndRef} />
        </div>

        {/* Composer fixé en BAS — pattern chat chronologique */}
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
              {currentTicketId && messages.some((m) => m.claudeSessionId) && (
                <span
                  style={{
                    marginLeft: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "var(--ink-3)",
                  }}
                  title="Le prochain Lancer ajoute un follow-up au ticket courant (Claude --resume garde le contexte)"
                >
                  🔗 follow-up dans ce ticket
                </span>
              )}
              {currentTicketId && !messages.some((m) => m.claudeSessionId) && (
                <span
                  style={{
                    marginLeft: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "var(--ink-3)",
                  }}
                  title="Ticket ouvert — le prochain Lancer ajoute un message dedans"
                >
                  🎫 ticket ouvert
                </span>
              )}
            </div>
          </div>
          <textarea
            className="a-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentTicketId
                ? "Ajoute un follow-up à ce ticket (contexte préservé)…"
                : "Décris le problème — Claude choisira le skill pertinent (mail client, panne S300X, demande de CR, etc.). Un nouveau ticket sera créé."
            }
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
              {(prompt || messages.length > 0 || currentTicketId) && !running && (
                <button
                  type="button"
                  onClick={handleNew}
                  className="a-chip"
                  title="Fermer ce ticket et démarrer un nouveau problème"
                  style={{ fontWeight: 600 }}
                >
                  + Nouveau ticket
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
                onClick={() => launch()}
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
          currentTicket={
            currentTicketId
              ? tickets.find((t) => t.id === currentTicketId)
              : null
          }
        />
      </section>
    </div>
  );
}
