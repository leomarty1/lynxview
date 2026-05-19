// hubspot.js — cache de la queue HubSpot via le skill /hubspot
// Lance `claude --print "/hubspot"` (mode QUEUE, sans arg), met en cache 5min.

import { runClaudeOnce } from "./claude.js";
import { config } from "./config.js";

let cache = { text: null, fetchedAt: 0, error: null };

export async function getHubSpotQueue({ refresh = false } = {}) {
  const age = Date.now() - cache.fetchedAt;
  if (!refresh && cache.text && age < config.cacheTTL) {
    return { ...cache, fromCache: true, ageMs: age };
  }

  try {
    const { text } = await runClaudeOnce({
      prompt: "/hubspot",
      timeoutMs: 90_000,
    });
    cache = { text, fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0 };
  } catch (err) {
    cache.error = err.message;
    return { ...cache, fromCache: cache.text !== null, ageMs: age };
  }
}

export function clearHubSpotCache() {
  cache = { text: null, fetchedAt: 0, error: null };
}
