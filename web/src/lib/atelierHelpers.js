// atelierHelpers.js — helpers partagés par les composants Atelier/Assistant.
// Sortis d'Assistant.jsx au refactor v0.4.1 pour rendre l'orchestrateur lisible.

// Map skill name → classe pill couleur (réutilise les a-skill-pill--* du CSS)
export const PILL_CLASS = {
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

// Tag d'historique par défaut selon le skill (sert au filtrage gauche).
export const TAG_FOR_SKILL = {
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

// Extrait le texte de l'assistant depuis les events SSE accumulés.
export function collectAssistantText(events) {
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

// Extrait les tool_use de l'assistant pour affichage collapsible.
export function collectToolCalls(events) {
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

export function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Regroupe les entrées d'historique par jour : Aujourd'hui / Hier / date courte.
export function groupByDate(entries) {
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

// Suggestions "suite logique" affichées dans le ContextRail selon le skill.
export function suiteForSkill(skill) {
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
