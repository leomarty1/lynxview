// storage.js — wrappers localStorage avec namespace lynxter-control.

const NS = "lynxter-control:";

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

const MAX_HISTORY = 100;

export const History = {
  list: () => load("history", []),
  add: (entry) => {
    const items = load("history", []);
    items.unshift({ ...entry, id: Date.now() + ":" + Math.random().toString(36).slice(2, 8) });
    while (items.length > MAX_HISTORY) items.pop();
    save("history", items);
    return items;
  },
  clear: () => save("history", []),
  remove: (id) => {
    const items = load("history", []).filter((e) => e.id !== id);
    save("history", items);
    return items;
  },
};
