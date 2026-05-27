// api.js — wrappers fetch vers le bridge, avec auth bearer.
// Le bridge URL et le token sont configurés via les hooks dans App.

import { parseSseStream } from "./sse.js";

function buildHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function pingStatus(baseUrl) {
  const res = await fetch(`${baseUrl}/status`, { method: "GET" });
  if (!res.ok) throw new Error(`status_failed_${res.status}`);
  return res.json();
}

/**
 * Récupère automatiquement le bearer token du bridge local.
 * Le bridge n'expose cet endpoint que si l'Origin est whitelistée côté CORS.
 * Permet à l'UI d'éviter de demander à Léo de copier-coller le token.
 */
export async function fetchLocalToken(baseUrl) {
  const res = await fetch(`${baseUrl}/auth/local`, { method: "GET" });
  if (!res.ok) {
    if (res.status === 403) throw new Error("origin_not_allowed");
    throw new Error(`auth_local_failed_${res.status}`);
  }
  const data = await res.json();
  if (!data.token || typeof data.token !== "string") {
    throw new Error("auth_local_no_token");
  }
  return data.token;
}

export async function fetchSkills(baseUrl, token, { refresh = false } = {}) {
  const url = `${baseUrl}/skills${refresh ? "?refresh=true" : ""}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (res.status === 401 || res.status === 403) {
    throw new Error("auth_error");
  }
  if (!res.ok) throw new Error(`skills_failed_${res.status}`);
  const data = await res.json();
  return data.skills || [];
}

export async function fetchHubSpot(baseUrl, token, { refresh = false } = {}) {
  const url = `${baseUrl}/hubspot${refresh ? "?refresh=true" : ""}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (!res.ok) throw new Error(`hubspot_failed_${res.status}`);
  return res.json();
}

export async function fetchGitHub(baseUrl, token, { refresh = false } = {}) {
  const url = `${baseUrl}/github${refresh ? "?refresh=true" : ""}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (!res.ok) throw new Error(`github_failed_${res.status}`);
  return res.json();
}

export async function fetchKnowledge(baseUrl, token, { refresh = false } = {}) {
  const url = `${baseUrl}/knowledge${refresh ? "?refresh=true" : ""}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (!res.ok) throw new Error(`knowledge_failed_${res.status}`);
  return res.json();
}

export async function fetchKnowledgeFile(baseUrl, token, id) {
  const url = `${baseUrl}/knowledge/file?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `knowledge_file_failed_${res.status}`);
  }
  return res.json();
}

export async function openKnowledgeFile(baseUrl, token, id) {
  const res = await fetch(`${baseUrl}/knowledge/open`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `knowledge_open_failed_${res.status}`);
  }
  return res.json();
}

/**
 * Lance un skill ou un prompt et streame les events SSE.
 *
 * @param {string} baseUrl
 * @param {string} token
 * @param {object} body { prompt?, skill?, args?, resumeSessionId? }
 *   resumeSessionId : si fourni, reprend la session Claude (--resume).
 * @param {(eventName: string, data: object) => void} onEvent
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>} résolu quand l'event "end" est reçu (ou abort).
 */
export async function runSkill(baseUrl, token, body, onEvent, signal) {
  const res = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: buildHeaders(token, { Accept: "text/event-stream" }),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`run_failed_${res.status}: ${txt}`);
  }
  if (!res.body) {
    throw new Error("no_response_body");
  }
  await parseSseStream(res.body, onEvent, signal);
}
