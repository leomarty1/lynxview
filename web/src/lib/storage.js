// storage.js — wrappers localStorage avec namespace lynxview.

const NS = "lynxview:";

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (err) {
    console.warn("localStorage save failed", err);
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(NS + key);
  } catch {}
}

// Helpers spécifiques
export const Token = {
  get: () => load("token", ""),
  set: (v) => save("token", v),
  clear: () => remove("token"),
};

export const BaseUrl = {
  get: () => load("baseUrl", "http://127.0.0.1:5174"),
  set: (v) => save("baseUrl", v),
};

// ============================================================
// Tickets — un ticket = un problème = une conversation complète
// (avec potentiellement plusieurs messages : prompt initial + follow-ups).
//
// Format d'un ticket :
//   {
//     id: "tkt-...",
//     title: "...",           // = 1er prompt tronqué à 80 chars
//     skill: "...",           // skill du 1er message (pour le tag couleur)
//     tag: "client|sav|...",  // catégorie (du 1er msg, éditable plus tard)
//     client: "—",
//     fav: false,
//     archived: false,
//     archivedAt: number | undefined,
//     createdAt: number,
//     updatedAt: number,
//     claudeSessionId: string | null,  // = sessionId du dernier message
//     messages: [
//       {
//         id, sessionId, claudeSessionId, prompt, skill,
//         assistantText, startedAt
//       }
//     ]
//   }
//
// Migration : ancien format (entries plates avec prompt + assistantText
// direct) → wrap chaque entry en un ticket de 1 message.
// ============================================================

const MAX_TICKETS = 200;

function isLegacyEntry(e) {
  // Ancien format : pas de `messages[]` mais des champs directs prompt + assistantText
  return e && Array.isArray(e.messages) ? false : true;
}

function migrateLegacyEntry(e) {
  return {
    id: "tkt-" + (e.id || Date.now() + ":" + Math.random().toString(36).slice(2, 8)),
    title: e.title || (e.prompt || "").split("\n")[0].slice(0, 80) || "(sans titre)",
    skill: e.skill || "",
    tag: e.tag || "doc",
    client: e.client || "—",
    fav: !!e.fav,
    archived: !!e.archived,
    archivedAt: e.archivedAt,
    createdAt: e.startedAt || Date.now(),
    updatedAt: e.startedAt || Date.now(),
    claudeSessionId: e.claudeSessionId || null,
    messages: [
      {
        id: "msg-legacy-" + (e.id || Math.random().toString(36).slice(2, 8)),
        sessionId: "S-LEGACY",
        claudeSessionId: e.claudeSessionId || null,
        prompt: e.prompt || "",
        skill: e.skill || "",
        assistantText: e.assistantText || "",
        startedAt: e.startedAt || Date.now(),
      },
    ],
  };
}

function loadAndMigrate() {
  // Essaie la nouvelle clé `tickets`, puis fallback sur l'ancienne `history`.
  let items = load("tickets", null);
  if (items === null) {
    const legacy = load("history", []);
    if (Array.isArray(legacy) && legacy.length > 0) {
      items = legacy.map((e) =>
        isLegacyEntry(e) ? migrateLegacyEntry(e) : e,
      );
      save("tickets", items);
    } else {
      items = [];
    }
  } else if (items.some(isLegacyEntry)) {
    // Au cas où des entrées partielles legacy aient été ajoutées par accident
    items = items.map((e) => (isLegacyEntry(e) ? migrateLegacyEntry(e) : e));
    save("tickets", items);
  }
  return items;
}

export const Tickets = {
  list: () => loadAndMigrate(),

  get: (id) => {
    return loadAndMigrate().find((t) => t.id === id) || null;
  },

  /**
   * Crée un nouveau ticket avec un premier message.
   * Retourne le ticket créé.
   */
  create: (firstMessage) => {
    const items = loadAndMigrate();
    const ticket = {
      id: "tkt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      title:
        firstMessage.prompt.split("\n")[0].slice(0, 80) || "(sans titre)",
      skill: firstMessage.skill || "",
      tag: firstMessage.tag || "doc",
      client: "—",
      fav: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      claudeSessionId: firstMessage.claudeSessionId || null,
      messages: [firstMessage],
    };
    items.unshift(ticket);
    while (items.length > MAX_TICKETS) items.pop();
    save("tickets", items);
    return ticket;
  },

  /**
   * Append un message à un ticket existant et met à jour updatedAt + le
   * claudeSessionId (au cas où une nouvelle session ait démarré).
   */
  addMessage: (ticketId, message) => {
    const items = loadAndMigrate();
    const idx = items.findIndex((t) => t.id === ticketId);
    if (idx < 0) return null;
    const updated = {
      ...items[idx],
      messages: [...items[idx].messages, message],
      updatedAt: Date.now(),
      claudeSessionId: message.claudeSessionId || items[idx].claudeSessionId,
    };
    // Remonte le ticket modifié en tête de liste (récent en premier)
    const newItems = [updated, ...items.filter((t) => t.id !== ticketId)];
    save("tickets", newItems);
    return updated;
  },

  /**
   * Met à jour les champs métadonnées d'un ticket (title, tag, client, fav).
   */
  update: (ticketId, patch) => {
    const items = loadAndMigrate();
    const newItems = items.map((t) =>
      t.id === ticketId ? { ...t, ...patch, updatedAt: Date.now() } : t,
    );
    save("tickets", newItems);
    return newItems.find((t) => t.id === ticketId) || null;
  },

  remove: (ticketId) => {
    const items = loadAndMigrate().filter((t) => t.id !== ticketId);
    save("tickets", items);
    return items;
  },

  archive: (ticketId) => {
    const items = loadAndMigrate().map((t) =>
      t.id === ticketId
        ? { ...t, archived: true, archivedAt: Date.now() }
        : t,
    );
    save("tickets", items);
    return items;
  },

  unarchive: (ticketId) => {
    const items = loadAndMigrate().map((t) =>
      t.id === ticketId ? { ...t, archived: false, archivedAt: undefined } : t,
    );
    save("tickets", items);
    return items;
  },

  clearArchive: () => {
    const items = loadAndMigrate().filter((t) => !t.archived);
    save("tickets", items);
    return items;
  },
};

// Compat avec l'ancien nom (au cas où des composants importent encore History).
// À supprimer une fois sûr que plus rien ne référence History.
export const History = Tickets;
