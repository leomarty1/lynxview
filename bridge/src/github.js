// github.js — cache du board GitHub via le skill /github-board
// Lance `claude --print "/github-board"`, met en cache 5min.

import { runClaudeOnce } from "./claude.js";
import { config } from "./config.js";

let cache = { text: null, fetchedAt: 0, error: null };

export async function getGitHubBoard({ refresh = false } = {}) {
  const age = Date.now() - cache.fetchedAt;
  if (!refresh && cache.text && age < config.cacheTTL) {
    return { ...cache, fromCache: true, ageMs: age };
  }

  try {
    const { text } = await runClaudeOnce({
      prompt: "/github-board",
      timeoutMs: 60_000,
    });
    cache = { text, fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0 };
  } catch (err) {
    cache.error = err.message;
    return { ...cache, fromCache: cache.text !== null, ageMs: age };
  }
}

export function clearGitHubCache() {
  cache = { text: null, fetchedAt: 0, error: null };
}
